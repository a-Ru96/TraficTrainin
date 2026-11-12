"use client";
import { useMemo } from "react";

const COLORS = ["#ff3d9a", "#b6ff3b", "#2ee6ff", "#ffd23f", "#7c4dff"];

export function Confetti({ count = 60 }: { count?: number }) {
  const items = useMemo(
    () => Array.from({ length: count }, (_, i) => ({
      left: Math.random() * 100,
      delay: Math.random() * 0.7,
      dur: 2 + Math.random() * 1.6,
      color: COLORS[i % COLORS.length],
      w: 6 + Math.random() * 8,
      rot: Math.random() * 360,
    })),
    [count]
  );
  return (
    <div className="confetti" aria-hidden>
      {items.map((c, i) => (
        <i key={i} style={{ left: `${c.left}%`, background: c.color, width: c.w, height: c.w * 1.6,
          animationDelay: `${c.delay}s`, animationDuration: `${c.dur}s`, transform: `rotate(${c.rot}deg)` }} />
      ))}
    </div>
  );
}
