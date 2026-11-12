"use client";
import { useEffect, useRef, useState } from "react";
import { useApp } from "@/components/AppProvider";
import { Sign } from "@/components/Sign";
import { SIGNS, SignDef } from "@/lib/signs";
import { shuffle } from "@/lib/util";

const PAIRS = 6;

function newRound() {
  const seen = new Set<string>();
  const pick = shuffle(SIGNS).filter((s) => (seen.has(s.en) ? false : (seen.add(s.en), true))).slice(0, PAIRS);
  return { left: pick, right: shuffle(pick) };
}

export default function MatchGame() {
  const { submitResult, setBest, best } = useApp();
  const [round, setRound] = useState<{ left: SignDef[]; right: SignDef[] } | null>(null);
  const [selL, setSelL] = useState<string | null>(null);
  const [selR, setSelR] = useState<string | null>(null);
  const [done, setDone] = useState<Set<string>>(new Set());
  const [flash, setFlash] = useState<{ ids: string[]; kind: "good" | "wrong" } | null>(null);
  const [time, setTime] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [finished, setFinished] = useState(false);
  const [newBest, setNewBest] = useState(false);
  const t0 = useRef(0);

  const start = () => {
    setRound(newRound()); setSelL(null); setSelR(null); setDone(new Set()); setFlash(null);
    setTime(0); setMistakes(0); setFinished(false); setNewBest(false); t0.current = Date.now();
  };
  useEffect(start, []);

  useEffect(() => {
    if (!round || finished) return;
    const t = setInterval(() => setTime(Math.floor((Date.now() - t0.current) / 1000)), 250);
    return () => clearInterval(t);
  }, [round, finished]);

  const check = (l: string, r: string) => {
    if (l === r) {
      setFlash({ ids: [l], kind: "good" });
      setTimeout(() => {
        setDone((d) => {
          const nd = new Set(d); nd.add(l);
          if (nd.size === PAIRS) {
            const secs = Math.max(1, Math.round((Date.now() - t0.current) / 1000));
            const xp = Math.max(15, 60 - secs - mistakes * 4);
            setTime(secs); setFinished(true);
            if (!best["match"] || secs < best["match"]) setNewBest(true);
            setBest("match", secs);
            submitResult("match", PAIRS - Math.min(mistakes, PAIRS), PAIRS, xp);
          }
          return nd;
        });
        setFlash(null);
      }, 350);
    } else {
      setMistakes((m) => m + 1);
      setFlash({ ids: [l, r], kind: "wrong" });
      setTimeout(() => setFlash(null), 450);
    }
    setSelL(null); setSelR(null);
  };

  const pickL = (id: string) => { setSelL(id); if (selR) check(id, selR); };
  const pickR = (id: string) => { setSelR(id); if (selL) check(selL, id); };
  const cls = (id: string, sel: string | null) =>
    `m ${sel === id ? "sel" : ""} ${done.has(id) ? "done" : ""} ${flash?.ids.includes(id) ? flash.kind : ""}`;

  if (!round) return null;
  return (
    <>
      <div className="page-head">
        <h1>Match up</h1>
        <p className="muted">Pick a sign on the left, then its meaning on the right.</p>
      </div>
      <div className="q-head">
        <span>{time}s</span>
        <span>Mistakes: {mistakes}</span>
        <span>{best["match"] ? `Best: ${best["match"]}s` : "No record yet"}</span>
      </div>
      <div className="progress"><i style={{ width: `${(done.size / PAIRS) * 100}%` }} /></div>

      {finished ? (
        <div className="card" style={{ textAlign: "center", marginTop: 16 }}>
          <div className="eyebrow">{newBest ? "New personal best" : "Round complete"}</div>
          <div className="score-big">{time}s</div>
          <p className="muted">{mistakes} {mistakes === 1 ? "mistake" : "mistakes"}. Can you go faster and cleaner?</p>
          <button className="btn btn-lg" onClick={start}>New round</button>
        </div>
      ) : (
        <div className="match">
          <div className="m-col">
            {round.left.map((s) => (
              <button key={s.id} className={cls(s.id, selL)} disabled={done.has(s.id)} onClick={() => pickL(s.id)}>
                <Sign id={s.id} size={68} />
              </button>
            ))}
          </div>
          <div className="m-col">
            {round.right.map((s) => (
              <button key={s.id} className={cls(s.id, selR)} disabled={done.has(s.id)} onClick={() => pickR(s.id)}>
                {s.en}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
