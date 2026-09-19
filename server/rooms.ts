import { WebSocket } from "ws";
import { GoogleGenAI, Type } from "@google/genai";

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
  blob?: any;
  base64: string;
  mimeType: string;
  durationSeconds: number;
  waveformSamples: number[];
  audioBuffer?: any;
  isPreset?: boolean;
}

export interface AudioRecording {
  blob?: any;
  base64: string;
  mimeType: string;
  durationSeconds: number;
  url: string;
  waveformSamples: number[];
  audioBuffer?: any;
}

export interface SimilarityResult {
  score: number;
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

function createWavBase64(
  sampleRate: number,
  durationSeconds: number,
  generator: (t: number) => number
): { base64: string; waveform: number[] } {
  const numSamples = Math.floor(sampleRate * durationSeconds);
  const buffer = Buffer.alloc(44 + numSamples * 2);

  // RIFF Header
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + numSamples * 2, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16); // SubChunk1Size (16 for PCM)
  buffer.writeUInt16LE(1, 20); // AudioFormat (1 for PCM)
  buffer.writeUInt16LE(1, 22); // NumChannels (1 for mono)
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28); // ByteRate
  buffer.writeUInt16LE(2, 32); // BlockAlign
  buffer.writeUInt16LE(16, 34); // BitsPerSample
  buffer.write("data", 36);
  buffer.writeUInt32LE(numSamples * 2, 40);

  const samples: number[] = new Array(numSamples);
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const s = Math.max(-1, Math.min(1, generator(t)));
    samples[i] = Math.abs(s);
    const int16 = Math.floor(s * 32767);
    buffer.writeInt16LE(int16, 44 + i * 2);
  }

  // Extract 36 waveform peaks
  const step = Math.floor(numSamples / 36);
  const waveform: number[] = [];
  for (let b = 0; b < 36; b++) {
    let peak = 0;
    const start = b * step;
    const end = Math.min(start + step, numSamples);
    for (let k = start; k < end; k++) {
      if (samples[k] > peak) peak = samples[k];
    }
    waveform.push(Math.round(peak * 100) / 100);
  }

  return {
    base64: `data:audio/wav;base64,${buffer.toString("base64")}`,
    waveform,
  };
}

function getServerPresetClips(): AudioClip[] {
  const sampleRate = 16000;

  // 1. Cartoon Boing
  const boing = createWavBase64(sampleRate, 1.8, (t) => {
    const freq = 140 + 380 * Math.pow(t / 1.8, 0.6) + Math.sin(2 * Math.PI * 18 * t) * 45;
    const env = Math.exp(-t * 1.8);
    return Math.sin(2 * Math.PI * freq * t) * env * 0.75;
  });

  // 2. Alien Laser Blaster
  const laser = createWavBase64(sampleRate, 1.4, (t) => {
    const freq = Math.max(70, 2200 * Math.exp(-t * 5.5));
    const env = Math.exp(-t * 2.5);
    const s = Math.sin(2 * Math.PI * freq * t);
    return (s > 0 ? 0.6 : -0.6) * env * 0.7;
  });

  // 3. Screaming Goat Bleat
  const goat = createWavBase64(sampleRate, 2.0, (t) => {
    const vibrato = Math.sin(2 * Math.PI * 14 * t) * 75;
    const baseFreq = 420 + vibrato;
    const tremolo = 0.6 + 0.4 * Math.sin(2 * Math.PI * 14 * t);
    const env = t < 0.1 ? t / 0.1 : Math.exp(-(t - 0.1) * 1.5);
    const wave = Math.sin(2 * Math.PI * baseFreq * t) + 0.5 * Math.sin(2 * Math.PI * baseFreq * 2 * t);
    return wave * 0.45 * env * tremolo;
  });

  // 4. Disco Whistle
  const whistle = createWavBase64(sampleRate, 1.5, (t) => {
    const freq = 1100 + 400 * Math.sin(2 * Math.PI * 5 * t);
    const env = Math.sin(Math.PI * (t / 1.5));
    const noise = (Math.random() * 2 - 1) * 0.08;
    return (Math.sin(2 * Math.PI * freq * t) * 0.75 + noise) * env;
  });

  return [
    {
      id: "server_preset_boing",
      name: "Cartoon Boing",
      url: boing.base64,
      base64: boing.base64,
      mimeType: "audio/wav",
      durationSeconds: 1.8,
      waveformSamples: boing.waveform,
      isPreset: true,
    },
    {
      id: "server_preset_laser",
      name: "Alien Laser Blaster",
      url: laser.base64,
      base64: laser.base64,
      mimeType: "audio/wav",
      durationSeconds: 1.4,
      waveformSamples: laser.waveform,
      isPreset: true,
    },
    {
      id: "server_preset_goat",
      name: "Screaming Goat Bleat",
      url: goat.base64,
      base64: goat.base64,
      mimeType: "audio/wav",
      durationSeconds: 2.0,
      waveformSamples: goat.waveform,
      isPreset: true,
    },
    {
      id: "server_preset_whistle",
      name: "Disco Whistle",
      url: whistle.base64,
      base64: whistle.base64,
      mimeType: "audio/wav",
      durationSeconds: 1.5,
      waveformSamples: whistle.waveform,
      isPreset: true,
    },
  ];
}

export class RoomManager {
  private rooms: Map<string, RoomState> = new Map();
  private roomSockets: Map<string, Set<WebSocket>> = new Map();
  private socketPlayerMap: Map<WebSocket, { roomCode: string; playerId: string }> = new Map();
  private roomTimers: Map<string, any> = new Map();
  private ioServer: any = null;

  constructor(private getAiClient: () => GoogleGenAI | null) {}

  /**
   * Connect Socket.io server instance for multi-transport room broadcasting
   */
  setSocketIOServer(io: any): void {
    this.ioServer = io;
  }

  /**
   * Helper: Normalize room code to uppercase without leading/trailing spaces
   */
  normalizeCode(code: string): string {
    return code.trim().toUpperCase();
  }

  /**
   * Create a new room with an auto-generated or custom code
   */
  createRoom(
    hostName: string,
    hostAvatar: string,
    requestedCode?: string
  ): { roomState: RoomState; hostPlayer: Player } | { error: string } {
    let code: string;

    if (requestedCode && requestedCode.trim()) {
      let candidate = requestedCode.trim().toUpperCase().replace(/\s+/g, "");
      if (!candidate.startsWith("ECHO-") && /^\d{4}$/.test(candidate)) {
        candidate = `ECHO-${candidate}`;
      }
      if (this.rooms.has(candidate)) {
        const existing = this.rooms.get(candidate)!;
        if (existing.players.length > 0 && existing.phase !== "LOBBY") {
          return {
            error: `Room ${candidate} is currently running an active game. Please enter a different room code or leave blank to auto-generate.`,
          };
        }
      }
      code = candidate;
    } else {
      do {
        code = "ECHO-" + Math.floor(1000 + Math.random() * 9000);
      } while (this.rooms.has(code));
    }

    const hostPlayer: Player = {
      id: "p_host_" + Math.random().toString(36).substring(2, 8),
      name: hostName.trim() || "Host Player",
      avatar: hostAvatar || "🎙️",
      isHost: true,
      score: 0,
      isReady: true,
    };

    const roomState: RoomState = {
      roomCode: code,
      phase: "LOBBY",
      players: [hostPlayer],
      clipPool: getServerPresetClips(),
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

    this.rooms.set(code, roomState);
    return { roomState: this.cloneState(roomState), hostPlayer };
  }

  /**
   * Join an existing room via room code
   */
  joinRoom(
    rawCode: string,
    playerName: string,
    avatar: string,
    existingPlayerId?: string
  ): { roomState: RoomState; player: Player } | { error: string } {
    const code = this.normalizeCode(rawCode);
    const room = this.rooms.get(code);

    if (!room) {
      return { error: `Room ${code} was not found. Please verify the code or ask the host!` };
    }

    // Check if player is rejoining with existing ID
    let player = existingPlayerId
      ? room.players.find((p) => p.id === existingPlayerId)
      : undefined;

    if (!player) {
      // Create new player
      player = {
        id: "p_" + Math.random().toString(36).substring(2, 8),
        name: playerName.trim() || "Player " + (room.players.length + 1),
        avatar: avatar || "🎭",
        isHost: room.players.length === 0,
        score: 0,
        isReady: true,
      };
      room.players.push(player);
    } else {
      // Update name/avatar
      if (playerName) player.name = playerName.trim();
      if (avatar) player.avatar = avatar;
    }

    this.broadcast(code);
    return { roomState: this.cloneState(room), player };
  }

  /**
   * Get room by code
   */
  getRoom(rawCode: string): RoomState | undefined {
    const code = this.normalizeCode(rawCode);
    const room = this.rooms.get(code);
    return room ? this.cloneState(room) : undefined;
  }

  /**
   * Register a WebSocket connection to a room
   */
  registerSocket(rawCode: string, playerId: string, ws: WebSocket): void {
    const code = this.normalizeCode(rawCode);
    let sockets = this.roomSockets.get(code);
    if (!sockets) {
      sockets = new Set();
      this.roomSockets.set(code, sockets);
    }
    sockets.add(ws);
    this.socketPlayerMap.set(ws, { roomCode: code, playerId });

    // Send current state immediately to the new connection
    const room = this.rooms.get(code);
    if (room && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "ROOM_STATE", state: this.cloneState(room) }));
    }
  }

  /**
   * Unregister a WebSocket connection
   */
  unregisterSocket(ws: WebSocket): void {
    const meta = this.socketPlayerMap.get(ws);
    if (meta) {
      const { roomCode } = meta;
      const sockets = this.roomSockets.get(roomCode);
      if (sockets) {
        sockets.delete(ws);
        if (sockets.size === 0) {
          this.roomSockets.delete(roomCode);
        }
      }
      this.socketPlayerMap.delete(ws);
    }
  }

  /**
   * Broadcast state to all connected clients in the room
   */
  broadcast(rawCode: string): void {
    const code = this.normalizeCode(rawCode);
    const room = this.rooms.get(code);
    if (!room) return;

    const cloned = this.cloneState(room);

    // 1. Broadcast to Socket.io room subscribers
    if (this.ioServer) {
      try {
        this.ioServer.to(code).emit("ROOM_STATE", {
          type: "ROOM_STATE",
          state: cloned,
        });
        this.ioServer.to(code).emit("room_state", cloned);
      } catch (err) {
        console.warn("Failed to broadcast to Socket.io room:", err);
      }
    }

    // 2. Broadcast to raw WebSocket connections
    const sockets = this.roomSockets.get(code);
    if (sockets && sockets.size > 0) {
      const payload = JSON.stringify({
        type: "ROOM_STATE",
        state: cloned,
      });

      sockets.forEach((ws) => {
        if (ws.readyState === WebSocket.OPEN) {
          try {
            ws.send(payload);
          } catch (err) {
            console.warn("Failed to send WebSocket message:", err);
          }
        }
      });
    }
  }

  /**
   * Handle room mutation action
   */
  async handleAction(
    rawCode: string,
    playerId: string,
    actionType: string,
    payload: any
  ): Promise<RoomState | { error: string }> {
    const code = this.normalizeCode(rawCode);
    const room = this.rooms.get(code);
    if (!room) {
      return { error: `Room ${code} not found` };
    }

    switch (actionType) {
      case "ADD_CLIP": {
        if (payload?.clip) {
          const raw = payload.clip;
          const cleanClip: AudioClip = {
            id: String(raw.id || "clip_" + Math.random().toString(36).substring(2, 9)),
            name: String(raw.name || "Audio Clip"),
            url: String(raw.url || raw.base64 || ""),
            base64: typeof raw.base64 === "string" ? raw.base64 : undefined,
            mimeType: String(raw.mimeType || "audio/mpeg"),
            durationSeconds: typeof raw.durationSeconds === "number" ? raw.durationSeconds : 2,
            waveformSamples: Array.isArray(raw.waveformSamples) ? raw.waveformSamples : [],
            isPreset: Boolean(raw.isPreset),
          };
          room.clipPool = room.clipPool.filter((c) => c.id !== cleanClip.id);
          room.clipPool.push(cleanClip);
        }
        break;
      }

      case "SET_CLIPS": {
        if (Array.isArray(payload?.clips)) {
          room.clipPool = payload.clips.map((raw: any) => ({
            id: String(raw.id || "clip_" + Math.random().toString(36).substring(2, 9)),
            name: String(raw.name || "Audio Clip"),
            url: String(raw.url || raw.base64 || ""),
            base64: typeof raw.base64 === "string" ? raw.base64 : undefined,
            mimeType: String(raw.mimeType || "audio/mpeg"),
            durationSeconds: typeof raw.durationSeconds === "number" ? raw.durationSeconds : 2,
            waveformSamples: Array.isArray(raw.waveformSamples) ? raw.waveformSamples : [],
            isPreset: Boolean(raw.isPreset),
          }));
        }
        break;
      }

      case "REMOVE_CLIP": {
        if (payload?.clipId) {
          room.clipPool = room.clipPool.filter((c) => c.id !== payload.clipId);
        }
        break;
      }

      case "CLEAR_CLIPS": {
        room.clipPool = [];
        break;
      }

      case "UPDATE_SETTINGS": {
        if (payload?.scoringEngine) {
          room.scoringEngine = payload.scoringEngine;
        }
        if (typeof payload?.totalRounds === "number") {
          room.currentRound.totalRounds = payload.totalRounds;
        }
        break;
      }

      case "UPDATE_PROFILE": {
        const player = room.players.find((p) => p.id === playerId);
        if (player) {
          if (payload?.name) player.name = payload.name;
          if (payload?.avatar) player.avatar = payload.avatar;
        }
        break;
      }

      case "ADD_BOT": {
        const bots = [
          { name: "Noisy Dave", avatar: "🦜" },
          { name: "Echo Queen", avatar: "👑" },
          { name: "Beatbox Bob", avatar: "🎧" },
          { name: "Screaming Goat", avatar: "🐐" },
          { name: "Alien Zog", avatar: "👽" },
        ];
        const available = bots.filter((b) => !room.players.some((p) => p.name === b.name));
        const chosen = available[0] || {
          name: "Party Bot " + (room.players.length + 1),
          avatar: "🤖",
        };
        room.players.push({
          id: "p_bot_" + Math.random().toString(36).substring(2, 8),
          name: chosen.name,
          avatar: chosen.avatar,
          isHost: false,
          score: 0,
          isReady: true,
        });
        break;
      }

      case "REMOVE_PLAYER": {
        if (payload?.targetPlayerId) {
          room.players = room.players.filter((p) => p.id !== payload.targetPlayerId);
        }
        break;
      }

      case "START_GAME": {
        this.stopRoomTimer(code);
        // Shuffle clips and assign
        this.assignRandomizedClips(room);
        room.currentRound.roundNumber = 1;
        room.currentRound.activePlayerIndex = 0;
        room.currentRound.turnSubmissions = {};
        room.phase = "TURN_MIMIC";
        this.startRoomTimer(code, 45);
        break;
      }

      case "SUBMIT_MIMIC": {
        this.stopRoomTimer(code);
        const activePlayer = room.players[room.currentRound.activePlayerIndex];
        if (!activePlayer || !activePlayer.assignedClip) {
          return { error: "No active player or assigned clip" };
        }

        const targetClip = activePlayer.assignedClip;
        const mimicRecording: AudioRecording = payload?.recording;

        let result: SimilarityResult = payload?.result;
        if (!result) {
          result = await this.evaluateMimicWithAI(targetClip, mimicRecording);
        }

        const submission: TurnSubmission = {
          playerId: activePlayer.id,
          playerName: activePlayer.name,
          targetClip,
          mimicRecording,
          result,
        };

        activePlayer.turnSubmission = submission;
        activePlayer.lastRoundScore = result.score;
        activePlayer.score += result.score;
        room.currentRound.turnSubmissions[activePlayer.id] = submission;
        room.phase = "TURN_SCORE";
        break;
      }

      case "ADVANCE_TURN": {
        this.stopRoomTimer(code);
        const nextIndex = room.currentRound.activePlayerIndex + 1;
        if (nextIndex < room.players.length) {
          room.currentRound.activePlayerIndex = nextIndex;
          room.phase = "TURN_MIMIC";
          this.startRoomTimer(code, 45);
        } else {
          room.phase = "ROUND_SUMMARY";
          room.players.sort((a, b) => b.score - a.score);
        }
        break;
      }

      case "NEXT_ROUND": {
        this.stopRoomTimer(code);
        const { roundNumber, totalRounds } = room.currentRound;
        if (roundNumber >= totalRounds) {
          room.phase = "GAME_OVER";
        } else {
          this.assignRandomizedClips(room);
          room.currentRound.roundNumber = roundNumber + 1;
          room.currentRound.activePlayerIndex = 0;
          room.currentRound.turnSubmissions = {};
          room.phase = "TURN_MIMIC";
          this.startRoomTimer(code, 45);
        }
        break;
      }

      case "RESET_LOBBY": {
        this.stopRoomTimer(code);
        room.phase = "LOBBY";
        room.players.forEach((p) => {
          p.score = 0;
          p.lastRoundScore = undefined;
          p.assignedClip = undefined;
          p.turnSubmission = undefined;
        });
        room.currentRound = {
          roundNumber: 1,
          totalRounds: room.currentRound.totalRounds || 3,
          activePlayerIndex: 0,
          turnSubmissions: {},
        };
        break;
      }

      default:
        console.warn(`Unknown action type: ${actionType}`);
    }

    this.broadcast(code);
    return this.cloneState(room);
  }

  private assignRandomizedClips(room: RoomState): void {
    const pool = [...room.clipPool];
    if (pool.length === 0) return;

    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    room.players.forEach((player, idx) => {
      player.assignedClip = pool[idx % pool.length];
      player.turnSubmission = undefined;
    });
  }

  private async evaluateMimicWithAI(
    targetClip: AudioClip,
    mimicRecording: AudioRecording
  ): Promise<SimilarityResult> {
    const ai = this.getAiClient();
    if (!ai) {
      return {
        score: Math.floor(68 + Math.random() * 22),
        critique: "A spirited vocal impression! Solid rhythmic delivery and comedic flair.",
        pitchMatch: "Contour closely tracked original clip.",
        energyMatch: "Dynamic volume maintained with gusto.",
        method: "GEMINI_MULTIMODAL",
        isFallback: true,
      };
    }

    try {
      const cleanPromptBase64 = targetClip.base64.replace(/^data:[^;]+;base64,/, "");
      const cleanMimicBase64 = mimicRecording.base64.replace(/^data:[^;]+;base64,/, "");

      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: {
          parts: [
            {
              text: `You are the hilarious party judge for "Echo Match".
Audio 1 is the original target sound clip.
Audio 2 is the player's vocal imitation attempt.
Analyze similarity in pitch, timbre, rhythm, and hilarious effort.
Assign an integer score 0-100 and write a punchy 1-2 sentence humorous critique.`,
            },
            {
              inlineData: {
                mimeType: targetClip.mimeType || "audio/wav",
                data: cleanPromptBase64,
              },
            },
            {
              inlineData: {
                mimeType: mimicRecording.mimeType || "audio/webm",
                data: cleanMimicBase64,
              },
            },
          ],
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              score: { type: Type.INTEGER },
              critique: { type: Type.STRING },
              pitchMatch: { type: Type.STRING },
              energyMatch: { type: Type.STRING },
            },
            required: ["score", "critique"],
          },
        },
      });

      const parsed = JSON.parse(response.text?.trim() || "{}");
      return {
        score: typeof parsed.score === "number" ? Math.min(100, Math.max(0, parsed.score)) : 70,
        critique: parsed.critique || "A bold and memorable vocal attempt!",
        pitchMatch: parsed.pitchMatch,
        energyMatch: parsed.energyMatch,
        method: "GEMINI_MULTIMODAL",
      };
    } catch (err) {
      console.error("Gemini server evaluation error:", err);
      return {
        score: 65,
        critique: "Great vocal energy and comedic rhythm! Acoustically recognized!",
        method: "GEMINI_MULTIMODAL",
        isFallback: true,
      };
    }
  }

  private startRoomTimer(code: string, seconds: number): void {
    this.stopRoomTimer(code);
    const room = this.rooms.get(code);
    if (!room) return;

    room.timerRemaining = seconds;
    room.isTimerActive = true;
    this.broadcast(code);

    const interval = setInterval(() => {
      const r = this.rooms.get(code);
      if (!r) {
        clearInterval(interval);
        return;
      }
      r.timerRemaining -= 1;
      if (r.timerRemaining <= 0) {
        this.stopRoomTimer(code);
      }
      this.broadcast(code);
    }, 1000);

    this.roomTimers.set(code, interval);
  }

  private stopRoomTimer(code: string): void {
    const timer = this.roomTimers.get(code);
    if (timer) {
      clearInterval(timer);
      this.roomTimers.delete(code);
    }
    const room = this.rooms.get(code);
    if (room) {
      room.isTimerActive = false;
    }
  }

  private cloneState(state: RoomState): RoomState {
    return JSON.parse(JSON.stringify(state));
  }
}
