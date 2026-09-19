/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useMemo } from "react";
import { Mic, BookOpen, Volume2, Sparkles, Layers, Users } from "lucide-react";
import { RoomState } from "./types";
import { GameStateHandler } from "./services/GameStateHandler";
import { LobbyView } from "./components/LobbyView";
import { TurnMimicView } from "./components/TurnMimicView";
import { TurnScoreView } from "./components/TurnScoreView";
import { LeaderboardView } from "./components/LeaderboardView";
import { ArchitectureModal } from "./components/ArchitectureModal";

export default function App() {
  // Initialize state handler
  const gameHandler = useMemo(() => new GameStateHandler("Host Player"), []);
  const [roomState, setRoomState] = useState<RoomState>(gameHandler.getState());
  const [isArchModalOpen, setIsArchModalOpen] = useState(false);

  // Subscribe to real-time state machine updates
  useEffect(() => {
    const unsubscribe = gameHandler.subscribe((newState) => {
      setRoomState(newState);
    });
    return unsubscribe;
  }, [gameHandler]);

  const currentPlayerId = roomState.players[0]?.id || "";

  return (
    <div className="min-h-screen bg-stone-100 text-stone-900 flex flex-col font-sans selection:bg-amber-200">
      {/* Top Global Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-200 px-4 sm:px-8 py-3 shadow-2xs">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          {/* Logo & Branding */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-600 flex items-center justify-center text-white shadow-xs">
              <Mic className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight text-stone-900">
                  Echo Match
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                  Live Game Engine
                </span>
              </div>
            </div>
          </div>

          {/* Right Status Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Active Engine Badge */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-stone-100 border border-stone-200 text-xs text-stone-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-medium text-[11px]">
                {roomState.scoringEngine === "MEYDA_MFCC_DTW"
                  ? "Option A: Meyda MFCC"
                  : "Option B: Gemini Flash"}
              </span>
            </div>

            {/* Architecture Spec Button */}
            <button
              onClick={() => setIsArchModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-stone-300 hover:border-stone-400 bg-white hover:bg-stone-50 text-stone-800 text-xs font-semibold transition-all shadow-2xs cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5 text-amber-600" />
              <span>Architecture & Code</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Interactive Stage */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 md:p-8 flex flex-col justify-start">
        {roomState.phase === "LOBBY" && (
          <LobbyView
            roomState={roomState}
            gameHandler={gameHandler}
            currentPlayerId={currentPlayerId}
          />
        )}

        {roomState.phase === "TURN_MIMIC" && (
          <TurnMimicView
            roomState={roomState}
            gameHandler={gameHandler}
            currentPlayerId={currentPlayerId}
          />
        )}

        {roomState.phase === "TURN_SCORE" && (
          <TurnScoreView
            roomState={roomState}
            gameHandler={gameHandler}
          />
        )}

        {(roomState.phase === "ROUND_SUMMARY" || roomState.phase === "GAME_OVER") && (
          <LeaderboardView
            roomState={roomState}
            gameHandler={gameHandler}
          />
        )}
      </main>

      {/* Subtle Footer */}
      <footer className="border-t border-stone-200 py-4 px-6 text-center text-xs text-stone-500 bg-white/60">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Echo Match • Web Audio API & Gemini Multimodal Party Game</span>
          <button
            onClick={() => setIsArchModalOpen(true)}
            className="hover:underline text-amber-700 font-medium cursor-pointer"
          >
            View System Architecture & Starter Code
          </button>
        </div>
      </footer>

      {/* Architecture Spec Inspector Modal */}
      <ArchitectureModal
        isOpen={isArchModalOpen}
        onClose={() => setIsArchModalOpen(false)}
      />
    </div>
  );
}
