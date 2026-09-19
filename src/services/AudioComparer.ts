/**
 * Echo Match - AudioComparer Service
 *
 * Implements two distinct comparison engines:
 * 1. Option A (Pure Client-Side / Meyda MFCC + DTW):
 *    Extracts frame-by-frame Mel-Frequency Cepstral Coefficients (MFCCs)
 *    and computes alignment distance via Dynamic Time Warping (DTW).
 *
 * 2. Option B (Server-Side Multimodal Gemini API):
 *    Sends both base64 audio clips to Gemini Flash for holistic multimodal
 *    vocal analysis, similarity scoring (0-100), and hilarious commentary.
 */

import Meyda from "meyda";
import { AudioClip, AudioRecording, SimilarityResult } from "../types";

export class AudioComparer {
  /**
   * Option A: Pure Client-Side Audio Comparison using Meyda MFCCs + DTW
   */
  static async compareWithMeyda(
    promptRecording: AudioClip | AudioRecording,
    mimicRecording: AudioRecording
  ): Promise<SimilarityResult> {
    const promptBuffer = promptRecording.audioBuffer;
    const mimicBuffer = mimicRecording.audioBuffer;

    if (!promptBuffer || !mimicBuffer) {
      throw new Error("AudioBuffers are required for client-side Meyda analysis.");
    }

    const sampleRate = promptBuffer.sampleRate;
    const frameSize = 512;
    const hopSize = 256;

    // 1. Extract sequence of MFCC vectors for prompt
    const promptFeatures = this.extractMFCCSequence(promptBuffer, frameSize, hopSize);
    // 2. Extract sequence of MFCC vectors for mimic
    const mimicFeatures = this.extractMFCCSequence(mimicBuffer, frameSize, hopSize);

    if (promptFeatures.length === 0 || mimicFeatures.length === 0) {
      return {
        score: 40,
        critique: "Audio was too quiet or lacked detectable spectral energy!",
        method: "MEYDA_MFCC_DTW",
      };
    }

    // 3. Compute Dynamic Time Warping (DTW) distance
    const { distance, pathLength } = this.computeDTW(promptFeatures, mimicFeatures);
    const normalizedDistance = distance / (pathLength || 1);

    // 4. Map normalized distance to a friendly 0 - 100 score
    // Typical Euclidean MFCC frame distances hover between 15 - 50.
    // Exponential decay curve provides smooth, intuitive game scoring.
    const k = 28.0; // Calibration factor
    let rawScore = Math.exp(-normalizedDistance / k) * 100;
    const score = Math.min(100, Math.max(5, Math.round(rawScore)));

    // 5. Generate procedural critique based on score and characteristics
    const critique = this.generateMeydaCritique(score, promptFeatures.length, mimicFeatures.length);

    return {
      score,
      critique,
      pitchMatch: score > 75 ? "Vocal timbre and frequency bands aligned strongly." : "Spectral distribution diverged from prompt.",
      energyMatch: Math.abs(promptFeatures.length - mimicFeatures.length) < 8 ? "Rhythm and duration matched closely." : "Pacing or silence differed.",
      method: "MEYDA_MFCC_DTW",
      breakdown: {
        mfccDistance: Math.round(normalizedDistance * 10) / 10,
        dtwPathLength: pathLength,
        confidence: 0.92,
      },
    };
  }

  /**
   * Option B: Multimodal Gemini LLM Audio Evaluation
   */
  static async compareWithGemini(
    promptRecording: AudioClip | AudioRecording,
    mimicRecording: AudioRecording
  ): Promise<SimilarityResult> {
    try {
      const response = await fetch("/api/compare-audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          promptAudioBase64: promptRecording.base64,
          mimicAudioBase64: mimicRecording.base64,
          promptMimeType: promptRecording.mimeType,
          mimicMimeType: mimicRecording.mimeType,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }

      const data = await response.json();
      return {
        score: data.score,
        critique: data.critique,
        pitchMatch: data.pitchMatch,
        energyMatch: data.energyMatch,
        method: "GEMINI_MULTIMODAL",
        isFallback: data.isFallback,
      };
    } catch (err: any) {
      console.warn("Gemini evaluation error, falling back to algorithmic evaluation:", err);
      // Seamless fallback to client-side Meyda if server or network has hiccups
      if (promptRecording.audioBuffer && mimicRecording.audioBuffer) {
        const fallback = await this.compareWithMeyda(promptRecording, mimicRecording);
        return {
          ...fallback,
          isFallback: true,
          critique: `[Client Fallback] ${fallback.critique}`,
        };
      }

      return {
        score: 70,
        critique: "A spirited vocal rendition! Audio signals received with enthusiasm.",
        method: "GEMINI_MULTIMODAL",
        isFallback: true,
      };
    }
  }

  /**
   * Helper: Slices an AudioBuffer into windowed frames and extracts MFCC vectors
   */
  private static extractMFCCSequence(
    buffer: AudioBuffer,
    frameSize: number = 512,
    hopSize: number = 256
  ): number[][] {
    const channelData = buffer.getChannelData(0);
    const numFrames = Math.floor((channelData.length - frameSize) / hopSize);
    const mfccSequence: number[][] = [];

    // Temporary buffer for windowing
    const frame = new Float32Array(frameSize);

    // Standard Hamming Window to reduce spectral leakage
    const window = new Float32Array(frameSize);
    for (let i = 0; i < frameSize; i++) {
      window[i] = 0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (frameSize - 1));
    }

    for (let i = 0; i < numFrames; i++) {
      const offset = i * hopSize;

      // Extract windowed frame
      let frameEnergy = 0;
      for (let j = 0; j < frameSize; j++) {
        const sample = channelData[offset + j] * window[j];
        frame[j] = sample;
        frameEnergy += sample * sample;
      }

      // Skip near-silent background noise frames (threshold: RMS < 0.005)
      const rms = Math.sqrt(frameEnergy / frameSize);
      if (rms < 0.005) {
        continue;
      }

      try {
        const mfcc = Meyda.extract("mfcc", frame as any);
        if (Array.isArray(mfcc) && mfcc.length > 0) {
          // Normalize first 13 MFCC coefficients
          mfccSequence.push(Array.from(mfcc.slice(0, 13)));
        }
      } catch {
        // Continue on frame extraction warnings
      }
    }

    return mfccSequence;
  }

  /**
   * Helper: Dynamic Time Warping (DTW) with Euclidean distance metric
   */
  private static computeDTW(
    seqA: number[][],
    seqB: number[][]
  ): { distance: number; pathLength: number } {
    const n = seqA.length;
    const m = seqB.length;

    // Initialize 2D cost matrix
    const dtw: number[][] = Array.from({ length: n + 1 }, () =>
      new Array(m + 1).fill(Infinity)
    );
    dtw[0][0] = 0;

    for (let i = 1; i <= n; i++) {
      for (let j = 1; j <= m; j++) {
        const cost = this.euclideanDistance(seqA[i - 1], seqB[j - 1]);
        dtw[i][j] = cost + Math.min(dtw[i - 1][j], dtw[i][j - 1], dtw[i - 1][j - 1]);
      }
    }

    const totalDistance = dtw[n][m];
    const pathLength = n + m; // Approximation of warp path length
    return { distance: totalDistance, pathLength };
  }

  /**
   * Helper: Euclidean distance between two feature vectors
   */
  private static euclideanDistance(vecA: number[], vecB: number[]): number {
    let sum = 0;
    const len = Math.min(vecA.length, vecB.length);
    for (let i = 0; i < len; i++) {
      const diff = vecA[i] - vecB[i];
      sum += diff * diff;
    }
    return Math.sqrt(sum);
  }

  /**
   * Helper: Procedural critique for MFCC/DTW scores
   */
  private static generateMeydaCritique(score: number, lenA: number, lenB: number): string {
    const timingDiff = Math.abs(lenA - lenB);
    if (score >= 90) {
      return "Astonishing spectral mimicry! The acoustic harmonics and timbre were almost indistinguishable from the original.";
    }
    if (score >= 75) {
      return "Fantastic vocal imitation! The mel-frequency envelope tracked the source clip with impressive precision.";
    }
    if (score >= 55) {
      return timingDiff > 10
        ? "Good tonal effort, but your pacing was slightly out of sync with the original clip."
        : "Recognizable imitation! Some vowel frequencies and vocal fry diverged, but the vibe was there.";
    }
    if (score >= 35) {
      return "Your vocal cords definitely made sound, but the audio spectrum took a creative detour into another dimension.";
    }
    return "Complete acoustic anarchy! It sounded like you mimicked a blender instead of the prompt.";
  }
}
