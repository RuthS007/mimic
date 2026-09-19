import React, { useState, useEffect } from "react";
import {
  Mic,
  Users,
  Sparkles,
  ArrowRight,
  LogIn,
  PlusCircle,
  AlertCircle,
  Radio,
  Volume2,
  Gamepad2,
} from "lucide-react";

interface RoomEntryViewProps {
  onJoinRoom: (roomCode: string, playerName: string, avatar: string) => Promise<void>;
  onCreateRoom: (hostName: string, avatar: string, customRoomCode?: string) => Promise<void>;
  initialRoomCode?: string;
  isConnecting: boolean;
  errorMsg: string | null;
  onClearError: () => void;
}

const DEFAULT_AVATARS = [
  "🎙️", "🎭", "🦜", "👑", "🎧", "🦁", "🤖", "🚀", "🐱", "🦊", "🍕", "🎸",
];

const RANDOM_NAMES = [
  "VocalViper",
  "EchoEcho",
  "PitchPerfect",
  "SoundHound",
  "MimicMaster",
  "SonicBoom",
  "DecibelDan",
  "FrequencyFaye",
];

export const RoomEntryView: React.FC<RoomEntryViewProps> = ({
  onJoinRoom,
  onCreateRoom,
  initialRoomCode = "",
  isConnecting,
  errorMsg,
  onClearError,
}) => {
  // Default to HOST if no invite code in URL, so creators can make a room instantly
  const [activeTab, setActiveTab] = useState<"HOST" | "JOIN">(
    initialRoomCode ? "JOIN" : "HOST"
  );
  const [roomCode, setRoomCode] = useState(initialRoomCode.toUpperCase());
  const [customHostCode, setCustomHostCode] = useState("");
  const [playerName, setPlayerName] = useState(() => {
    return RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)];
  });
  const [selectedAvatar, setSelectedAvatar] = useState(DEFAULT_AVATARS[0]);
  const [serverOnline, setServerOnline] = useState<boolean | null>(null);

  // Check server health on mount
  useEffect(() => {
    fetch("/api/health")
      .then((res) => res.json())
      .then(() => setServerOnline(true))
      .catch(() => setServerOnline(false));
  }, []);

  // Update room code if initialRoomCode changes (e.g. from invite link)
  useEffect(() => {
    if (initialRoomCode) {
      setRoomCode(initialRoomCode.toUpperCase());
      setActiveTab("JOIN");
    }
  }, [initialRoomCode]);

  const handleRoomCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onClearError();
    let val = e.target.value.toUpperCase().replace(/\s+/g, "");
    setRoomCode(val);
  };

  const handleCustomHostCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onClearError();
    let val = e.target.value.toUpperCase().replace(/\s+/g, "");
    setCustomHostCode(val);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    onClearError();

    const name = playerName.trim() || "Player";

    if (activeTab === "JOIN") {
      let code = roomCode.trim().toUpperCase();
      if (!code) return;
      if (!code.startsWith("ECHO-") && /^\d{4}$/.test(code)) {
        code = `ECHO-${code}`;
      }
      await onJoinRoom(code, name, selectedAvatar);
    } else {
      await onCreateRoom(name, selectedAvatar, customHostCode.trim() || undefined);
    }
  };

  const switchToCreateWithCode = (code: string) => {
    setCustomHostCode(code);
    setActiveTab("HOST");
    onClearError();
  };

  return (
    <div className="w-full max-w-lg mx-auto py-8 sm:py-12 px-4">
      {/* Brand Header */}
      <div className="text-center mb-8 space-y-2">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-600 text-white shadow-sm mb-3">
          <Mic className="w-7 h-7" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-stone-900">
          Echo Match
        </h1>
        <p className="text-stone-600 text-sm max-w-sm mx-auto leading-relaxed">
          The multiplayer audio mimicry party game. Upload sound clips, randomize them across players, and take turns imitating them!
        </p>
      </div>

      {/* Main Entry Card */}
      <div className="bg-white rounded-3xl border border-stone-200 shadow-sm p-6 sm:p-8 space-y-6">
        {/* Server Status & Mode Selector Tabs */}
        <div className="flex items-center justify-between gap-2 pb-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
            Multiplayer Lobby
          </span>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold">
            {serverOnline === true ? (
              <span className="inline-flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Server Online
              </span>
            ) : serverOnline === false ? (
              <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                Checking Server...
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-stone-500 bg-stone-50 px-2 py-0.5 rounded-full border border-stone-200">
                Connecting...
              </span>
            )}
          </div>
        </div>

        {/* Mode Selector Tabs */}
        <div className="grid grid-cols-2 p-1 bg-stone-100 rounded-xl border border-stone-200/80">
          <button
            type="button"
            onClick={() => {
              setActiveTab("HOST");
              onClearError();
            }}
            className={`py-2.5 px-4 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === "HOST"
                ? "bg-white text-stone-900 shadow-xs border border-stone-200/60"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            <PlusCircle className="w-4 h-4 text-amber-600" />
            Host New Room
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("JOIN");
              onClearError();
            }}
            className={`py-2.5 px-4 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === "JOIN"
                ? "bg-white text-stone-900 shadow-xs border border-stone-200/60"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            <LogIn className="w-4 h-4 text-amber-600" />
            Join with Code
          </button>
        </div>

        {/* Invite link notice */}
        {initialRoomCode && activeTab === "JOIN" && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center gap-2">
            <Radio className="w-4 h-4 text-amber-600 shrink-0 animate-pulse" />
            <span>
              Invited to room <strong className="font-mono">{initialRoomCode}</strong>! Choose your nickname to jump in.
            </span>
          </div>
        )}

        {/* Error Callout */}
        {errorMsg && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1 space-y-1">
              <strong className="font-semibold block">Could not connect to room</strong>
              <p>{errorMsg}</p>
              {activeTab === "JOIN" && roomCode && (
                <button
                  type="button"
                  onClick={() => switchToCreateWithCode(roomCode)}
                  className="mt-1 text-[11px] font-bold text-amber-700 hover:text-amber-800 underline block cursor-pointer"
                >
                  👉 Create "{roomCode}" as a new room instead?
                </button>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Host Mode: Custom Room Code (Optional) */}
          {activeTab === "HOST" && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700">
                  Room Code (Optional)
                </label>
                <span className="text-[10px] text-stone-400 font-medium">
                  Auto-generates if empty
                </span>
              </div>
              <input
                type="text"
                value={customHostCode}
                onChange={handleCustomHostCodeChange}
                placeholder="Leave blank for auto-code, or e.g. 7777 / PARTY"
                maxLength={12}
                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-sm font-mono font-bold tracking-wider text-stone-900 placeholder:text-stone-400 placeholder:font-sans placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 transition-colors uppercase"
              />
              <p className="text-[11px] text-stone-500">
                You can specify a friendly code (e.g. "8888") or leave blank for an auto-generated ECHO-XXXX code.
              </p>
            </div>
          )}

          {/* Join Mode: Room Code Input */}
          {activeTab === "JOIN" && (
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700">
                Room Code
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={roomCode}
                  onChange={handleRoomCodeChange}
                  placeholder="e.g. ECHO-4821 or 4821"
                  required
                  maxLength={12}
                  className="w-full px-4 py-3 bg-stone-50 border border-stone-300 rounded-xl text-base font-mono font-bold tracking-wider text-stone-900 placeholder:text-stone-400 placeholder:font-sans placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 transition-colors uppercase"
                />
              </div>
              <p className="text-[11px] text-stone-500">
                Enter the code provided by the game host.
              </p>
            </div>
          )}

          {/* Nickname Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-700">
              {activeTab === "HOST" ? "Host Nickname" : "Your Nickname"}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Enter your nickname"
                required
                maxLength={20}
                className="flex-1 px-4 py-3 bg-stone-50 border border-stone-300 rounded-xl text-sm font-semibold text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 transition-colors"
              />
              <button
                type="button"
                onClick={() => {
                  const random = RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)];
                  setPlayerName(random);
                }}
                className="px-3 py-2 bg-stone-100 hover:bg-stone-200 border border-stone-200 rounded-xl text-xs font-medium text-stone-700 transition-colors cursor-pointer"
                title="Generate Random Name"
              >
                🎲 Random
              </button>
            </div>
          </div>

          {/* Avatar Selection */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-700">
              Choose Avatar
            </label>
            <div className="grid grid-cols-6 gap-2">
              {DEFAULT_AVATARS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setSelectedAvatar(emoji)}
                  className={`h-11 rounded-xl text-xl flex items-center justify-center transition-all cursor-pointer ${
                    selectedAvatar === emoji
                      ? "bg-amber-100 border-2 border-amber-600 scale-105 shadow-xs"
                      : "bg-stone-50 hover:bg-stone-100 border border-stone-200 text-stone-700"
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isConnecting || (activeTab === "JOIN" && !roomCode.trim())}
            className="w-full mt-2 py-3.5 px-6 rounded-xl font-bold text-sm text-white bg-amber-600 hover:bg-amber-700 active:bg-amber-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
          >
            {isConnecting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>
                  {activeTab === "HOST" ? "Creating Room on Server..." : "Connecting to Lobby..."}
                </span>
              </>
            ) : activeTab === "HOST" ? (
              <>
                <Gamepad2 className="w-4 h-4" />
                <span>Create Room on Server</span>
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>Enter Room & Join Match</span>
              </>
            )}
          </button>
        </form>

        {/* Quick Instructions Footer */}
        <div className="pt-4 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-500">
          <span>🎮 Web Audio & Mic Mimicry</span>
          <span>⚡ Real-Time Multiplayer</span>
        </div>
      </div>
    </div>
  );
};
