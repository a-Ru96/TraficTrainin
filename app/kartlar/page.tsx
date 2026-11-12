"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useApp } from "@/components/AppProvider";
import { CatPicker } from "@/components/CatPicker";
import { Confetti } from "@/components/Confetti";
import { Sign } from "@/components/Sign";
import { ALL_CARDS, Card, deckFor } from "@/lib/deck";
import { CatKey } from "@/lib/signs";
import { shuffle } from "@/lib/util";

export default function Flashcards() {
  const { known, markCard, addXp } = useApp();
  const [cat, setCat] = useState<CatKey | "all">("all");
  const [queue, setQueue] = useState<Card[]>([]);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [learned, setLearned] = useState(0);
  const [started, setStarted] = useState(false);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: ALL_CARDS.length };
    ALL_CARDS.forEach((x) => (c[x.cat] = (c[x.cat] || 0) + 1));
    return c;
  }, []);

  const start = useCallback((c: CatKey | "all", onlyUnknown = false) => {
    let d = deckFor(c);
    if (onlyUnknown) { const u = d.filter((x) => !known[x.id]); if (u.length) d = u; }
    setQueue(shuffle(d)); setIdx(0); setFlipped(false); setLearned(0); setStarted(true);
  }, [known]);

  useEffect(() => {
    const k = new URLSearchParams(location.search).get("kat") as CatKey | null;
    if (k) setCat(k);
  }, []);
  useEffect(() => { start(cat); /* eslint-disable-next-line */ }, [cat]);

  const card = queue[idx];
  const done = started && idx >= queue.length;

  const answer = useCallback((ok: boolean) => {
    if (!card) return;
    markCard(card.id, ok);
    if (ok) { addXp(2); setLearned((n) => n + 1); }
    else if (queue.length < 80) setQueue((q) => [...q, card]); // missed cards go to the end of the queue
    setFlipped(false);
    setIdx((i) => i + 1);
  }, [card, markCard, addXp, queue.length]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (done || !card) return;
      if (e.code === "Space" || e.key === "Enter") { e.preventDefault(); setFlipped((f) => !f); }
      else if (e.key === "ArrowRight" && flipped) answer(true);
      else if (e.key === "ArrowLeft" && flipped) answer(false);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [done, card, flipped, answer]);

  const pct = queue.length ? Math.min(100, (idx / queue.length) * 100) : 0;
  const knownInCat = deckFor(cat).filter((c) => known[c.id]).length;

  return (
    <>
      <div className="page-title"><h1 style={{ fontSize: "2rem", margin: 0 }}>🃏 Flashcards</h1></div>
      <CatPicker value={cat} onChange={setCat} counts={counts} />
      <div className="row" style={{ justifyContent: "space-between", fontSize: ".85rem" }} aria-live="polite">
        <span className="muted"><span className="known-dot" /> {knownInCat}/{deckFor(cat).length} learned</span>
        <button className="btn btn-sm btn-ghost" onClick={() => start(cat)}>🔀 Shuffle</button>
      </div>
      <div className="progress" style={{ margin: "10px 0" }}><i style={{ width: `${pct}%` }} /></div>

      {done ? (
        <div className="card center" style={{ textAlign: "center", marginTop: 20 }}>
          {learned >= 5 && <Confetti />}
          <div style={{ fontSize: "3.5rem" }}>🎉</div>
          <h2>Deck complete!</h2>
          <p className="muted">You knew {learned} cards. Want to focus only on the ones you missed?</p>
          <div className="row center">
            <button className="btn btn-lime" onClick={() => start(cat, true)}>🎯 Study missed cards</button>
            <button className="btn btn-ghost" onClick={() => start(cat)}>🔁 Restart</button>
            <Link href="/quiz" className="btn btn-cyan">⚡ Go to quiz</Link>
          </div>
        </div>
      ) : card ? (
        <>
          <div className={`flip ${flipped ? "on" : ""}`} onClick={() => setFlipped((f) => !f)} tabIndex={0}
            role="button" aria-label="Flip card" key={`${card.id}-${idx}`}>
            <div className="flip-in">
              <div className="face">
                {card.signId ? <Sign id={card.signId} size={170} /> : <span className="emoji">{card.emoji}</span>}
                <div className={card.signId ? "muted" : "term"}>{card.front}</div>
                <span className="hint">Tap to flip · Space</span>
              </div>
              <div className="face back">
                {card.signId ? (
                  <>
                    <div className="term">{card.back}</div>
                    <div className="sub">{card.backSub}</div>
                    {card.tip && <div className="tip">💡 {card.tip}</div>}
                  </>
                ) : (
                  <>
                    <span className="emoji">{card.emoji}</span>
                    <div className="fact">{card.back}</div>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="row center">
            <button className="btn btn-red" disabled={!flipped} onClick={() => answer(false)}>🔁 Again <small>←</small></button>
            <button className="btn btn-lime" disabled={!flipped} onClick={() => answer(true)}>🙌 Got it <small>→</small></button>
          </div>
          <p className="muted center" style={{ textAlign: "center", marginTop: 14, fontSize: ".85rem" }}>
            Card {Math.min(idx + 1, queue.length)} / {queue.length}
          </p>
        </>
      ) : null}
    </>
  );
}
