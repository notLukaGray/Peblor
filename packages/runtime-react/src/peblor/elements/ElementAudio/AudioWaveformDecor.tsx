"use client";

import { useEffect, useState } from "react";

type Props = {
  currentTime: number;
  duration: number;
  /** Extra classes on the outer track (e.g. positioning). */
  className?: string;
};

const BAR_COUNT = 40;

/**
 * Decorative animated bars (not real spectrum). Heights use sin + currentTime.
 * Animated layer mounts after hydration so SSR + first client paint match (no float drift).
 */
export function AudioWaveformDecor({ currentTime, duration, className }: Props) {
  const [animate, setAnimate] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setAnimate(true), 0);
    return () => clearTimeout(timer);
  }, []);

  const playhead = duration > 0 ? Math.min(1, Math.max(0, currentTime / duration)) : 0;

  return (
    <div className={`w-full h-8 bg-white/10 flex items-center justify-center ${className ?? ""}`}>
      <div className="flex items-end gap-px h-5">
        {Array.from({ length: BAR_COUNT }, (_, i) => {
          if (!animate) {
            return (
              <div key={i} className="w-1 bg-white/30" style={{ height: "50%", opacity: 0.4 }} />
            );
          }
          const h = Math.max(15, Math.sin(i * 0.5 + currentTime * 2) * 40 + 50);
          const heightPct = `${Number(h.toFixed(2))}%`;
          const opacity: number = i / BAR_COUNT <= playhead ? 1 : 0.4;
          return <div key={i} className="w-1 bg-white/45" style={{ height: heightPct, opacity }} />;
        })}
      </div>
    </div>
  );
}
