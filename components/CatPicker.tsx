"use client";
import { CATS, CatKey } from "@/lib/signs";

export function CatPicker({ value, onChange, counts }: {
  value: CatKey | "all"; onChange: (c: CatKey | "all") => void; counts?: Partial<Record<CatKey | "all", number>>;
}) {
  return (
    <div className="chips" role="tablist">
      {CATS.map((c) => (
        <button key={c.key} role="tab" aria-selected={value === c.key}
          className={`chip ${value === c.key ? "on" : ""}`} style={{ ["--c" as string]: c.color }}
          onClick={() => onChange(c.key)}>
          <i className="dot" />{c.label}
          {counts?.[c.key] !== undefined && <b>{counts[c.key]}</b>}
        </button>
      ))}
    </div>
  );
}
