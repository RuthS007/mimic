import React, { useState } from "react";
import { X, Layers, Cpu, Code2, Server, Check, Copy, ExternalLink } from "lucide-react";

interface ArchitectureModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ArchitectureModal: React.FC<ArchitectureModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<"ARCH" | "SIMILARITY" | "CODE">("ARCH");
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyCode = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(id);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-stone-200 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-stone-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-600 text-white flex items-center justify-center font-bold">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900">
                Echo Match • Architecture & Technical Spec
              </h2>
              <p className="text-xs text-stone-600">
                Multiplayer Web Audio & Gemini AI Mimicry Engine Design
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-stone-200 text-stone-600 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-stone-200 px-6 bg-white gap-4 text-xs font-bold uppercase tracking-wider">
          <button
            onClick={() => setActiveTab("ARCH")}
            className={`py-3 border-b-2 cursor-pointer transition-colors ${
              activeTab === "ARCH"
                ? "border-amber-600 text-amber-800"
                : "border-transparent text-stone-600 hover:text-stone-900"
            }`}
          >
            1. System Architecture & State Machine
          </button>
          <button
            onClick={() => setActiveTab("SIMILARITY")}
            className={`py-3 border-b-2 cursor-pointer transition-colors ${
              activeTab === "SIMILARITY"
                ? "border-amber-600 text-amber-800"
                : "border-transparent text-stone-600 hover:text-stone-900"
            }`}
          >
            2. Audio Similarity Strategies (Option A vs B)
          </button>
          <button
            onClick={() => setActiveTab("CODE")}
            className={`py-3 border-b-2 cursor-pointer transition-colors ${
              activeTab === "CODE"
                ? "border-amber-600 text-amber-800"
                : "border-transparent text-stone-600 hover:text-stone-900"
            }`}
          >
            3. Production Starter Code
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm text-stone-700">
          {activeTab === "ARCH" && (
            <div className="space-y-6">
              {/* Stack Recommendation */}
              <div>
                <h3 className="text-base font-bold text-stone-900 mb-2 flex items-center gap-2">
                  <Server className="w-4 h-4 text-amber-600" />
                  Recommended Low-Latency & Free/Low-Cost Tech Stack
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl border border-stone-200 bg-stone-50 space-y-2">
                    <span className="text-xs font-bold text-amber-800 uppercase">
                      Front-End & Audio Runtime
                    </span>
                    <ul className="text-xs space-y-1.5 list-disc list-inside text-stone-700">
                      <li><strong>React + Vite + TypeScript:</strong> Ultra-fast build & lightweight bundle.</li>
                      <li><strong>Web Audio API:</strong> Microsecond-precision recording, live RMS VU-metering, and offline AudioBuffer feature extraction.</li>
                      <li><strong>MediaRecorder API:</strong> Native browser Opus/WebM encoding with fallback WAV header synthesis.</li>
                    </ul>
                  </div>

                  <div className="p-4 rounded-xl border border-stone-200 bg-stone-50 space-y-2">
                    <span className="text-xs font-bold text-amber-800 uppercase">
                      Real-Time & Audio Transport
                    </span>
                    <ul className="text-xs space-y-1.5 list-disc list-inside text-stone-700">
                      <li><strong>Node.js + Socket.io (or PartyKit):</strong> Sub-50ms room state synchronization, room codes, presence, and turn orchestration.</li>
                      <li><strong>Ephemeral Audio Payloads:</strong> Small 2-second Opus clips (~25-45KB) can stream over WebSockets or be stored in Cloudflare R2 / Supabase Storage with signed ephemeral URLs.</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* State Machine */}
              <div>
                <h3 className="text-base font-bold text-stone-900 mb-2 flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-amber-600" />
                  Core Game State Machine
                </h3>
                <div className="p-4 rounded-xl border border-stone-200 bg-stone-900 text-stone-200 font-mono text-xs space-y-2">
                  <div className="text-amber-400 font-bold">
                    [LOBBY]
                  </div>
                  <div className="pl-4 text-stone-400">
                    ↳ Upload custom audio clips (.mp3, .wav, .webm) into pool or load presets ➔ Waveforms extracted ➔ Host clicks Start Game
                  </div>
                  <div className="text-amber-400 font-bold">
                    [TURN_MIMIC] (45s per turn)
                  </div>
                  <div className="pl-4 text-stone-400">
                    ↳ Audio clips in pool are shuffled and randomized across players ➔ Active player listens to their assigned clip ➔ Records vocal mimicry
                  </div>
                  <div className="text-amber-400 font-bold">
                    [TURN_SCORE]
                  </div>
                  <div className="pl-4 text-stone-400">
                    ↳ AudioComparer runs (Option A: Meyda MFCC/DTW or Option B: Gemini AI) ➔ Displays side-by-side comparison, 0-100 score & critique ➔ Next player's turn begins
                  </div>
                  <div className="text-amber-400 font-bold">
                    [ROUND_SUMMARY]
                  </div>
                  <div className="pl-4 text-stone-400">
                    ↳ Round leaderboard update ➔ Re-shuffles new randomized clips for next round OR triggers [GAME_OVER] if rounds finished
                  </div>
                  <div className="text-amber-400 font-bold">
                    [GAME_OVER]
                  </div>
                  <div className="pl-4 text-stone-400">
                    ↳ Final podium ceremony ➔ Option to replay or return to Lobby to add more clips
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "SIMILARITY" && (
            <div className="space-y-6">
              <h3 className="text-base font-bold text-stone-900 mb-2">
                Audio Similarity Engine: Deep Strategy Comparison
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Option A */}
                <div className="p-5 rounded-xl border border-blue-200 bg-blue-50/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-stone-900 text-sm">
                      Option A: Meyda MFCC + DTW (Client-Side)
                    </h4>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                      Zero Cost • Offline
                    </span>
                  </div>
                  <p className="text-xs text-stone-600 leading-relaxed">
                    Processes the raw audio locally using the Web Audio API and Meyda. Slices the audio into windowed 512-sample frames with a Hamming window, extracts 13 Mel-Frequency Cepstral Coefficients per frame, and computes an elastic alignment cost via <strong>Dynamic Time Warping (DTW)</strong>.
                  </p>
                  <div className="text-xs space-y-1 text-stone-700">
                    <div><strong>Latency:</strong> ~15-40ms (Instant, client-side)</div>
                    <div><strong>Cost:</strong> $0.00 (Zero server CPU)</div>
                    <div><strong>Strength:</strong> Objective spectral shape & formant comparison.</div>
                    <div><strong>Limitation:</strong> Doesn't understand humor, intentional comedic pitch shifts, or phonetic meaning.</div>
                  </div>
                </div>

                {/* Option B */}
                <div className="p-5 rounded-xl border border-amber-200 bg-amber-50/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-stone-900 text-sm">
                      Option B: Gemini Multimodal Audio LLM
                    </h4>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-900">
                      AI Party Judge • Context-Aware
                    </span>
                  </div>
                  <p className="text-xs text-stone-600 leading-relaxed">
                    Streams both base64 audio clips to the server-side Gemini Flash API endpoint with a structured JSON schema (<code className="bg-amber-100 px-1 py-0.5 rounded text-[11px]">responseSchema</code>). The model evaluates timbre, cadence, pitch contour, and comedic mimicry, returning a similarity score and hilarious feedback.
                  </p>
                  <div className="text-xs space-y-1 text-stone-700">
                    <div><strong>Latency:</strong> ~600-1200ms</div>
                    <div><strong>Cost:</strong> Fractions of a cent per prompt (Gemini Flash audio pricing)</div>
                    <div><strong>Strength:</strong> Incredibly fun, roast critiques, recognizes animal noises, accents, and voice subtleties.</div>
                    <div><strong>Limitation:</strong> Requires network connection & API key.</div>
                  </div>
                </div>
              </div>

              {/* Hybrid Recommendation */}
              <div className="p-4 rounded-xl border border-stone-200 bg-stone-50 text-xs text-stone-700">
                <strong className="text-stone-900 block mb-1">Architectural Recommendation: The Hybrid Fallback Pattern</strong>
                Deploy with Gemini Flash as the primary party game engine for maximum entertainment value, while retaining the client-side Meyda MFCC/DTW engine as an instant, zero-latency offline fallback if network degradation or quota limits occur.
              </div>
            </div>
          )}

          {activeTab === "CODE" && (
            <div className="space-y-6">
              <p className="text-xs text-stone-600">
                Clean, modular TypeScript starter implementations ready for production.
              </p>

              {/* Module 1: AudioRecorder */}
              <div className="rounded-xl border border-stone-200 bg-stone-900 text-stone-100 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2 bg-stone-800 text-xs font-mono text-stone-300">
                  <span>AudioRecorder.ts</span>
                  <button
                    onClick={() => copyCode("recorder", audioRecorderCodeSnippet)}
                    className="flex items-center gap-1 hover:text-white cursor-pointer"
                  >
                    {copiedSection === "recorder" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedSection === "recorder" ? "Copied" : "Copy"}</span>
                  </button>
                </div>
                <pre className="p-4 text-[11px] font-mono overflow-x-auto text-stone-300 max-h-60">
                  {audioRecorderCodeSnippet}
                </pre>
              </div>

              {/* Module 2: AudioComparer */}
              <div className="rounded-xl border border-stone-200 bg-stone-900 text-stone-100 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2 bg-stone-800 text-xs font-mono text-stone-300">
                  <span>AudioComparer.ts (Gemini + Meyda)</span>
                  <button
                    onClick={() => copyCode("comparer", audioComparerCodeSnippet)}
                    className="flex items-center gap-1 hover:text-white cursor-pointer"
                  >
                    {copiedSection === "comparer" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedSection === "comparer" ? "Copied" : "Copy"}</span>
                  </button>
                </div>
                <pre className="p-4 text-[11px] font-mono overflow-x-auto text-stone-300 max-h-60">
                  {audioComparerCodeSnippet}
                </pre>
              </div>

              {/* Module 3: GameStateHandler */}
              <div className="rounded-xl border border-stone-200 bg-stone-900 text-stone-100 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2 bg-stone-800 text-xs font-mono text-stone-300">
                  <span>GameStateHandler.ts</span>
                  <button
                    onClick={() => copyCode("handler", gameStateHandlerSnippet)}
                    className="flex items-center gap-1 hover:text-white cursor-pointer"
                  >
                    {copiedSection === "handler" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedSection === "handler" ? "Copied" : "Copy"}</span>
                  </button>
                </div>
                <pre className="p-4 text-[11px] font-mono overflow-x-auto text-stone-300 max-h-60">
                  {gameStateHandlerSnippet}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-stone-200 bg-stone-50 flex items-center justify-between">
          <span className="text-xs text-stone-500">
            Echo Match System Architecture v1.0
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-white font-bold text-xs transition-colors cursor-pointer"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};

const audioRecorderCodeSnippet = `export class AudioRecorder {
  private mediaStream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioContext: AudioContext | null = null;

  async init(): Promise<void> {
    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: false, autoGainControl: false },
      video: false,
    });
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }

  async recordClip(durationMs: number = 2200): Promise<{ blob: Blob; base64: string; audioBuffer: AudioBuffer }> {
    await this.init();
    return new Promise((resolve, reject) => {
      const chunks: Blob[] = [];
      const recorder = new MediaRecorder(this.mediaStream!, { mimeType: "audio/webm" });
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        const arrayBuf = await blob.arrayBuffer();
        const audioBuffer = await this.audioContext!.decodeAudioData(arrayBuf.slice(0));
        const base64 = await blobToBase64(blob);
        resolve({ blob, base64, audioBuffer });
      };
      recorder.start();
      setTimeout(() => recorder.stop(), durationMs);
    });
  }
}`;

const audioComparerCodeSnippet = `// Option B: Structured Gemini Flash API
export async function compareAudioWithGemini(promptBase64: string, mimicBase64: string) {
  const response = await fetch('/api/compare-audio', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ promptAudioBase64: promptBase64, mimicAudioBase64: mimicBase64 })
  });
  return response.json(); // { score: number, critique: string, pitchMatch: string }
}

// Option A: Meyda MFCC + DTW
export function computeMFCCDTW(bufferA: AudioBuffer, bufferB: AudioBuffer) {
  const mfccA = extractMFCCFrames(bufferA);
  const mfccB = extractMFCCFrames(bufferB);
  const dtwCost = dynamicTimeWarping(mfccA, mfccB);
  return Math.min(100, Math.max(0, Math.round(100 * Math.exp(-dtwCost / 28.0))));
}`;

const gameStateHandlerSnippet = `export type GamePhase = "LOBBY" | "PROMPT_PHASE" | "MIMIC_PHASE" | "SCORING_PHASE" | "ROUND_SUMMARY" | "GAME_OVER";

export class GameStateHandler {
  private state: RoomState;
  private listeners = new Set<(s: RoomState) => void>();

  submitPrompt(recording: AudioRecording) {
    this.state.currentRound.promptRecording = recording;
    this.transitionTo("MIMIC_PHASE");
  }

  submitMimic(playerId: string, recording: AudioRecording) {
    this.state.currentRound.submissions[playerId] = { recording, ... };
    if (this.allMimicsSubmitted()) this.evaluateScores();
  }
}`;
