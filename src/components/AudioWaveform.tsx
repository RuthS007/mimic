import React, { useEffect, useRef, useState } from "react";
import { Play, Pause, Volume2 } from "lucide-react";

interface AudioWaveformProps {
  samples: number[];
  audioUrl?: string;
  isLive?: boolean;
  liveLevel?: number;
  barColor?: string;
  activeColor?: string;
  height?: number;
  label?: string;
}

export const AudioWaveform: React.FC<AudioWaveformProps> = ({
  samples,
  audioUrl,
  isLive = false,
  liveLevel = 0,
  barColor = "bg-stone-300",
  activeColor = "bg-amber-600",
  height = 48,
  label,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!audioUrl) return;
    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    audio.ontimeupdate = () => {
      if (audio.duration) {
        setPlaybackProgress(audio.currentTime / audio.duration);
      }
    };

    audio.onended = () => {
      setIsPlaying(false);
      setPlaybackProgress(0);
    };

    return () => {
      audio.pause();
      audioRef.current = null;
    };
  }, [audioUrl]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.currentTime = 0;
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  // Generate fallback bars if samples are empty
  const displaySamples =
    samples.length > 0
      ? samples
      : Array.from({ length: 32 }, (_, i) => 0.15 + 0.3 * Math.sin(i * 0.4));

  return (
    <div className="w-full bg-stone-100 rounded-xl p-3.5 border border-stone-200 shadow-xs">
      <div className="flex items-center justify-between gap-3 mb-2">
        {label && (
          <span className="text-xs font-semibold tracking-wide uppercase text-stone-600 flex items-center gap-1.5">
            <Volume2 className="w-3.5 h-3.5 text-amber-600" />
            {label}
          </span>
        )}
        {audioUrl && (
          <button
            onClick={togglePlay}
            className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-white hover:bg-stone-50 border border-stone-200 text-stone-800 transition-colors shadow-2xs cursor-pointer"
          >
            {isPlaying ? (
              <>
                <Pause className="w-3 h-3 text-amber-600 fill-amber-600" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-3 h-3 text-amber-600 fill-amber-600" />
                <span>Listen</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Waveform Visualization Bars */}
      <div
        className="flex items-center justify-between gap-1 w-full px-1 overflow-hidden"
        style={{ height: `${height}px` }}
      >
        {displaySamples.map((sample, idx) => {
          const progressIndex = idx / displaySamples.length;
          const isPassed = !isLive && isPlaying && progressIndex <= playbackProgress;

          // Live audio input dynamic height
          const barHeight = isLive
            ? Math.max(8, Math.min(100, Math.floor(liveLevel * 100 * (0.6 + 0.8 * Math.sin(idx * 0.5)))))
            : Math.max(8, Math.floor(sample * 100));

          return (
            <div
              key={idx}
              className={`w-full rounded-full transition-all duration-75 ${
                isLive
                  ? liveLevel > 0.05
                    ? "bg-amber-500"
                    : "bg-stone-300"
                  : isPassed
                  ? activeColor
                  : barColor
              }`}
              style={{ height: `${barHeight}%` }}
            />
          );
        })}
      </div>
    </div>
  );
};
