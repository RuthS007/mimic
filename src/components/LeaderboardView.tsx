import React from "react";
import { Trophy, Medal, RotateCcw, ArrowRight, Play, Crown } from "lucide-react";
import { RoomState } from "../types";
import { GameStateHandler } from "../services/GameStateHandler";

interface LeaderboardViewProps {
  roomState: RoomState;
  gameHandler: GameStateHandler;
}

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({
  roomState,
  gameHandler,
}) => {
  const isGameOver = roomState.phase === "GAME_OVER";
  const { roundNumber, totalRounds } = roomState.currentRound;

  // Sorted players by cumulative score
  const sortedPlayers = [...roomState.players].sort((a, b) => b.score - a.score);
  const winner = sortedPlayers[0];

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* Header Banner */}
      <div
        className={`rounded-2xl p-6 sm:p-8 text-center border shadow-xs relative overflow-hidden ${
          isGameOver
            ? "bg-gradient-to-b from-amber-500 to-amber-600 text-white border-amber-400"
            : "bg-white text-stone-900 border-stone-200"
        }`}
      >
        {isGameOver ? (
          <div className="space-y-2">
            <div className="w-16 h-16 mx-auto rounded-full bg-white/20 flex items-center justify-center text-3xl shadow-inner mb-2">
              🏆
            </div>
            <span className="text-xs uppercase font-extrabold tracking-widest text-amber-100">
              Game Over • Final Results
            </span>
            <h2 className="text-3xl font-black tracking-tight text-white">
              {winner?.name} Takes The Crown!
            </h2>
            <p className="text-amber-100 text-xs max-w-md mx-auto">
              With a total cumulative mimicry score of {winner?.score} points across {totalRounds} rounds!
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            <span className="text-xs uppercase font-bold text-amber-800 tracking-wider">
              Round {roundNumber} of {totalRounds} Complete
            </span>
            <h2 className="text-2xl font-bold text-stone-900">
              Current Standings
            </h2>
            <p className="text-xs text-stone-600">
              Scores have been updated with points earned in this round.
            </p>
          </div>
        )}
      </div>

      {/* Leaderboard Table */}
      <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-xs space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-stone-600 px-2">
          Rankings & Points
        </h3>

        <div className="space-y-2">
          {sortedPlayers.map((player, idx) => {
            const isFirst = idx === 0;
            const isSecond = idx === 1;
            const isThird = idx === 2;

            return (
              <div
                key={player.id}
                className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                  isFirst
                    ? "bg-amber-50/80 border-amber-300 shadow-xs"
                    : "bg-stone-50/70 border-stone-200"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 text-center font-black text-sm">
                    {isFirst ? (
                      <Crown className="w-5 h-5 text-amber-600 mx-auto" />
                    ) : isSecond ? (
                      <span className="text-stone-400">#2</span>
                    ) : isThird ? (
                      <span className="text-stone-400">#3</span>
                    ) : (
                      <span className="text-stone-400 font-medium text-xs">#{idx + 1}</span>
                    )}
                  </div>
                  <span className="text-2xl p-1 bg-white rounded-lg shadow-2xs border border-stone-200">
                    {player.avatar}
                  </span>
                  <div>
                    <div className="font-bold text-sm text-stone-900 flex items-center gap-1.5">
                      {player.name}
                      {player.isHost && (
                        <span className="text-[10px] bg-stone-200 text-stone-700 px-1 rounded-sm">
                          Host
                        </span>
                      )}
                    </div>
                    {player.lastRoundScore !== undefined && (
                      <div className="text-[11px] font-semibold text-emerald-700">
                        +{player.lastRoundScore} pts this round
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-lg font-black text-stone-900">
                    {player.score}
                  </div>
                  <div className="text-[10px] text-stone-600 uppercase font-semibold">
                    Total Points
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Action Footer */}
      <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        {isGameOver ? (
          <>
            <button
              onClick={() => gameHandler.resetToLobby()}
              className="w-full sm:w-auto px-5 py-3 rounded-xl border border-stone-300 bg-white hover:bg-stone-50 text-stone-700 font-bold text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              Return to Lobby
            </button>
            <button
              onClick={() => {
                gameHandler.resetToLobby();
                gameHandler.startGame();
              }}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-sm transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-white" />
              Play Another Match
            </button>
          </>
        ) : (
          <>
            <div className="text-xs text-stone-600 text-center sm:text-left">
              Next round will randomize new audio clips from the pool for each player!
            </div>
            <button
              onClick={() => gameHandler.nextRound()}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-sm transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Next Round ({roundNumber + 1}/{totalRounds})</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </>
        )}
      </div>
    </div>
  );
};
