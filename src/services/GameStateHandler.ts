/**
 * Echo Match - GameStateHandler
 * Real-time multiplayer room state manager.
 * Connects to the Node.js backend over WebSocket with HTTP polling fallback.
 * Synchronizes clip pools, player lists, randomized sound assignments,
 * turn timers, and mimicry evaluations across all players in a room.
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

export type StateListener = (state: RoomState | null) => void;

function normalizeAudioClip(clip: AudioClip): AudioClip {
  let validUrl = clip.url;
  if (!validUrl || validUrl.startsWith("blob:")) {
    if (clip.base64) {
      validUrl = clip.base64.startsWith("data:")
        ? clip.base64
        : `data:${clip.mimeType || "audio/wav"};base64,${clip.base64}`;
    }
  }
  return {
    ...clip,
    url: validUrl,
  };
}

function normalizeAudioRecording(rec: AudioRecording): AudioRecording {
  let validUrl = rec.url;
  if (!validUrl || validUrl.startsWith("blob:")) {
    if (rec.base64) {
      validUrl = rec.base64.startsWith("data:")
        ? rec.base64
        : `data:${rec.mimeType || "audio/webm"};base64,${rec.base64}`;
    }
  }
  return {
    ...rec,
    url: validUrl,
  };
}

function normalizeRoomState(state: RoomState): RoomState {
  return {
    ...state,
    clipPool: (state.clipPool || []).map(normalizeAudioClip),
    players: (state.players || []).map((p) => ({
      ...p,
      assignedClip: p.assignedClip ? normalizeAudioClip(p.assignedClip) : undefined,
      turnSubmission: p.turnSubmission
        ? {
            ...p.turnSubmission,
            targetClip: normalizeAudioClip(p.turnSubmission.targetClip),
            mimicRecording: normalizeAudioRecording(p.turnSubmission.mimicRecording),
          }
        : undefined,
    })),
  };
}

export class GameStateHandler {
  private state: RoomState | null = null;
  private currentPlayerId: string = "";
  private listeners: Set<StateListener> = new Set();
  private ws: WebSocket | null = null;
  private pollInterval: any = null;
  private isConnecting: boolean = false;
  private pingInterval: any = null;

  constructor() {
    // Check if session storage has existing room info
    const savedRoomCode = sessionStorage.getItem("echo_room_code");
    const savedPlayerId = sessionStorage.getItem("echo_player_id");
    if (savedRoomCode && savedPlayerId) {
      this.currentPlayerId = savedPlayerId;
      this.fetchState(savedRoomCode).catch(() => {
        // Room likely expired or server restarted
        this.clearSession();
      });
    }
  }

  /**
   * Subscribe to room state updates
   */
  subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    const currentState = this.getState();
    this.listeners.forEach((listener) => listener(currentState));
  }

  getState(): RoomState | null {
    return this.state ? JSON.parse(JSON.stringify(this.state)) : null;
  }

  getCurrentPlayerId(): string {
    return this.currentPlayerId;
  }

  getCurrentPlayer(): Player | undefined {
    return this.state?.players.find((p) => p.id === this.currentPlayerId);
  }

  isHost(): boolean {
    const player = this.getCurrentPlayer();
    return Boolean(player?.isHost);
  }

  private saveSession(roomCode: string, playerId: string): void {
    try {
      sessionStorage.setItem("echo_room_code", roomCode);
      sessionStorage.setItem("echo_player_id", playerId);
    } catch {
      // Ignored
    }
  }

  private clearSession(): void {
    try {
      sessionStorage.removeItem("echo_room_code");
      sessionStorage.removeItem("echo_player_id");
    } catch {
      // Ignored
    }
  }

  /**
   * Create a new room on the server
   */
  async createRoom(hostName: string, hostAvatar: string): Promise<RoomState> {
    const res = await fetch("/api/rooms/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hostName, hostAvatar }),
    });

    if (!res.ok) {
      throw new Error("Failed to create room on server");
    }

    const data = await res.json();
    this.currentPlayerId = data.player.id;
    this.state = normalizeRoomState(data.roomState);
    this.saveSession(data.roomState.roomCode, data.player.id);
    this.notify();

    this.connectWebSocket(data.roomState.roomCode, data.player.id);
    this.startPolling(data.roomState.roomCode);

    // Initialize procedural sound presets if clip pool is empty
    if (!this.state.clipPool || this.state.clipPool.length === 0) {
      this.initDefaultPresets();
    }

    return this.state;
  }

  /**
   * Join an existing room via room code
   */
  async joinRoom(roomCode: string, playerName: string, avatar: string): Promise<RoomState> {
    const cleanCode = roomCode.trim().toUpperCase();
    const res = await fetch("/api/rooms/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roomCode: cleanCode,
        playerName,
        avatar,
        playerId: this.currentPlayerId || undefined,
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Could not join room ${cleanCode}`);
    }

    const data = await res.json();
    this.currentPlayerId = data.player.id;
    this.state = normalizeRoomState(data.roomState);
    this.saveSession(data.roomState.roomCode, data.player.id);
    this.notify();

    this.connectWebSocket(data.roomState.roomCode, data.player.id);
    this.startPolling(data.roomState.roomCode);

    return this.state;
  }

  /**
   * Leave current room
   */
  leaveRoom(): void {
    this.disconnectWebSocket();
    this.stopPolling();
    this.clearSession();
    this.state = null;
    this.currentPlayerId = "";
    this.notify();
  }

  /**
   * Fetch current room state from REST endpoint
   */
  async fetchState(roomCode: string): Promise<RoomState | null> {
    try {
      const res = await fetch(`/api/rooms/${roomCode}/state`);
      if (!res.ok) {
        if (res.status === 404) {
          this.clearSession();
          this.state = null;
          this.notify();
        }
        return null;
      }
      const data = await res.json();
      if (data.roomState) {
        this.state = normalizeRoomState(data.roomState);
        this.notify();
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
          this.connectWebSocket(roomCode, this.currentPlayerId);
        }
        this.startPolling(roomCode);
        return this.state;
      }
    } catch (err) {
      console.warn("Error fetching room state:", err);
    }
    return null;
  }

  /**
   * Initialize default presets in room
   */
  private async initDefaultPresets(): Promise<void> {
    try {
      const presets = await AudioClipManager.generatePresetClips();
      await this.sendAction("SET_CLIPS", { clips: presets });
    } catch (err) {
      console.warn("Could not generate procedural presets immediately:", err);
    }
  }

  /**
   * Send game action to server
   */
  private async sendAction(actionType: string, payload: any): Promise<void> {
    if (!this.state) return;
    const roomCode = this.state.roomCode;

    // Try WebSocket first
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(
          JSON.stringify({
            type: "ACTION",
            roomCode,
            playerId: this.currentPlayerId,
            actionType,
            payload,
          })
        );
        return;
      } catch (err) {
        console.warn("WebSocket send failed, falling back to HTTP:", err);
      }
    }

    // Fallback to HTTP POST
    try {
      const res = await fetch(`/api/rooms/${roomCode}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId: this.currentPlayerId,
          actionType,
          payload,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.roomState) {
          this.state = normalizeRoomState(data.roomState);
          this.notify();
        }
      }
    } catch (err) {
      console.error("HTTP action request error:", err);
    }
  }

  /**
   * WebSocket connection and management
   */
  private connectWebSocket(roomCode: string, playerId: string): void {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      return;
    }

    try {
      this.isConnecting = true;
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws`;

      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        this.isConnecting = false;
        this.ws = ws;
        // Send JOIN message
        ws.send(JSON.stringify({ type: "JOIN", roomCode, playerId }));

        // Heartbeat ping
        if (this.pingInterval) clearInterval(this.pingInterval);
        this.pingInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "PING" }));
          }
        }, 15000);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === "ROOM_STATE" && msg.state) {
            this.state = normalizeRoomState(msg.state);
            this.notify();
          }
        } catch (err) {
          console.warn("Failed to parse WebSocket message:", err);
        }
      };

      ws.onclose = () => {
        this.isConnecting = false;
        this.ws = null;
        if (this.pingInterval) clearInterval(this.pingInterval);
      };

      ws.onerror = (err) => {
        this.isConnecting = false;
        console.warn("WebSocket error:", err);
      };
    } catch (err) {
      this.isConnecting = false;
      console.warn("Could not create WebSocket connection:", err);
    }
  }

  private disconnectWebSocket(): void {
    if (this.pingInterval) clearInterval(this.pingInterval);
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnecting = false;
  }

  /**
   * Polling fallback ensures continuous sync even if WS drops
   */
  private startPolling(roomCode: string): void {
    this.stopPolling();
    this.pollInterval = setInterval(async () => {
      // If WebSocket is not open, poll via HTTP
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        await this.fetchState(roomCode);
      }
    }, 2000);
  }

  private stopPolling(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  // --- Game Action Methods ---

  addClip(clip: AudioClip): void {
    this.sendAction("ADD_CLIP", { clip });
  }

  removeClip(clipId: string): void {
    this.sendAction("REMOVE_CLIP", { clipId });
  }

  async reloadPresets(): Promise<void> {
    const presets = await AudioClipManager.generatePresetClips();
    const customClips = (this.state?.clipPool || []).filter((c) => !c.isPreset);
    this.sendAction("SET_CLIPS", { clips: [...customClips, ...presets] });
  }

  clearAllClips(): void {
    this.sendAction("CLEAR_CLIPS", {});
  }

  setScoringEngine(engine: "MEYDA_MFCC_DTW" | "GEMINI_MULTIMODAL"): void {
    this.sendAction("UPDATE_SETTINGS", { scoringEngine: engine });
  }

  setTotalRounds(rounds: number): void {
    this.sendAction("UPDATE_SETTINGS", { totalRounds: rounds });
  }

  updatePlayerProfile(playerId: string, name: string, avatar: string): void {
    this.sendAction("UPDATE_PROFILE", { name, avatar });
  }

  addPlayer(_name: string, _avatar: string = "🎭"): void {
    this.sendAction("ADD_BOT", {});
  }

  removePlayer(playerId: string): void {
    this.sendAction("REMOVE_PLAYER", { targetPlayerId: playerId });
  }

  startGame(): void {
    this.sendAction("START_GAME", {});
  }

  async submitActivePlayerMimic(recording: AudioRecording): Promise<void> {
    if (!this.state) return;
    const activePlayer = this.state.players[this.state.currentRound.activePlayerIndex];
    if (!activePlayer || !activePlayer.assignedClip) return;

    let result: SimilarityResult | undefined;

    // If using client-side Meyda MFCC, compute it immediately on client
    if (this.state.scoringEngine === "MEYDA_MFCC_DTW") {
      try {
        result = await AudioComparer.compareWithMeyda(activePlayer.assignedClip, recording);
      } catch (err) {
        console.warn("Client Meyda comparison error:", err);
      }
    }

    // Send mimic recording and optional client result to server
    await this.sendAction("SUBMIT_MIMIC", {
      recording: {
        base64: recording.base64,
        mimeType: recording.mimeType,
        durationSeconds: recording.durationSeconds,
        url: recording.url,
        waveformSamples: recording.waveformSamples,
      },
      result,
    });
  }

  advanceNextTurn(): void {
    this.sendAction("ADVANCE_TURN", {});
  }

  nextRound(): void {
    this.sendAction("NEXT_ROUND", {});
  }

  resetToLobby(): void {
    this.sendAction("RESET_LOBBY", {});
  }
}
