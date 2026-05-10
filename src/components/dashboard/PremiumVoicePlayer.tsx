import { useEffect, useRef, useState } from "react";
import { Play, Pause, Mic } from "lucide-react";

type Props = {
  src: string;
  transcript?: string | null;
  outgoing?: boolean;
};

const formatTime = (s: number) => {
  if (!isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
};

// 28 static-ish bars, animated when playing
const BAR_COUNT = 28;
const BAR_HEIGHTS = Array.from({ length: BAR_COUNT }, (_, i) => {
  // pseudo-random but stable pattern
  const v = Math.sin(i * 1.7) * 0.5 + Math.cos(i * 0.9) * 0.5;
  return 30 + Math.abs(v) * 70; // 30%..100%
});

export function PremiumVoicePlayer({ src, transcript, outgoing }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);
  const [speed, setSpeed] = useState<1 | 1.5 | 2>(1);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onTime = () => setCurrent(a.currentTime);
    const onLoad = () => setDuration(a.duration || 0);
    const onEnd = () => {
      setPlaying(false);
      setCurrent(0);
    };
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onLoad);
    a.addEventListener("durationchange", onLoad);
    a.addEventListener("ended", onEnd);
    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onLoad);
      a.removeEventListener("durationchange", onLoad);
      a.removeEventListener("ended", onEnd);
    };
  }, []);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) {
      a.pause();
      setPlaying(false);
    } else {
      a.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    }
  };

  const cycleSpeed = () => {
    const next = speed === 1 ? 1.5 : speed === 1.5 ? 2 : 1;
    setSpeed(next);
    if (audioRef.current) audioRef.current.playbackRate = next;
  };

  const seekFromBar = (idx: number) => {
    const a = audioRef.current;
    if (!a || !duration) return;
    const ratio = idx / BAR_COUNT;
    a.currentTime = ratio * duration;
    setCurrent(a.currentTime);
  };

  const progress = duration > 0 ? current / duration : 0;
  const activeBars = Math.round(progress * BAR_COUNT);

  return (
    <div
      className={[
        "relative mb-1 max-w-[320px] overflow-hidden rounded-2xl px-3.5 py-3",
        "border border-white/10 backdrop-blur-sm",
        outgoing
          ? "bg-gradient-to-br from-emerald-500/95 via-emerald-600/95 to-teal-700/95 text-white shadow-[0_8px_24px_-8px_rgba(16,185,129,0.55)]"
          : "bg-gradient-to-br from-slate-800/95 via-slate-900/95 to-slate-950/95 text-slate-100 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.6)]",
      ].join(" ")}
    >
      {/* subtle glow accent */}
      <div className="pointer-events-none absolute -top-12 -right-12 h-32 w-32 rounded-full bg-white/10 blur-2xl" />

      {/* Header */}
      <div className="relative flex items-center gap-2 mb-2.5">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/15 backdrop-blur">
          <Mic className="h-3 w-3" />
        </div>
        <span className="text-[12px] font-semibold tracking-wide uppercase opacity-90">
          Voice Message
        </span>
        <span className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_8px_rgba(110,231,183,0.9)] animate-pulse" />
      </div>

      {/* Player row */}
      <div className="relative flex items-center gap-3">
        <button
          onClick={toggle}
          aria-label={playing ? "Pause" : "Play"}
          className={[
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
            "bg-white text-slate-900 shadow-lg transition-transform active:scale-95 hover:scale-105",
          ].join(" ")}
        >
          {playing ? <Pause className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current ml-0.5" />}
        </button>

        {/* Waveform */}
        <div className="flex h-9 flex-1 items-center gap-[2px]">
          {BAR_HEIGHTS.map((h, i) => {
            const active = i < activeBars;
            return (
              <button
                key={i}
                onClick={() => seekFromBar(i)}
                className="group flex h-full w-[3px] flex-1 items-center"
                tabIndex={-1}
              >
                <span
                  className={[
                    "block w-full rounded-full transition-all duration-150",
                    active
                      ? "bg-white"
                      : outgoing
                      ? "bg-white/35"
                      : "bg-slate-400/40",
                    playing && active ? "wa-voice-bar" : "",
                  ].join(" ")}
                  style={{
                    height: `${h}%`,
                    animationDelay: `${i * 40}ms`,
                  }}
                />
              </button>
            );
          })}
        </div>

        <button
          onClick={cycleSpeed}
          className="shrink-0 rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-bold tabular-nums hover:bg-white/25 transition"
        >
          {speed}x
        </button>
      </div>

      {/* Time */}
      <div className="relative mt-1.5 flex items-center justify-between text-[10px] font-mono tabular-nums opacity-80">
        <span>{formatTime(current)}</span>
        <span>{formatTime(duration)}</span>
      </div>

      {transcript && (
        <div className="relative mt-2.5 rounded-lg bg-black/20 px-2.5 py-1.5 border-l-2 border-white/40">
          <p className="text-[11px] leading-relaxed italic opacity-95">
            <span className="mr-1">🎙️</span>
            {transcript}
          </p>
        </div>
      )}

      <audio ref={audioRef} preload="metadata" className="hidden">
        <source src={src} type="audio/ogg" />
        <source src={src} type="audio/mpeg" />
      </audio>
    </div>
  );
}

export default PremiumVoicePlayer;
