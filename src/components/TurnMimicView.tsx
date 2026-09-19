import React, { useState, useRef, useEffect } from "react";
import {
  Mic,
  Square,
  Volume2,
  RotateCcw,
  Check,
  Clock,
  Sparkles,
  Bot,
  Shuffle,
  Activity,
  ArrowRight,
} from "lucide-react";
import { RoomState, AudioRecording } from "../types";
import { GameStateHandler } from "../services/GameStateHandler";
import { AudioRecorder } from "../services/AudioRecorder";
import { AudioWaveform } from "./AudioWaveform";
import { AudioClipManager } from "../services/AudioClipManager";

interface TurnMimicViewProps {
  roomState: RoomState;
  gameHandler: GameStateHandler;
  currentPlayerId: string;
}

export const TurnMimicView: React.FC<TurnMimicViewProps> = ({
  roomState,
  gameHandler,
  currentPlayerId,
}) => {
  const { roundNumber, totalRounds, activePlayerIndex } = roomState.currentRound;
  const activePlayer = roomState.players[activePlayerIndex];
  const isMyTurn = activePlayer?.id === currentPlayerId;
  const isBot = Boolean(activePlayer?.id?.startsWith("p_bot_"));
  const isHostClient = Boolean(roomState.players.find((p) => p.id === currentPlayerId)?.isHost);

  const targetClip = activePlayer?.assignedClip;

  const [isRecording, setIsRecording] = useState(false);
  const [recordTimeLeft, setRecordTimeLeft] = useState(2.2);
  const [micLevel, setMicLevel] = useState(0);
  const [recordedMimic, setRecordedMimic] = useState<AudioRecording | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);

  const audioRecorderRef = useRef<AudioRecorder | null>(null);

  // Auto-play bot turns with brief simulated delay (only executed by the host to prevent double submissions)
  useEffect(() => {
    setRecordedMimic(null);
    setIsRecording(false);
    setIsEvaluating(false);

    if (isBot && isHostClient && targetClip) {
      const timer = setTimeout(() => {
        handleBotSimulatedMimic();
      }, 2400);
      return () => clearTimeout(timer);
    }
  }, [activePlayerIndex, isBot, isHostClient]);

  const startRecording = async () => {
    setRecordedMimic(null);
    setIsRecording(true);
    setRecordTimeLeft(2.2);

    try {
      if (!audioRecorderRef.current) {
        audioRecorderRef.current = new AudioRecorder();
      }

      await audioRecorderRef.current.init((lvl) => {
        setMicLevel(lvl);
      });

      const startTime = Date.now();
      const durationMs = 2200;
      const interval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const remain = Math.max(0, (durationMs - elapsed) / 1000);
        setRecordTimeLeft(remain);
        if (remain <= 0) clearInterval(interval);
      }, 50);

      const recording = await audioRecorderRef.current.recordClip(durationMs);
      clearInterval(interval);
      setRecordedMimic(recording);
      setIsRecording(false);
      setMicLevel(0);
    } catch (err) {
      console.error("Recording error:", err);
      setIsRecording(false);
    }
  };

  const handleBotSimulatedMimic = async () => {
    if (!targetClip) return;
    setIsEvaluating(true);

    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioContextClass();
    const duration = Math.min(2.5, Math.max(1.2, targetClip.durationSeconds));
    const sampleRate = ctx.sampleRate;
    const buffer = ctx.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);

    // Bot generates simulated acoustic mimicry with slight pitch variance
    const pitchOffset = (Math.random() - 0.5) * 120;
    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      const freq = Math.max(90, 480 * Math.exp(-t * 2.5) + 160 + pitchOffset);
      data[i] = Math.sin(2 * Math.PI * freq * t) * (1 - t / duration) * 0.7;
    }

    const wavBlob = AudioClipManager.audioBufferToWav(buffer);
    const base64 = await blobToBase64Helper(wavBlob);
    const url = URL.createObjectURL(wavBlob);

    const recording: AudioRecording = {
      blob: wavBlob,
      base64,
      mimeType: "audio/wav",
      durationSeconds: duration,
      url,
      waveformSamples: [0.6, 0.75, 0.8, 0.6, 0.5, 0.4, 0.25],
      audioBuffer: buffer,
    };

    await gameHandler.submitActivePlayerMimic(recording);
    setIsEvaluating(false);
  };

  const submitMyMimic = async () => {
    if (!recordedMimic) return;
    setIsEvaluating(true);
    await gameHandler.submitActivePlayerMimic(recordedMimic);
    setIsEvaluating(false);
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6">
      {/* Top Round & Turn Header */}
      <div className="flex items-center justify-between bg-white rounded-2xl p-4 border border-stone-200 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-900 text-xs font-bold uppercase tracking-wider">
            Round {roundNumber} of {totalRounds}
          </span>
          <span className="text-xs font-semibold text-stone-600">
            Turn {activePlayerIndex + 1} of {roomState.players.length}
          </span>
        </div>

        {/* Scoring Engine Mode Indicator */}
        <div className="flex items-center gap-1.5 text-xs text-stone-600 font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>
            {roomState.scoringEngine === "MEYDA_MFCC_DTW"
              ? "Meyda MFCC + DTW"
              : "Gemini Multimodal AI"}
          </span>
        </div>
      </div>

      {/* Active Turn Banner */}
      <div
        className={`rounded-2xl p-6 sm:p-7 border shadow-xs text-center relative overflow-hidden transition-all ${
          isMyTurn
            ? "bg-amber-500 text-white border-amber-400"
            : "bg-stone-900 text-stone-100 border-stone-800"
        }`}
      >
        <div className="relative z-10 space-y-2">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-3xl shadow-inner mb-2 border border-white/30">
            {activePlayer?.avatar || "🎙️"}
          </div>

          <span
            className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
              isMyTurn
                ? "bg-white/25 text-white"
                : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
            }`}
          >
            {isMyTurn ? "Your Turn to Mimic!" : `${activePlayer?.name}'s Turn`}
          </span>

          <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
            {isMyTurn
              ? "Listen to your assigned sound, then mimic it!"
              : `${activePlayer?.name} is mimicking their randomized clip`}
          </h2>

          <p
            className={`text-xs max-w-md mx-auto ${
              isMyTurn ? "text-amber-100" : "text-stone-400"
            }`}
          >
            {isMyTurn
              ? "Hit Listen on the target sound below as many times as you like. When ready, click record to imitate!"
              : "Listen along to the target audio while waiting for the imitation score reveal."}
          </p>
        </div>
      </div>

      {/* ASSIGNED TARGET AUDIO CARD */}
      {targetClip ? (
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-stone-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                <Shuffle className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 block">
                  Assigned Target Audio
                </span>
                <h3 className="text-base font-extrabold text-stone-900">
                  {targetClip.name}
                </h3>
              </div>
            </div>

            <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-stone-100 border border-stone-200 text-stone-700">
              {targetClip.durationSeconds}s clip
            </span>
          </div>

          {/* Target Audio Waveform & Listen Button */}
          <AudioWaveform
            samples={targetClip.waveformSamples}
            audioUrl={targetClip.url}
            height={52}
            label="Listen to Target Sound"
            barColor="bg-amber-200"
            activeColor="bg-amber-600"
          />
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-6 text-center text-stone-500 text-xs">
          Loading assigned clip...
        </div>
      )}

      {/* MIMICRY RECORDING & ACTION SECTION */}
      {isMyTurn ? (
        <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-xs space-y-5 text-center">
          <h3 className="text-sm font-bold uppercase tracking-wider text-stone-700">
            Record Your Vocal Mimicry
          </h3>

          {/* VU Level Bar during live recording */}
          {isRecording && (
            <div className="w-full max-w-md mx-auto space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-stone-600">
                <span className="flex items-center gap-1.5 text-rose-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping" />
                  Recording Audio...
                </span>
                <span className="font-mono text-amber-600 font-bold">
                  {recordTimeLeft.toFixed(1)}s
                </span>
              </div>
              <div className="w-full h-3 bg-stone-100 rounded-full overflow-hidden border border-stone-200 p-0.5">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 via-amber-500 to-rose-500 rounded-full transition-all duration-75"
                  style={{ width: `${Math.min(100, Math.max(4, micLevel * 100))}%` }}
                />
              </div>
            </div>
          )}

          {/* Recording Stage Button */}
          {!recordedMimic && !isRecording && (
            <div className="py-4">
              <button
                onClick={startRecording}
                className="inline-flex items-center justify-center gap-3 px-8 py-4 rounded-2xl bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white font-black text-base shadow-md hover:shadow-lg transition-all cursor-pointer transform hover:-translate-y-0.5"
              >
                <Mic className="w-5 h-5" />
                <span>Start Mimic Recording (2.2s)</span>
              </button>
              <p className="text-xs text-stone-500 mt-2">
                Click to record. Use your microphone to imitate the target sound!
              </p>
            </div>
          )}

          {/* Recording in Progress Ring */}
          {isRecording && (
            <div className="py-6 flex flex-col items-center justify-center gap-2">
              <div className="w-20 h-20 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-lg animate-pulse">
                <Mic className="w-8 h-8" />
              </div>
              <span className="text-xs font-bold text-rose-600 uppercase tracking-wider">
                Imitating Sound Now!
              </span>
            </div>
          )}

          {/* Review & Submit Recorded Mimic */}
          {recordedMimic && !isRecording && (
            <div className="space-y-4 pt-2">
              <div className="bg-stone-50 p-4 rounded-xl border border-stone-200">
                <AudioWaveform
                  samples={recordedMimic.waveformSamples}
                  audioUrl={recordedMimic.url}
                  height={44}
                  label="Your Recorded Mimicry"
                />
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  onClick={startRecording}
                  disabled={isEvaluating}
                  className="w-full sm:w-auto px-5 py-3 rounded-xl border border-stone-300 hover:bg-stone-50 text-stone-700 font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Re-record</span>
                </button>

                <button
                  onClick={submitMyMimic}
                  disabled={isEvaluating}
                  className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-black text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isEvaluating ? (
                    <>
                      <Sparkles className="w-4 h-4 animate-spin" />
                      <span>Evaluating Similarity...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Submit Mimic & Reveal Score!</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      ) : isBot ? (
        <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-xs text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-stone-100 text-stone-700 text-xs font-bold uppercase">
            <Bot className="w-3.5 h-3.5 text-amber-600" />
            Party Bot In Action
          </div>
          <p className="text-sm font-semibold text-stone-800">
            {activePlayer?.name} is listening to their assigned audio and vocalizing an imitation...
          </p>

          <div className="flex justify-center pt-2">
            <button
              onClick={handleBotSimulatedMimic}
              disabled={isEvaluating}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-white font-bold text-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {isEvaluating ? (
                <Sparkles className="w-3.5 h-3.5 animate-spin text-amber-400" />
              ) : (
                <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
              )}
              <span>{isEvaluating ? "Scoring Bot..." : "Instant Bot Mimic & Score"}</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-xs text-center space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
            Waiting for {activePlayer?.name}
          </span>
          <p className="text-sm font-semibold text-stone-800">
            {activePlayer?.name} is currently recording their mimicry of the sound!
          </p>
        </div>
      )}
    </div>
  );
};

function blobToBase64Helper(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
