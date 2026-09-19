import express from "express";
import http from "http";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import { WebSocket, WebSocketServer } from "ws";
import dotenv from "dotenv";
import { RoomManager } from "./server/rooms";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "15mb" }));

// Lazy Gemini client
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

const roomManager = new RoomManager(getGeminiClient);

// Health check endpoint
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
    timestamp: new Date().toISOString(),
  });
});

// Room Creation API
app.post("/api/rooms/create", (req, res) => {
  try {
    const { hostName, hostAvatar } = req.body || {};
    const { roomState, hostPlayer } = roomManager.createRoom(
      hostName || "Host Player",
      hostAvatar || "🎙️"
    );
    res.json({ roomState, player: hostPlayer });
  } catch (err: any) {
    console.error("Error creating room:", err);
    res.status(500).json({ error: "Failed to create room" });
  }
});

// Room Join API
app.post("/api/rooms/join", (req, res) => {
  try {
    const { roomCode, playerName, avatar, playerId } = req.body || {};
    if (!roomCode) {
      return res.status(400).json({ error: "Room code is required" });
    }

    const result = roomManager.joinRoom(roomCode, playerName, avatar, playerId);
    if ("error" in result) {
      return res.status(404).json({ error: result.error });
    }

    res.json(result);
  } catch (err: any) {
    console.error("Error joining room:", err);
    res.status(500).json({ error: "Failed to join room" });
  }
});

// Get Room State API
app.get("/api/rooms/:roomCode/state", (req, res) => {
  const { roomCode } = req.params;
  const room = roomManager.getRoom(roomCode);
  if (!room) {
    return res.status(404).json({ error: `Room ${roomCode} not found` });
  }
  res.json({ roomState: room });
});

// Post Room Action API
app.post("/api/rooms/:roomCode/action", async (req, res) => {
  try {
    const { roomCode } = req.params;
    const { playerId, actionType, payload } = req.body || {};

    if (!actionType) {
      return res.status(400).json({ error: "actionType is required" });
    }

    const result = await roomManager.handleAction(roomCode, playerId, actionType, payload);
    if ("error" in result) {
      return res.status(400).json({ error: result.error });
    }

    res.json({ roomState: result });
  } catch (err: any) {
    console.error("Error handling room action:", err);
    res.status(500).json({ error: "Failed to perform action" });
  }
});

// Audio Comparison API (Option B: Multimodal Gemini LLM)
app.post("/api/compare-audio", async (req, res) => {
  try {
    const { promptAudioBase64, mimicAudioBase64, promptMimeType, mimicMimeType } = req.body;

    if (!promptAudioBase64 || !mimicAudioBase64) {
      return res.status(400).json({
        error: "Both promptAudioBase64 and mimicAudioBase64 are required",
      });
    }

    const ai = getGeminiClient();
    if (!ai) {
      // Graceful algorithmic fallback when no API key is provided
      return res.json({
        score: Math.floor(65 + Math.random() * 25),
        critique: "Simulated Gemini evaluation (GEMINI_API_KEY not configured). Pitch contour showed great enthusiasm, but cadence varied!",
        pitchMatch: "Fairly close fundamental frequency contour.",
        energyMatch: "Decent dynamic range reproduction.",
        isFallback: true,
      });
    }

    const cleanPromptBase64 = promptAudioBase64.replace(/^data:[^;]+;base64,/, "");
    const cleanMimicBase64 = mimicAudioBase64.replace(/^data:[^;]+;base64,/, "");

    const pMime = promptMimeType || "audio/webm";
    const mMime = mimicMimeType || "audio/webm";

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: {
        parts: [
          {
            text: `You are the ultimate hilarious party game judge for "Echo Match", a voice acting and audio mimicry game.
Audio 1 is the ORIGINAL PROMPT (recorded by player 1).
Audio 2 is the MIMIC attempt (recorded by player 2).

Analyze and compare both 2-second audio clips based on:
1. Pitch contour and fundamental frequency matching.
2. Timbre, vocal fry, or harmonic characteristics (nasal, guttural, falsetto, animal sounds, accents).
3. Rhythmic timing, pauses, and cadence.
4. Overall comedic effort and uncanny similarity.

Assign an integer score between 0 and 100:
- 90-100: Incredible mimicry! Nearly indistinguishable or acoustically identical.
- 75-89: Great imitation! Captured the essence with slight pitch or timing deviation.
- 50-74: Fair effort! We can tell what you were going for, but voice cracked or rhythm drifted.
- 20-49: Questionable sound choices. Mildly unrecognizable.
- 0-19: Completely distinct sound or pure silence.

Write a witty, punchy, funny 1-2 sentence critique that directly roasts or praises their vocal performance.`,
          },
          {
            inlineData: {
              mimeType: pMime,
              data: cleanPromptBase64,
            },
          },
          {
            inlineData: {
              mimeType: mMime,
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
            score: {
              type: Type.INTEGER,
              description: "Integer similarity score between 0 and 100",
            },
            critique: {
              type: Type.STRING,
              description: "Funny, punchy 1-2 sentence party-game critique",
            },
            pitchMatch: {
              type: Type.STRING,
              description: "Brief note on pitch accuracy",
            },
            energyMatch: {
              type: Type.STRING,
              description: "Brief note on timing, tempo, and volume dynamics",
            },
          },
          required: ["score", "critique"],
        },
      },
    });

    const rawText = response.text?.trim() || "{}";
    const parsed = JSON.parse(rawText);
    return res.json({
      score: typeof parsed.score === "number" ? Math.min(100, Math.max(0, Math.round(parsed.score))) : 70,
      critique: parsed.critique || "A bold vocal exploration!",
      pitchMatch: parsed.pitchMatch || "Pitch was roughly within ballpark.",
      energyMatch: parsed.energyMatch || "Energy was vibrant.",
      isFallback: false,
    });
  } catch (err: any) {
    console.error("Error evaluating audio with Gemini:", err);
    return res.status(500).json({
      error: "Failed to evaluate audio with Gemini",
      details: err?.message || String(err),
      fallbackScore: 72,
      fallbackCritique: "Audio was received, but the AI judge was momentarily flabbergasted! Solid attempt!",
    });
  }
});

async function startServer() {
  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (ws: WebSocket, req) => {
    // Keep alive ping-pong
    (ws as any).isAlive = true;
    ws.on("pong", () => {
      (ws as any).isAlive = true;
    });

    ws.on("message", async (data: string) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === "JOIN") {
          const { roomCode, playerId } = msg;
          if (roomCode && playerId) {
            roomManager.registerSocket(roomCode, playerId, ws);
          }
        } else if (msg.type === "ACTION") {
          const { roomCode, playerId, actionType, payload } = msg;
          if (roomCode && actionType) {
            await roomManager.handleAction(roomCode, playerId, actionType, payload);
          }
        } else if (msg.type === "PING") {
          ws.send(JSON.stringify({ type: "PONG" }));
        }
      } catch (err) {
        console.warn("Error parsing WebSocket message:", err);
      }
    });

    ws.on("close", () => {
      roomManager.unregisterSocket(ws);
    });

    ws.on("error", (err) => {
      console.warn("WebSocket client error:", err);
      roomManager.unregisterSocket(ws);
    });
  });

  // Heartbeat interval for stale connection cleanup
  const heartbeat = setInterval(() => {
    wss.clients.forEach((ws: any) => {
      if (!ws.isAlive) {
        return ws.terminate();
      }
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on("close", () => {
    clearInterval(heartbeat);
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Echo Match server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
