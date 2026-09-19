/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useMemo } from "react";
import {
  Mic,
  BookOpen,
  Volume2,
  Sparkles,
  Layers,
  Users,
  LogOut,
  Copy,
  Check,
  Radio,
} from "lucide-react";
import { RoomState } from "./types";
import { GameStateHandler } from "./services/GameStateHandler";
import { RoomEntryView } from "./components/RoomEntryView";
import { LobbyView } from "./components/LobbyView";
import { TurnMimicView } from "./components/TurnMimicView";
import { TurnScoreView } from "./components/TurnScoreView";
import { LeaderboardView } from "./components/LeaderboardView";
import { ArchitectureModal } from "./components/ArchitectureModal";

export default function App() {
  // Initialize state handler
  const gameHandler = useMemo(() => new GameStateHandler(), []);
  const [roomState, setRoomState] = useState<RoomState | null>(gameHandler.getState());
  const [isArchModalOpen, setIsArchModalOpen] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Check URL search parameters for shared room invite code: e.g. ?room=ECHO-4821
  const initialRoomFromUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    const params = new URLSearchParams(window.location.search);
    return params.get("room") || "";
  }, []);

  // Subscribe to real-time state updates
  useEffect(() => {
    const unsubscribe = gameHandler.subscribe((newState) => {
      setRoomState(newState);
    });
    return unsubscribe;
  }, [gameHandler]);

  const currentPlayerId = gameHandler.getCurrentPlayerId();
  const currentPlayer = roomState?.players.find((p) => p.id === currentPlayerId);

  const handleJoinRoom = async (roomCode: string, playerName: string, avatar: string) => {
    setIsConnecting(true);
    setErrorMsg(null);
    try {
      await gameHandler.joinRoom(roomCode, playerName, avatar);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to join room. Please check the code.");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleCreateRoom = async (
    hostName: string,
    avatar: string,
    customRoomCode?: string
  ) => {
    setIsConnecting(true);
    setErrorMsg(null);
    try {
      await gameHandler.createRoom(hostName, avatar, customRoomCode);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to create room.");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleCopyHeaderRoom = () => {
    if (roomState?.roomCode) {
      navigator.clipboard.writeText(roomState.roomCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

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
                <span className="hidden sm:inline-flex text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                  Multiplayer Audio Game
                </span>
              </div>
            </div>
          </div>

          {/* Right Status Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            {roomState && (
              <>
                {/* Room Code Badge */}
                <button
                  onClick={handleCopyHeaderRoom}
                  title="Click to copy Room Code"
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-200/80 text-amber-900 text-xs font-mono font-bold transition-colors cursor-pointer"
                >
                  <span>{roomState.roomCode}</span>
                  {copiedCode ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-amber-700" />
                  )}
                </button>

                {/* Player Profile Chip */}
                {currentPlayer && (
                  <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-stone-100 border border-stone-200 text-xs text-stone-700">
                    <span className="text-sm">{currentPlayer.avatar}</span>
                    <span className="font-semibold">{currentPlayer.name}</span>
                    {currentPlayer.isHost && (
                      <span className="text-[9px] uppercase font-extrabold px-1.5 py-0.2 rounded bg-amber-200 text-amber-900">
                        Host
                      </span>
                    )}
                  </div>
                )}

                {/* Active Engine Badge */}
                <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-stone-100 border border-stone-200 text-xs text-stone-700">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-medium text-[11px]">
                    {roomState.scoringEngine === "MEYDA_MFCC_DTW"
                      ? "Meyda MFCC"
                      : "Gemini AI"}
                  </span>
                </div>

                {/* Leave Room Button */}
                <button
                  onClick={() => gameHandler.leaveRoom()}
                  title="Leave this room"
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-stone-300 hover:bg-stone-50 text-stone-700 text-xs font-medium transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5 text-stone-500" />
                  <span className="hidden sm:inline">Leave</span>
                </button>
              </>
            )}

            {/* Architecture Spec Button */}
            <button
              onClick={() => setIsArchModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-stone-300 hover:border-stone-400 bg-white hover:bg-stone-50 text-stone-800 text-xs font-semibold transition-all shadow-2xs cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5 text-amber-600" />
              <span className="hidden sm:inline">Specs</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Interactive Stage */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 md:p-8 flex flex-col justify-start">
        {!roomState ? (
          <RoomEntryView
            onJoinRoom={handleJoinRoom}
            onCreateRoom={handleCreateRoom}
            initialRoomCode={initialRoomFromUrl}
            isConnecting={isConnecting}
            errorMsg={errorMsg}
            onClearError={() => setErrorMsg(null)}
          />
        ) : (
          <>
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
          </>
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
