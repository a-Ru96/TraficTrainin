import { FRAMES, SIGN_MAP } from "@/lib/signs";

// The viewBox has padding so strokes, joins and the drop shadow are never clipped.
export function Sign({ id, size = 96, label, className }: { id: string; size?: number; label?: string; className?: string }) {
  const s = SIGN_MAP[id];
  if (!s) return null;
  return (
    <svg
      viewBox="-6 -6 112 118" width={size} height={size * (118 / 112)} className={`sign ${className ?? ""}`}
      role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true}
      overflow="visible"
    >
      <g dangerouslySetInnerHTML={{ __html: FRAMES[s.frame] + s.icon }} />
    </svg>
  );
}
