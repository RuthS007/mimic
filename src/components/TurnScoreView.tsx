import React from "react";
import {
  Sparkles,
  Trophy,
  ArrowRight,
  Activity,
  Volume2,
  CheckCircle2,
  Crown,
} from "lucide-react";
import { RoomState } from "../types";
import { GameStateHandler } from "../services/GameStateHandler";
import { AudioWaveform } from "./AudioWaveform";

interface TurnScoreViewProps {
  roomState: RoomState;
  gameHandler: GameStateHandler;
}

export const TurnScoreView: React.FC<TurnScoreViewProps> = ({
  roomState,
  gameHandler,
}) => {
  const { roundNumber, totalRounds, activePlayerIndex } = roomState.currentRound;
  const activePlayer = roomState.players[activePlayerIndex];
  const submission = activePlayer?.turnSubmission;
  const result = submission?.result;

  const isLastTurnOfRound = activePlayerIndex >= roomState.players.length - 1;
  const nextPlayer = !isLastTurnOfRound ? roomState.players[activePlayerIndex + 1] : null;

  const scoreNum = result?.score ?? 0;

  // Visual color scale based on mimicry score
  let badgeBg = "bg-amber-500 text-white border-amber-400";
  let gradeText = "Great Attempt!";
  if (scoreNum >= 85) {
    badgeBg = "bg-emerald-500 text-white border-emerald-400";
    gradeText = "Flawless Echo!";
  } else if (scoreNum >= 65) {
    badgeBg = "bg-amber-500 text-white border-amber-400";
    gradeText = "Recognizable Imitation!";
  } else {
    badgeBg = "bg-rose-500 text-white border-rose-400";
    gradeText = "Bold & Creative Interpretation!";
  }

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="bg-stone-900 text-white rounded-2xl p-6 border border-stone-800 shadow-sm text-center relative overflow-hidden">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-semibold uppercase mb-2">
          <Activity className="w-3.5 h-3.5" />
          Turn Score Reveal
        </div>
        <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
          {activePlayer?.name}'s Mimicry Score
        </h2>
        <p className="text-xs text-stone-400 mt-1 max-w-md mx-auto">
          {result?.method === "MEYDA_MFCC_DTW"
            ? "Meyda extracted 13 MFCC spectral coefficients and aligned with Dynamic Time Warping."
            : "Gemini analyzed multimodal vocal resonance, timbre, and comedic effort."}
        </p>
      </div>

      {/* Main Score & Critique Card */}
      <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-stone-100 pb-5">
          <div className="flex items-center gap-3.5 text-left">
            <span className="text-4xl p-2 bg-stone-100 rounded-2xl border border-stone-200 shadow-2xs">
              {activePlayer?.avatar || "🎙️"}
            </span>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
                Turn Result
              </span>
              <h3 className="text-xl font-black text-stone-900">
                {activePlayer?.name}
              </h3>
              <span className="text-xs font-semibold text-emerald-700">
                +{scoreNum} points added to standings!
              </span>
            </div>
          </div>

          {/* Big Score Pill */}
          <div
            className={`px-6 py-3 rounded-2xl border text-center font-black shadow-xs min-w-[130px] ${badgeBg}`}
          >
            <div className="text-4xl leading-none">{scoreNum}</div>
            <div className="text-[10px] uppercase tracking-wider opacity-90 mt-1">
              Similarity Score
            </div>
          </div>
        </div>

        {/* Side-by-Side Audio Comparison */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Target Sound */}
          {submission?.targetClip && (
            <div className="p-4 bg-amber-50/60 rounded-xl border border-amber-200 space-y-2">
              <span className="text-xs font-bold uppercase text-amber-900 flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5 text-amber-700" />
                Target Sound ({submission.targetClip.name})
              </span>
              <AudioWaveform
                samples={submission.targetClip.waveformSamples}
                audioUrl={submission.targetClip.url}
                height={40}
                barColor="bg-amber-200"
                activeColor="bg-amber-600"
              />
            </div>
          )}

          {/* Player Mimic Sound */}
          {submission?.mimicRecording && (
            <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
              <span className="text-xs font-bold uppercase text-stone-700 flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5 text-stone-600" />
                {activePlayer?.name}'s Imitation
              </span>
              <AudioWaveform
                samples={submission.mimicRecording.waveformSamples}
                audioUrl={submission.mimicRecording.url}
                height={40}
                barColor="bg-stone-300"
                activeColor="bg-stone-800"
              />
            </div>
          )}
        </div>

        {/* Judge's Critique Box */}
        {result && (
          <div className="p-4 bg-amber-50/70 rounded-xl border border-amber-200/90 space-y-2 text-left">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              Judge's Evaluation
            </div>
            <p className="text-xs sm:text-sm text-stone-800 font-medium leading-relaxed italic">
              "{result.critique}"
            </p>
            {(result.pitchMatch || result.energyMatch) && (
              <div className="flex flex-wrap gap-2 pt-1 text-[11px] text-stone-700">
                {result.pitchMatch && (
                  <span className="bg-white/80 px-2 py-0.5 rounded-md border border-stone-200">
                    🎯 {result.pitchMatch}
                  </span>
                )}
                {result.energyMatch && (
                  <span className="bg-white/80 px-2 py-0.5 rounded-md border border-stone-200">
                    ⚡ {result.energyMatch}
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action Navigation Footer */}
      <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="text-xs text-stone-600 text-center sm:text-left">
          {isLastTurnOfRound ? (
            <span>
              All players have completed their turns for <strong>Round {roundNumber}</strong>!
            </span>
          ) : (
            <span>
              Next up: <strong>{nextPlayer?.name}</strong> will mimic their assigned audio clip.
            </span>
          )}
        </div>

        <button
          onClick={() => gameHandler.advanceNextTurn()}
          className="w-full sm:w-auto px-6 py-3 rounded-xl bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white font-black text-sm transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>{isLastTurnOfRound ? "View Round Standings" : `Next Turn: ${nextPlayer?.name}`}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
