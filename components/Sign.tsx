import { FRAMES, SIGN_MAP } from "@/lib/signs";

/**
 * Renders a sign on a white tile so every sign looks consistent on the dark UI.
 * Uses the image in /public/signs when available, otherwise the SVG drawing.
 * The tile is square and the image uses object-fit: contain, so nothing is ever cropped.
 */
export function Sign({ id, size = 96, label, className }: { id: string; size?: number; label?: string; className?: string }) {
  const s = SIGN_MAP[id];
  if (!s) return null;
  const a11y = label ? { role: "img", "aria-label": label } : { "aria-hidden": true as const };
  return (
    <span className={`sign-img ${className ?? ""}`} style={{ width: size, height: size }} {...a11y}>
      {s.img ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={s.img} alt="" loading="lazy" decoding="async" draggable={false} />
      ) : (
        <svg viewBox="-4 -4 108 108" overflow="visible">
          <g dangerouslySetInnerHTML={{ __html: (s.frame ? FRAMES[s.frame] : "") + (s.icon ?? "") }} />
        </svg>
      )}
    </span>
  );
}
