import { FRAMES, SIGN_MAP } from "@/lib/signs";

export function Sign({ id, size = 96, label, className }: { id: string; size?: number; label?: string; className?: string }) {
  const s = SIGN_MAP[id];
  if (!s) return null;
  return (
    <svg
      viewBox="0 0 100 100" width={size} height={size} className={className}
      role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true}
      style={{ filter: "drop-shadow(0 6px 0 rgba(0,0,0,.28))" }}
    >
      <g dangerouslySetInnerHTML={{ __html: FRAMES[s.frame] + s.icon }} />
    </svg>
  );
}
