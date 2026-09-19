/**
 * Echo Match - AudioClipManager
 * Handles pre-game audio clip uploads, file decoding, waveform extraction,
 * and procedural preset sound generation (Cartoon Boing, Laser, Goat, etc.).
 */

import { AudioClip } from "../types";
import { extractWaveformPeaks, blobToBase64 } from "./AudioRecorder";

export class AudioClipManager {
  private static audioCtx: AudioContext | null = null;

  private static getAudioContext(): AudioContext {
    if (!this.audioCtx || this.audioCtx.state === "closed") {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioContextClass();
    }
    return this.audioCtx;
  }

  /**
   * Process a user-uploaded audio file (.mp3, .wav, .webm, .ogg, .m4a, .aac, .flac, etc.)
   */
  static async processUploadedFile(file: File): Promise<AudioClip> {
    const ctx = this.getAudioContext();
    if (ctx.state === "suspended") {
      try {
        await ctx.resume();
      } catch (resumeErr) {
        console.warn("Could not resume AudioContext:", resumeErr);
      }
    }

    let audioBuffer: AudioBuffer | undefined;
    let durationSeconds = 2.0;
    let waveformSamples: number[] = [];

    try {
      const arrayBuffer = await file.arrayBuffer();
      // Use slice to avoid buffer detachment issues
      audioBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
      durationSeconds = Math.round(audioBuffer.duration * 10) / 10;
      waveformSamples = extractWaveformPeaks(audioBuffer, 36);
    } catch (decodeErr) {
      console.warn("Direct decodeAudioData failed, falling back to HTMLAudioElement duration extraction:", decodeErr);
      durationSeconds = await this.getAudioDurationFallback(file);
      waveformSamples = this.generateSyntheticPeaks(36);
    }

    const base64 = await blobToBase64(file);
    const mimeType = file.type || this.guessMimeType(file.name);
    const dataUrl = base64.startsWith("data:") ? base64 : `data:${mimeType};base64,${base64}`;

    // Clean up filename for display
    const cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");

    return {
      id: "clip_" + Math.random().toString(36).substring(2, 9),
      name: (cleanName.charAt(0).toUpperCase() + cleanName.slice(1)).trim() || "Uploaded Clip",
      url: dataUrl,
      base64: dataUrl,
      mimeType,
      durationSeconds: Math.max(0.5, durationSeconds),
      waveformSamples: waveformSamples.length > 0 ? waveformSamples : this.generateSyntheticPeaks(36),
      audioBuffer,
      isPreset: false,
    };
  }

  /**
   * Fallback duration detection using an HTML Audio element
   */
  private static getAudioDurationFallback(file: File): Promise<number> {
    return new Promise((resolve) => {
      try {
        const url = URL.createObjectURL(file);
        const audio = new Audio(url);
        let resolved = false;

        const cleanup = () => {
          if (!resolved) {
            resolved = true;
            try {
              URL.revokeObjectURL(url);
            } catch (_) {}
          }
        };

        audio.onloadedmetadata = () => {
          const d = audio.duration;
          cleanup();
          resolve(isFinite(d) && d > 0 ? Math.round(d * 10) / 10 : 2.5);
        };

        audio.onerror = () => {
          cleanup();
          resolve(2.5);
        };

        // 3-second safety timeout
        setTimeout(() => {
          cleanup();
          resolve(2.5);
        }, 3000);
      } catch (err) {
        resolve(2.5);
      }
    });
  }

  /**
   * Synthetic waveform generator when raw decoding is unavailable
   */
  private static generateSyntheticPeaks(count: number = 36): number[] {
    const peaks: number[] = [];
    for (let i = 0; i < count; i++) {
      const norm = Math.sin((i / count) * Math.PI);
      const ripple = (Math.sin(i * 1.8) + 1) * 0.15;
      peaks.push(Math.min(1.0, Math.max(0.18, norm * 0.75 + ripple)));
    }
    return peaks;
  }

  /**
   * Guess MIME type from extension if file.type is empty (common on Windows/mobile)
   */
  private static guessMimeType(filename: string): string {
    const ext = filename.split(".").pop()?.toLowerCase();
    switch (ext) {
      case "mp3":
        return "audio/mpeg";
      case "wav":
        return "audio/wav";
      case "ogg":
        return "audio/ogg";
      case "webm":
        return "audio/webm";
      case "m4a":
      case "aac":
        return "audio/mp4";
      case "flac":
        return "audio/flac";
      case "opus":
        return "audio/opus";
      default:
        return "audio/mpeg";
    }
  }

  /**
   * Generates procedural audio preset clips for immediate gameplay
   */
  static async generatePresetClips(): Promise<AudioClip[]> {
    const presets = [
      {
        name: "Cartoon Boing",
        synthesize: (ctx: AudioContext) => {
          const duration = 1.8;
          const sampleRate = ctx.sampleRate;
          const buffer = ctx.createBuffer(1, sampleRate * duration, sampleRate);
          const data = buffer.getChannelData(0);
          for (let i = 0; i < data.length; i++) {
            const t = i / sampleRate;
            // Upward frequency sweep with spring wobble
            const freq = 140 + 380 * Math.pow(t / duration, 0.6) + Math.sin(2 * Math.PI * 18 * t) * 45;
            const env = Math.exp(-t * 1.8);
            data[i] = Math.sin(2 * Math.PI * freq * t) * env * 0.7;
          }
          return { buffer, duration };
        },
      },
      {
        name: "Alien Laser Blaster",
        synthesize: (ctx: AudioContext) => {
          const duration = 1.4;
          const sampleRate = ctx.sampleRate;
          const buffer = ctx.createBuffer(1, sampleRate * duration, sampleRate);
          const data = buffer.getChannelData(0);
          for (let i = 0; i < data.length; i++) {
            const t = i / sampleRate;
            // Steep exponential pitch drop
            const freq = Math.max(70, 2200 * Math.exp(-t * 5.5));
            const env = Math.exp(-t * 2.5);
            // Mix square-like overtone
            const s = Math.sin(2 * Math.PI * freq * t);
            data[i] = (s > 0 ? 0.6 : -0.6) * env * 0.65;
          }
          return { buffer, duration };
        },
      },
      {
        name: "Screaming Goat Bleat",
        synthesize: (ctx: AudioContext) => {
          const duration = 2.0;
          const sampleRate = ctx.sampleRate;
          const buffer = ctx.createBuffer(1, sampleRate * duration, sampleRate);
          const data = buffer.getChannelData(0);
          for (let i = 0; i < data.length; i++) {
            const t = i / sampleRate;
            // Vocal vibrato & pitch break
            const vibrato = Math.sin(2 * Math.PI * 7.5 * t) * 35;
            const baseFreq = (t < 0.6 ? 280 : 390) + vibrato;
            // Dual formants
            const s1 = Math.sin(2 * Math.PI * baseFreq * t);
            const s2 = Math.sin(2 * Math.PI * (baseFreq * 2.1) * t) * 0.5;
            const s3 = Math.sin(2 * Math.PI * (baseFreq * 3.4) * t) * 0.25;
            const env = t < 0.1 ? t / 0.1 : Math.exp(-(t - 0.1) * 1.5);
            data[i] = (s1 + s2 + s3) * env * 0.6;
          }
          return { buffer, duration };
        },
      },
      {
        name: "Goblin Laugh Chortle",
        synthesize: (ctx: AudioContext) => {
          const duration = 2.2;
          const sampleRate = ctx.sampleRate;
          const buffer = ctx.createBuffer(1, sampleRate * duration, sampleRate);
          const data = buffer.getChannelData(0);
          for (let i = 0; i < data.length; i++) {
            const t = i / sampleRate;
            // 4 distinct laugh pulses
            const pulse = Math.abs(Math.sin(2 * Math.PI * 2.2 * t));
            const freq = 320 + Math.sin(2 * Math.PI * 45 * t) * 120;
            const env = Math.pow(pulse, 3) * Math.exp(-t * 0.8);
            data[i] = Math.sin(2 * Math.PI * freq * t) * env * 0.7;
          }
          return { buffer, duration };
        },
      },
      {
        name: "Retro 8-Bit Jump",
        synthesize: (ctx: AudioContext) => {
          const duration = 1.2;
          const sampleRate = ctx.sampleRate;
          const buffer = ctx.createBuffer(1, sampleRate * duration, sampleRate);
          const data = buffer.getChannelData(0);
          for (let i = 0; i < data.length; i++) {
            const t = i / sampleRate;
            // Fast arpeggiated frequency steps
            const step = Math.floor(t * 14);
            const freq = 180 + step * 95;
            const env = Math.max(0, 1 - t / duration);
            const s = Math.sin(2 * Math.PI * freq * t);
            data[i] = (s > 0 ? 0.5 : -0.5) * env * 0.6;
          }
          return { buffer, duration };
        },
      },
      {
        name: "Sports Car Engine Rev",
        synthesize: (ctx: AudioContext) => {
          const duration = 2.1;
          const sampleRate = ctx.sampleRate;
          const buffer = ctx.createBuffer(1, sampleRate * duration, sampleRate);
          const data = buffer.getChannelData(0);
          let noiseAcc = 0;
          for (let i = 0; i < data.length; i++) {
            const t = i / sampleRate;
            // Low rumble pitch ramp
            const revFactor = t < 1.0 ? t / 1.0 : Math.exp(-(t - 1.0) * 1.8);
            const freq = 65 + 140 * revFactor;
            noiseAcc = noiseAcc * 0.9 + (Math.random() * 2 - 1) * 0.1;
            const s1 = Math.sin(2 * Math.PI * freq * t);
            const s2 = Math.sin(2 * Math.PI * (freq * 2) * t) * 0.4;
            const env = Math.min(1.0, t * 5) * (0.4 + 0.6 * revFactor);
            data[i] = (s1 + s2 + noiseAcc * 0.3) * env * 0.7;
          }
          return { buffer, duration };
        },
      },
    ];

    const ctx = this.getAudioContext();
    const resultClips: AudioClip[] = [];

    for (const p of presets) {
      const { buffer, duration } = p.synthesize(ctx);
      const wavBlob = this.audioBufferToWav(buffer);
      const base64 = await blobToBase64(wavBlob);
      const url = URL.createObjectURL(wavBlob);
      const waveformSamples = extractWaveformPeaks(buffer, 36);

      resultClips.push({
        id: "preset_" + Math.random().toString(36).substring(2, 8),
        name: p.name,
        url,
        blob: wavBlob,
        base64,
        mimeType: "audio/wav",
        durationSeconds: duration,
        waveformSamples,
        audioBuffer: buffer,
        isPreset: true,
      });
    }

    return resultClips;
  }

  /**
   * Helper: Encode an AudioBuffer into a WAV Blob
   */
  static audioBufferToWav(buffer: AudioBuffer): Blob {
    const numOfChan = buffer.numberOfChannels;
    const length = buffer.length * numOfChan * 2 + 44;
    const out = new DataView(new ArrayBuffer(length));
    const channels: Float32Array[] = [];
    let sample = 0;
    let offset = 0;
    let pos = 0;

    function setUint16(data: number) {
      out.setUint16(pos, data, true);
      pos += 2;
    }

    function setUint32(data: number) {
      out.setUint32(pos, data, true);
      pos += 4;
    }

    // Write WAV header
    setUint32(0x46464952); // "RIFF"
    setUint32(length - 8); // file length - 8
    setUint32(0x45564157); // "WAVE"
    setUint32(0x20746d66); // "fmt " chunk
    setUint32(16); // length = 16
    setUint16(1); // PCM (uncompressed)
    setUint16(numOfChan);
    setUint32(buffer.sampleRate);
    setUint32(buffer.sampleRate * 2 * numOfChan); // avg. bytes/sec
    setUint16(numOfChan * 2); // block-align
    setUint16(16); // 16-bit
    setUint32(0x61746164); // "data" - chunk
    setUint32(length - pos - 4); // chunk length

    for (let i = 0; i < buffer.numberOfChannels; i++) {
      channels.push(buffer.getChannelData(i));
    }

    while (offset < buffer.length) {
      for (let i = 0; i < numOfChan; i++) {
        sample = Math.max(-1, Math.min(1, channels[i][offset]));
        sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
        out.setInt16(pos, sample, true);
        pos += 2;
      }
      offset++;
    }

    return new Blob([out.buffer], { type: "audio/wav" });
  }
}
