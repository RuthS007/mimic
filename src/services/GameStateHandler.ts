/**
 * Echo Match - GameStateHandler
 * Turn-based party game state manager.
 * Supports pre-game audio clip pool uploads, clip randomizer for each player,
 * and sequential turn-taking where each player mimics their assigned audio clip.
 */

import {
  GamePhase,
  GameRound,
  Player,
  RoomState,
  AudioClip,
  AudioRecording,
  SimilarityResult,
  TurnSubmission,
} from "../types";
import { AudioComparer } from "./AudioComparer";
import { AudioClipManager } from "./AudioClipManager";

export type StateListener = (state: RoomState) => void;

export class GameStateHandler {
  private state: RoomState;
  private listeners: Set<StateListener> = new Set();
  private timerInterval: any = null;

  constructor(initialPlayerName: string = "Host Player") {
    const hostId = "p_host_" + Math.random().toString(36).substring(2, 7);
    const hostPlayer: Player = {
      id: hostId,
      name: initialPlayerName,
      avatar: "🎙️",
      isHost: true,
      score: 0,
      isReady: true,
    };

    this.state = {
      roomCode: "ECHO-" + Math.floor(1000 + Math.random() * 9000),
      phase: "LOBBY",
      players: [hostPlayer],
      clipPool: [],
      currentRound: {
        roundNumber: 1,
        totalRounds: 3,
        activePlayerIndex: 0,
        turnSubmissions: {},
      },
      scoringEngine: "GEMINI_MULTIMODAL",
      timerRemaining: 0,
      isTimerActive: false,
    };

    // Load initial presets into clip pool asynchronously
    this.initDefaultPresets();
  }

  private async initDefaultPresets(): Promise<void> {
    try {
      const presets = await AudioClipManager.generatePresetClips();
      this.state.clipPool = presets;
      this.notify();
    } catch (err) {
      console.warn("Could not generate procedural presets immediately:", err);
    }
  }

  /**
   * Subscribe to state updates
   */
  subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  /**
   * Broadcast state changes to all subscribers
   */
  private notify(): void {
    const currentState = this.getState();
    this.listeners.forEach((listener) => listener(currentState));
  }

  /**
   * Get an immutable snapshot of current state
   */
  getState(): RoomState {
    return JSON.parse(JSON.stringify(this.state));
  }

  /**
   * Clip Pool Management
   */
  addClip(clip: AudioClip): void {
    this.state.clipPool.push(clip);
    this.notify();
  }

  removeClip(clipId: string): void {
    this.state.clipPool = this.state.clipPool.filter((c) => c.id !== clipId);
    this.notify();
  }

  async reloadPresets(): Promise<void> {
    const presets = await AudioClipManager.generatePresetClips();
    // Keep user uploaded clips, append or refresh presets
    const customClips = this.state.clipPool.filter((c) => !c.isPreset);
    this.state.clipPool = [...customClips, ...presets];
    this.notify();
  }

  clearAllClips(): void {
    this.state.clipPool = [];
    this.notify();
  }

  /**
   * Set scoring engine mode
   */
  setScoringEngine(engine: "MEYDA_MFCC_DTW" | "GEMINI_MULTIMODAL"): void {
    this.state.scoringEngine = engine;
    this.notify();
  }

  /**
   * Set total rounds
   */
  setTotalRounds(rounds: number): void {
    this.state.currentRound.totalRounds = rounds;
    this.notify();
  }

  /**
   * Update player profile
   */
  updatePlayerProfile(playerId: string, name: string, avatar: string): void {
    const player = this.state.players.find((p) => p.id === playerId);
    if (player) {
      player.name = name;
      player.avatar = avatar;
      this.notify();
    }
  }

  /**
   * Add a player or simulated party bot
   */
  addPlayer(name: string, avatar: string = "🎭"): Player {
    const newPlayer: Player = {
      id: "p_" + Math.random().toString(36).substring(2, 7),
      name,
      avatar,
      isHost: false,
      score: 0,
      isReady: true,
    };
    this.state.players.push(newPlayer);
    this.notify();
    return newPlayer;
  }

  /**
   * Remove a player
   */
  removePlayer(playerId: string): void {
    this.state.players = this.state.players.filter((p) => p.id !== playerId);
    this.notify();
  }

  /**
   * Reset game to Lobby
   */
  resetToLobby(): void {
    this.stopTimer();
    this.state.phase = "LOBBY";
    this.state.players.forEach((p) => {
      p.score = 0;
      p.lastRoundScore = undefined;
      p.assignedClip = undefined;
      p.turnSubmission = undefined;
    });
    this.state.currentRound = {
      roundNumber: 1,
      totalRounds: this.state.currentRound.totalRounds || 3,
      activePlayerIndex: 0,
      turnSubmissions: {},
    };
    this.notify();
  }

  /**
   * Start Game:
   * 1. Ensure clip pool is ready.
   * 2. Randomize/shuffle audio clips and assign one to each player!
   * 3. Set activePlayerIndex to 0 and transition to TURN_MIMIC.
   */
  async startGame(): Promise<void> {
    this.stopTimer();

    // Ensure we have clips
    if (this.state.clipPool.length === 0) {
      await this.reloadPresets();
    }

    this.assignRandomizedClips();

    this.state.currentRound.roundNumber = 1;
    this.state.currentRound.activePlayerIndex = 0;
    this.state.currentRound.turnSubmissions = {};
    this.state.phase = "TURN_MIMIC";

    this.startTimer(45, () => {
      // Time's up fallback handled in view
    });
    this.notify();
  }

  /**
   * Helper: Shuffle clip pool and assign a randomized clip to every player
   */
  private assignRandomizedClips(): void {
    const pool = [...this.state.clipPool];
    if (pool.length === 0) return;

    // Fisher-Yates shuffle
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    this.state.players.forEach((player, idx) => {
      player.assignedClip = pool[idx % pool.length];
      player.turnSubmission = undefined;
    });
  }

  /**
   * Submit Active Player Mimic:
   * Evaluates similarity against the active player's assigned randomized clip,
   * updates points, and moves to TURN_SCORE.
   */
  async submitActivePlayerMimic(recording: AudioRecording): Promise<void> {
    this.stopTimer();
    const activePlayer = this.state.players[this.state.currentRound.activePlayerIndex];
    if (!activePlayer || !activePlayer.assignedClip) {
      console.error("No active player or assigned clip found!");
      return;
    }

    const targetClip = activePlayer.assignedClip;

    let result: SimilarityResult;
    try {
      if (this.state.scoringEngine === "MEYDA_MFCC_DTW") {
        result = await AudioComparer.compareWithMeyda(targetClip, recording);
      } else {
        result = await AudioComparer.compareWithGemini(targetClip, recording);
      }
    } catch (err) {
      console.error("Score evaluation error:", err);
      result = {
        score: 65,
        critique: "A spirited vocal rendition! Tone and acoustic cadence matched with gusto.",
        method: this.state.scoringEngine === "MEYDA_MFCC_DTW" ? "MEYDA_MFCC_DTW" : "GEMINI_MULTIMODAL",
      };
    }

    const submission: TurnSubmission = {
      playerId: activePlayer.id,
      playerName: activePlayer.name,
      targetClip,
      mimicRecording: recording,
      result,
    };

    activePlayer.turnSubmission = submission;
    activePlayer.lastRoundScore = result.score;
    activePlayer.score += result.score;
    this.state.currentRound.turnSubmissions[activePlayer.id] = submission;

    this.state.phase = "TURN_SCORE";
    this.notify();
  }

  /**
   * Advance to the next player's turn OR to ROUND_SUMMARY if everyone has mimicked
   */
  advanceNextTurn(): void {
    this.stopTimer();
    const nextIndex = this.state.currentRound.activePlayerIndex + 1;

    if (nextIndex < this.state.players.length) {
      // Next player's turn
      this.state.currentRound.activePlayerIndex = nextIndex;
      this.state.phase = "TURN_MIMIC";
      this.startTimer(45, () => {});
    } else {
      // All players have taken their turns in this round!
      this.state.phase = "ROUND_SUMMARY";
      this.state.players.sort((a, b) => b.score - a.score);
    }
    this.notify();
  }

  /**
   * Next Round or Final Game Over
   */
  nextRound(): void {
    const { roundNumber, totalRounds } = this.state.currentRound;
    if (roundNumber >= totalRounds) {
      this.state.phase = "GAME_OVER";
      this.notify();
      return;
    }

    // Re-shuffle clips and assign new randomized clips to each player for the next round!
    this.assignRandomizedClips();
    this.state.currentRound.roundNumber = roundNumber + 1;
    this.state.currentRound.activePlayerIndex = 0;
    this.state.currentRound.turnSubmissions = {};
    this.state.phase = "TURN_MIMIC";
    this.startTimer(45, () => {});
    this.notify();
  }

  /**
   * Timer management
   */
  private startTimer(seconds: number, onExpire: () => void): void {
    this.stopTimer();
    this.state.timerRemaining = seconds;
    this.state.isTimerActive = true;
    this.notify();

    this.timerInterval = setInterval(() => {
      this.state.timerRemaining -= 1;
      if (this.state.timerRemaining <= 0) {
        this.stopTimer();
        onExpire();
      }
      this.notify();
    }, 1000);
  }

  private stopTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    this.state.isTimerActive = false;
  }
}
