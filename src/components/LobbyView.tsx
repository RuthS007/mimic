import React, { useState, useRef } from "react";
import {
  Upload,
  Music,
  Trash2,
  Play,
  Pause,
  Plus,
  RefreshCw,
  Copy,
  Check,
  Users,
  Sparkles,
  Sliders,
  Mic,
  Bot,
  Shuffle,
  Volume2,
  FileAudio,
  AlertCircle,
} from "lucide-react";
import { RoomState, AudioClip } from "../types";
import { GameStateHandler } from "../services/GameStateHandler";
import { AudioClipManager } from "../services/AudioClipManager";

interface LobbyViewProps {
  roomState: RoomState;
  gameHandler: GameStateHandler;
  currentPlayerId: string;
}

export const LobbyView: React.FC<LobbyViewProps> = ({
  roomState,
  gameHandler,
  currentPlayerId,
}) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessingFiles, setIsProcessingFiles] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [playingClipId, setPlayingClipId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  const currentPlayer = roomState.players.find((p) => p.id === currentPlayerId);
  const hostPlayer = roomState.players.find((p) => p.isHost);
  const isCurrentPlayerHost = Boolean(currentPlayer?.isHost);

  const [editingName, setEditingName] = useState(currentPlayer?.name || "Player");
  const [editingAvatar, setEditingAvatar] = useState(currentPlayer?.avatar || "🎙️");

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomState.roomCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const copyInviteLink = () => {
    const inviteUrl = `${window.location.origin}${window.location.pathname}?room=${roomState.roomCode}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleProfileSave = () => {
    gameHandler.updatePlayerProfile(currentPlayerId, editingName, editingAvatar);
  };

  const addSimulatedPlayer = () => {
    const bots = [
      { name: "Noisy Dave", avatar: "🦜" },
      { name: "Echo Queen", avatar: "👑" },
      { name: "Beatbox Bob", avatar: "🎧" },
      { name: "Screaming Goat", avatar: "🐐" },
      { name: "Alien Zog", avatar: "👽" },
    ];
    const available = bots.filter(
      (b) => !roomState.players.some((p) => p.name === b.name)
    );
    if (available.length > 0) {
      gameHandler.addPlayer(available[0].name, available[0].avatar);
    }
  };

  const avatars = ["🎙️", "🎭", "🦜", "👑", "🎧", "🦁", "🤖", "🚀"];

  // File Upload Handlers
  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsProcessingFiles(true);
    setUploadError(null);

    let processedCount = 0;
    let skippedNonAudio = 0;

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // Max 25MB check
        if (file.size > 25 * 1024 * 1024) {
          setUploadError(`"${file.name}" exceeds 25MB. Please upload shorter audio clips.`);
          continue;
        }

        const isAudio =
          file.type.startsWith("audio/") ||
          /\.(mp3|wav|ogg|webm|m4a|aac|flac|opus|wma|aiff|caf|m4r|3gp)$/i.test(file.name);

        if (isAudio) {
          try {
            const clip = await AudioClipManager.processUploadedFile(file);
            gameHandler.addClip(clip);
            processedCount++;
          } catch (fileErr: any) {
            console.error(`Failed to process audio file "${file.name}":`, fileErr);
            setUploadError(`Could not decode "${file.name}". Please ensure it is a valid audio file.`);
          }
        } else {
          skippedNonAudio++;
        }
      }

      if (processedCount === 0 && skippedNonAudio > 0) {
        setUploadError("Please upload audio files (MP3, WAV, WebM, OGG, M4A, AAC, FLAC, etc.).");
      }
    } catch (err: any) {
      console.error("Error processing audio files:", err);
      setUploadError("Failed to upload audio file. Please try a different audio format.");
    } finally {
      setIsProcessingFiles(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const playPreview = (clip: AudioClip) => {
    if (playingClipId === clip.id) {
      audioPlayerRef.current?.pause();
      setPlayingClipId(null);
      return;
    }

    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
    }

    const audio = new Audio(clip.url);
    audioPlayerRef.current = audio;
    setPlayingClipId(clip.id);

    audio.onended = () => {
      setPlayingClipId(null);
    };

    audio.onerror = () => {
      setPlayingClipId(null);
    };

    audio.play().catch((err) => {
      console.warn("Audio play prevented:", err);
      setPlayingClipId(null);
    });
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="bg-stone-900 text-stone-100 rounded-2xl p-6 sm:p-8 shadow-sm relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-semibold tracking-wide uppercase mb-3">
              <Shuffle className="w-3.5 h-3.5" />
              Randomized Audio Mimicry Party Game
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Echo Match
            </h1>
            <p className="text-stone-300 text-sm mt-1.5 max-w-xl leading-relaxed">
              Upload custom sound clips before the game starts. When the match begins, clips are randomized to each player, and everyone takes turns mimicking their assigned audio!
            </p>
          </div>

          {/* Room Code & Invite Card */}
          <div className="bg-stone-800/90 border border-stone-700/80 rounded-2xl p-4 flex flex-col items-center min-w-[200px] gap-2.5">
            <div className="text-center">
              <span className="text-[10px] font-bold tracking-widest text-stone-400 uppercase block">
                Lobby Room Code
              </span>
              <span className="text-3xl font-mono font-black text-amber-400 tracking-wider">
                {roomState.roomCode}
              </span>
            </div>

            <div className="flex flex-col w-full gap-1.5">
              <div className="flex items-center gap-1.5 w-full">
                <button
                  onClick={copyRoomCode}
                  className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold text-stone-200 hover:text-white bg-stone-700 hover:bg-stone-600 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                  title="Copy room code to clipboard"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode ? "Copied Code!" : "Copy Code"}</span>
                </button>

                <button
                  onClick={copyInviteLink}
                  className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold text-stone-200 hover:text-white bg-stone-700 hover:bg-stone-600 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                  title="Copy invite URL to share with friends"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Sparkles className="w-3.5 h-3.5 text-amber-400" />}
                  <span>{copiedLink ? "Link Copied!" : "Invite Link"}</span>
                </button>
              </div>

              <button
                onClick={() => gameHandler.leaveRoom()}
                className="w-full text-center text-[11px] text-stone-400 hover:text-stone-200 py-1 transition-colors hover:underline cursor-pointer"
              >
                ← Switch or Join Another Room
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* AUDIO CLIPS POOL & UPLOAD SECTION */}
      <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Music className="w-4 h-4 text-amber-600" />
              <h2 className="text-lg font-bold text-stone-900">
                Pre-Game Audio Clip Pool ({roomState.clipPool.length})
              </h2>
            </div>
            <p className="text-xs text-stone-500 mt-0.5">
              Upload audio clips for the match. When game starts, each player is assigned a randomized sound to mimic.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => gameHandler.reloadPresets()}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-700 transition-colors cursor-pointer"
              title="Reset with hilarious synthesized presets"
            >
              <RefreshCw className="w-3 h-3 text-amber-600" />
              Reset Presets
            </button>

            {roomState.clipPool.length > 0 && (
              <button
                onClick={() => gameHandler.clearAllClips()}
                className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-rose-200 hover:bg-rose-50 text-rose-700 transition-colors cursor-pointer"
                title="Clear all clips"
              >
                <Trash2 className="w-3 h-3" />
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Upload Error Banner */}
        {uploadError && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between text-xs text-rose-800 animate-fadeIn">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span className="font-medium">{uploadError}</span>
            </div>
            <button
              onClick={() => setUploadError(null)}
              className="text-rose-500 hover:text-rose-800 font-bold ml-3 px-1 cursor-pointer"
              title="Dismiss"
            >
              ✕
            </button>
          </div>
        )}

        {/* Drag & Drop Upload Zone */}
        <div
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-2 ${
            isDragging
              ? "border-amber-500 bg-amber-50/70 scale-[1.01]"
              : "border-stone-300 hover:border-amber-400 bg-stone-50/60 hover:bg-amber-50/30"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*,.mp3,.wav,.ogg,.webm,.m4a,.aac,.flac,.opus,.wma,.aiff,.caf,.m4r,.3gp"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />

          <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shadow-xs">
            {isProcessingFiles ? (
              <RefreshCw className="w-6 h-6 animate-spin text-amber-600" />
            ) : (
              <Upload className="w-6 h-6 text-amber-700" />
            )}
          </div>

          <div>
            <span className="font-bold text-sm text-stone-800">
              {isProcessingFiles
                ? "Processing and decoding audio files..."
                : "Drop audio files here or click to browse"}
            </span>
            <p className="text-xs text-stone-500 mt-1">
              Supports MP3, WAV, WebM, OGG, M4A clips (1-10 seconds recommended)
            </p>
          </div>

          <div className="mt-1 flex flex-wrap items-center justify-center gap-1.5 text-[11px] text-stone-500">
            <span className="bg-white px-2 py-0.5 rounded border border-stone-200 font-medium">
              ✨ Automatic Waveform Extraction
            </span>
            <span className="bg-white px-2 py-0.5 rounded border border-stone-200 font-medium">
              🎲 Randomized to Players
            </span>
            <span className="bg-white px-2 py-0.5 rounded border border-stone-200 font-medium">
              🔁 Turn-by-Turn Mimicry
            </span>
          </div>
        </div>

        {/* Loaded Clips List */}
        {roomState.clipPool.length === 0 ? (
          <div className="text-center py-6 text-stone-400 text-xs">
            No audio clips loaded yet. Upload your own audio files or click "Reset Presets" above!
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1">
            {roomState.clipPool.map((clip, idx) => {
              const isPlaying = playingClipId === clip.id;
              return (
                <div
                  key={clip.id}
                  className={`p-3 rounded-xl border transition-all flex flex-col justify-between gap-2.5 ${
                    isPlaying
                      ? "bg-amber-50/80 border-amber-400 shadow-xs"
                      : "bg-stone-50/80 border-stone-200 hover:border-stone-300"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <button
                        onClick={() => playPreview(clip)}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                          isPlaying
                            ? "bg-amber-600 text-white shadow-xs"
                            : "bg-white border border-stone-200 text-stone-700 hover:bg-amber-100 hover:text-amber-800"
                        }`}
                        title={isPlaying ? "Pause audio" : "Play preview"}
                      >
                        {isPlaying ? (
                          <Pause className="w-4 h-4 fill-white" />
                        ) : (
                          <Play className="w-4 h-4 fill-current ml-0.5" />
                        )}
                      </button>

                      <div className="truncate">
                        <span className="font-bold text-xs text-stone-900 block truncate" title={clip.name}>
                          {clip.name}
                        </span>
                        <span className="text-[10px] text-stone-500 font-medium">
                          {clip.durationSeconds}s duration
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => gameHandler.removeClip(clip.id)}
                      className="p-1 rounded-md text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
                      title="Remove clip"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Waveform Peek */}
                  <div className="flex items-center gap-0.5 h-6 bg-white/70 px-2 py-1 rounded-md border border-stone-200/70 overflow-hidden">
                    {clip.waveformSamples.slice(0, 24).map((val, i) => (
                      <div
                        key={i}
                        className={`flex-1 rounded-full transition-all ${
                          isPlaying ? "bg-amber-500" : "bg-stone-400"
                        }`}
                        style={{ height: `${Math.max(15, val * 100)}%` }}
                      />
                    ))}
                  </div>

                  <div className="flex items-center justify-between text-[10px] font-semibold text-stone-500">
                    <span className="uppercase tracking-wider">Clip #{idx + 1}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded ${
                        clip.isPreset
                          ? "bg-stone-200 text-stone-700"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {clip.isPreset ? "Preset" : "Custom File"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Grid: Player Roster & Match Settings */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left 2 Cols: Player Roster */}
        <div className="md:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-600" />
                <h2 className="text-base font-bold text-stone-800">
                  Lobby Players ({roomState.players.length})
                </h2>
              </div>
              <button
                onClick={addSimulatedPlayer}
                disabled={roomState.players.length >= 6}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors cursor-pointer disabled:opacity-50"
              >
                <Bot className="w-3.5 h-3.5 text-amber-600" />
                Add Party Bot
              </button>
            </div>

            {/* Players List */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {roomState.players.map((player) => {
                const isCurrent = player.id === currentPlayerId;
                return (
                  <div
                    key={player.id}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                      isCurrent
                        ? "bg-amber-50/60 border-amber-300 shadow-xs"
                        : "bg-stone-50 border-stone-200"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl p-1 bg-white rounded-lg shadow-2xs border border-stone-200">
                        {player.avatar}
                      </span>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-sm text-stone-800">
                            {player.name}
                          </span>
                          {isCurrent && (
                            <span className="text-[10px] bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded-md font-bold">
                              YOU
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-stone-500">
                          {player.isHost ? "Host & Room Master" : "Contender"}
                        </span>
                      </div>
                    </div>
                    {player.isHost && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-stone-200 text-stone-700">
                        Host
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Customize Your Profile */}
            <div className="mt-5 pt-4 border-t border-stone-100">
              <h3 className="text-xs font-bold uppercase tracking-wide text-stone-600 mb-2.5">
                Your Player Profile
              </h3>
              <div className="flex flex-col sm:flex-row gap-3 items-center">
                <div className="flex items-center gap-1.5">
                  {avatars.map((av) => (
                    <button
                      key={av}
                      onClick={() => {
                        setEditingAvatar(av);
                        gameHandler.updatePlayerProfile(currentPlayerId, editingName, av);
                      }}
                      className={`text-xl p-1.5 rounded-lg border transition-all cursor-pointer ${
                        editingAvatar === av
                          ? "border-amber-500 bg-amber-50 shadow-xs scale-110"
                          : "border-stone-200 hover:border-stone-400 bg-white"
                      }`}
                    >
                      {av}
                    </button>
                  ))}
                </div>
                <div className="flex-1 w-full flex gap-2">
                  <input
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onBlur={handleProfileSave}
                    maxLength={18}
                    className="w-full text-sm font-medium px-3 py-2 rounded-lg border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-amber-500 bg-white"
                    placeholder="Enter your nickname"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Match Settings & Start */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-xs space-y-4">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-amber-600" />
              <h2 className="text-base font-bold text-stone-800">
                Match Settings
              </h2>
            </div>

            {/* Rounds Selector */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide text-stone-600 mb-1.5">
                Total Rounds
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3].map((num) => (
                  <button
                    key={num}
                    onClick={() => gameHandler.setTotalRounds(num)}
                    className={`py-2 text-sm font-semibold rounded-lg border transition-all cursor-pointer ${
                      roomState.currentRound.totalRounds === num
                        ? "bg-amber-500 text-white border-amber-500 shadow-xs"
                        : "bg-white text-stone-700 border-stone-300 hover:bg-stone-50"
                    }`}
                  >
                    {num} {num === 1 ? "Round" : "Rounds"}
                  </button>
                ))}
              </div>
            </div>

            {/* Similarity Engine Mode */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide text-stone-600 mb-1.5">
                Similarity Engine
              </label>
              <div className="space-y-2">
                <button
                  onClick={() => gameHandler.setScoringEngine("GEMINI_MULTIMODAL")}
                  className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer ${
                    roomState.scoringEngine === "GEMINI_MULTIMODAL"
                      ? "bg-amber-50 border-amber-400 ring-1 ring-amber-400 shadow-2xs"
                      : "bg-stone-50 border-stone-200 hover:bg-stone-100"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-stone-800 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                      Option B: Gemini Multimodal
                    </span>
                    <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-sm bg-amber-200 text-amber-900">
                      AI Judge
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-500 mt-1">
                    Direct audio analysis via Gemini Flash with hilarious party critique and cadence evaluation.
                  </p>
                </button>

                <button
                  onClick={() => gameHandler.setScoringEngine("MEYDA_MFCC_DTW")}
                  className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer ${
                    roomState.scoringEngine === "MEYDA_MFCC_DTW"
                      ? "bg-amber-50 border-amber-400 ring-1 ring-amber-400 shadow-2xs"
                      : "bg-stone-50 border-stone-200 hover:bg-stone-100"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-stone-800 flex items-center gap-1.5">
                      <Mic className="w-3.5 h-3.5 text-blue-600" />
                      Option A: Meyda MFCC + DTW
                    </span>
                    <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-sm bg-blue-100 text-blue-800">
                      Client-Side
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-500 mt-1">
                    Instant in-browser Web Audio spectral feature extraction with Dynamic Time Warping alignment.
                  </p>
                </button>
              </div>
            </div>

            {/* Start Game Action */}
            <div className="pt-2">
              {isCurrentPlayerHost ? (
                <>
                  <button
                    onClick={() => gameHandler.startGame()}
                    className="w-full py-3.5 px-4 bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer text-sm"
                  >
                    <Shuffle className="w-4 h-4 fill-white" />
                    Randomize & Start ({roomState.players.length} Players)
                  </button>
                  <p className="text-[11px] text-stone-500 mt-2 text-center">
                    Clips from the pool will be shuffled and assigned to each player!
                  </p>
                </>
              ) : (
                <div className="p-4 bg-amber-50/80 border border-amber-200/80 rounded-xl text-center space-y-1">
                  <div className="flex items-center justify-center gap-2 text-amber-800 text-xs font-bold">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    <span>Waiting for Host to Start Match</span>
                  </div>
                  <p className="text-[11px] text-stone-600">
                    Host <strong>{hostPlayer?.name || "Host"}</strong> controls the start. You can upload more sounds to the pool above!
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
