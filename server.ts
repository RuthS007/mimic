import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

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

// Health check endpoint
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
    timestamp: new Date().toISOString(),
  });
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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Echo Match server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
