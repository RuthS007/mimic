/**
 * Echo Match - AudioRecorder Service
 * Captures microphone audio, measures live volume levels, encodes to WebM/WAV,
 * decodes to AudioBuffer for Web Audio API analysis, and exports Blob/ArrayBuffer.
 */

import { AudioRecording, AudioRecorderConfig } from "../types";

export class AudioRecorder {
  private mediaStream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioContext: AudioContext | null = null;
  private analyserNode: AnalyserNode | null = null;
  private recordedChunks: Blob[] = [];
  private animationFrameId: number | null = null;
  private onLevelChange?: (level: number) => void;

  /**
   * Request microphone permissions and initialize AudioContext & AnalyserNode
   */
  async init(onLevel?: (level: number) => void): Promise<void> {
    this.onLevelChange = onLevel;
    if (this.mediaStream) return;

    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: false, // Keep raw vocal timbre for mimicry
        autoGainControl: false,  // Preserve dynamic volume changes
      },
      video: false,
    });

    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    this.audioContext = new AudioContextClass();
    const sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);
    this.analyserNode = this.audioContext.createAnalyser();
    this.analyserNode.fftSize = 512;
    sourceNode.connect(this.analyserNode);

    this.startLevelMonitoring();
  }

  /**
   * Monitor real-time RMS microphone input volume (0.0 to 1.0)
   */
  private startLevelMonitoring(): void {
    if (!this.analyserNode || !this.onLevelChange) return;

    const dataArray = new Uint8Array(this.analyserNode.frequencyBinCount);
    const checkLevel = () => {
      if (!this.analyserNode) return;
      this.analyserNode.getByteTimeDomainData(dataArray);

      // Calculate RMS (Root Mean Square)
      let sumSquares = 0;
      for (let i = 0; i < dataArray.length; i++) {
        const norm = (dataArray[i] - 128) / 128;
        sumSquares += norm * norm;
      }
      const rms = Math.sqrt(sumSquares / dataArray.length);
      const normalizedLevel = Math.min(1.0, rms * 3.5); // Amplified for UI sensitivity
      this.onLevelChange?.(normalizedLevel);

      this.animationFrameId = requestAnimationFrame(checkLevel);
    };

    checkLevel();
  }

  /**
   * Record an exact duration clip (e.g., ~2.0 seconds) and return an AudioRecording
   */
  async recordClip(durationMs: number = 2200): Promise<AudioRecording> {
    await this.init(this.onLevelChange);

    return new Promise<AudioRecording>((resolve, reject) => {
      if (!this.mediaStream) {
        return reject(new Error("Microphone stream not initialized"));
      }

      this.recordedChunks = [];
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";

      try {
        this.mediaRecorder = new MediaRecorder(this.mediaStream, { mimeType });
      } catch {
        this.mediaRecorder = new MediaRecorder(this.mediaStream);
      }

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.recordedChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = async () => {
        try {
          const blob = new Blob(this.recordedChunks, { type: this.mediaRecorder?.mimeType || "audio/webm" });
          const arrayBuffer = await blob.arrayBuffer();

          // Decode into AudioBuffer for local feature extraction (MFCC/DTW)
          let audioBuffer: AudioBuffer | undefined;
          let waveformSamples: number[] = [];

          if (this.audioContext) {
            try {
              // Create a clone of arrayBuffer because decodeAudioData detaches it
              const bufferCopy = arrayBuffer.slice(0);
              audioBuffer = await this.audioContext.decodeAudioData(bufferCopy);
              waveformSamples = extractWaveformPeaks(audioBuffer, 40);
            } catch (decodeErr) {
              console.warn("Could not decode audio data for waveform:", decodeErr);
            }
          }

          // Convert to Base64 for Gemini API transmission
          const base64 = await blobToBase64(blob);
          const url = URL.createObjectURL(blob);

          resolve({
            blob,
            base64,
            mimeType: blob.type,
            durationSeconds: durationMs / 1000,
            url,
            waveformSamples,
            audioBuffer,
          });
        } catch (err) {
          reject(err);
        }
      };

      this.mediaRecorder.start(100);

      // Stop recording automatically after fixed duration
      setTimeout(() => {
        if (this.mediaRecorder && this.mediaRecorder.state === "recording") {
          this.mediaRecorder.stop();
        }
      }, durationMs);
    });
  }

  /**
   * Release microphone stream and clean up Web Audio resources
   */
  destroy(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
    if (this.audioContext && this.audioContext.state !== "closed") {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}

/**
 * Utility: Convert Blob to clean base64 string
 */
export async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Utility: Extract normalized peak amplitudes for UI waveform rendering
 */
export function extractWaveformPeaks(buffer: AudioBuffer, samplesCount: number = 40): number[] {
  const channelData = buffer.getChannelData(0);
  const step = Math.floor(channelData.length / samplesCount);
  const peaks: number[] = [];

  for (let i = 0; i < samplesCount; i++) {
    const start = i * step;
    let max = 0;
    for (let j = 0; j < step && start + j < channelData.length; j++) {
      const val = Math.abs(channelData[start + j]);
      if (val > max) max = val;
    }
    peaks.push(Math.min(1.0, max * 1.5));
  }

  return peaks;
}
