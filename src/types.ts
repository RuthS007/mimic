/**
 * Echo Match - Types & Interfaces
 */

export type GamePhase =
  | "LOBBY"
  | "TURN_MIMIC"
  | "TURN_SCORE"
  | "ROUND_SUMMARY"
  | "GAME_OVER";

export interface AudioClip {
  id: string;
  name: string;
  url: string;
  blob?: Blob;
  base64: string;
  mimeType: string;
  durationSeconds: number;
  waveformSamples: number[];
  audioBuffer?: AudioBuffer;
  isPreset?: boolean;
}

export interface AudioRecording {
  blob: Blob;
  base64: string;
  mimeType: string;
  durationSeconds: number;
  url: string;
  waveformSamples: number[];
  audioBuffer?: AudioBuffer;
}

export interface SimilarityResult {
  score: number; // 0 - 100
  critique: string;
  pitchMatch?: string;
  energyMatch?: string;
  method: "MEYDA_MFCC_DTW" | "GEMINI_MULTIMODAL";
  breakdown?: {
    mfccDistance?: number;
    spectralCentroidDiff?: number;
    dtwPathLength?: number;
    confidence?: number;
  };
  isFallback?: boolean;
}

export interface TurnSubmission {
  playerId: string;
  playerName: string;
  targetClip: AudioClip;
  mimicRecording: AudioRecording;
  result?: SimilarityResult;
}

export interface Player {
  id: string;
  name: string;
  avatar: string;
  isHost: boolean;
  score: number;
  isReady: boolean;
  lastRoundScore?: number;
  assignedClip?: AudioClip;
  turnSubmission?: TurnSubmission;
}

export interface GameRound {
  roundNumber: number;
  totalRounds: number;
  activePlayerIndex: number;
  turnSubmissions: Record<string, TurnSubmission>;
}

export interface RoomState {
  roomCode: string;
  phase: GamePhase;
  players: Player[];
  clipPool: AudioClip[];
  currentRound: GameRound;
  scoringEngine: "MEYDA_MFCC_DTW" | "GEMINI_MULTIMODAL";
  timerRemaining: number;
  isTimerActive: boolean;
}

export interface AudioRecorderConfig {
  maxDurationSeconds?: number;
  sampleRate?: number;
  fftSize?: number;
}
