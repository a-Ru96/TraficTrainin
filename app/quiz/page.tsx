"use client";
import { useEffect, useState } from "react";
import { useApp } from "@/components/AppProvider";
import { CatPicker } from "@/components/CatPicker";
import { Sign } from "@/components/Sign";
import { buildQuiz, Question } from "@/lib/deck";
import { CatKey } from "@/lib/signs";

type Phase = "pick" | "play" | "done";

export default function Quiz() {
  const { submitResult, addXp } = useApp();
  const [phase, setPhase] = useState<Phase>("pick");
  const [cat, setCat] = useState<CatKey | "all">("all");
  const [qs, setQs] = useState<Question[]>([]);
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [xpGain, setXpGain] = useState(0);
  const [missed, setMissed] = useState<Question[]>([]);

  useEffect(() => {
    const k = new URLSearchParams(location.search).get("kat") as CatKey | null;
    if (k) setCat(k);
  }, []);

  const start = (c = cat) => {
    setQs(buildQuiz(c, 10)); setI(0); setPicked(null); setScore(0); setCombo(0); setXpGain(0); setMissed([]); setPhase("play");
  };

  const q = qs[i];

  const choose = (n: number) => {
    if (picked !== null || !q) return;
    setPicked(n);
    if (n === q.answer) {
      const nc = combo + 1;
      const gain = 10 + Math.min(nc - 1, 5) * 2;
      setScore((s) => s + 1); setCombo(nc); setXpGain((x) => x + gain); addXp(gain);
    } else {
      setCombo(0); setMissed((m) => [...m, q]);
    }
  };

  const next = () => {
    if (i + 1 >= qs.length) {
      const bonus = score === qs.length ? 20 : 0; // perfect score bonus
      setXpGain((x) => x + bonus);
      // XP was already added per question; only save the bonus and result
      submitResult("quiz-" + cat, score, qs.length, bonus);
      setPhase("done");
    } else { setI(i + 1); setPicked(null); }
  };

  // keyboard: 1-4 to answer, Enter for next
  useEffect(() => {
    if (phase !== "play") return;
    const h = (e: KeyboardEvent) => {
      if (picked === null && /^[1-4]$/.test(e.key)) choose(Number(e.key) - 1);
      else if (picked !== null && e.key === "Enter") next();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  });

  if (phase === "pick") {
    return (
      <>
        <div className="page-head">
          <h1>Quick quiz</h1>
          <p className="muted">Choose a topic and answer ten questions. Consecutive correct answers build a combo for bonus XP.</p>
        </div>
        <CatPicker value={cat} onChange={setCat} />
        <div style={{ marginTop: 20 }}>
          <button className="btn btn-lg" onClick={() => start()}>Start quiz</button>
        </div>
      </>
    );
  }

  if (phase === "done") {
    const pct = Math.round((score / qs.length) * 100);
    return (
      <div className="card" style={{ textAlign: "center", marginTop: 10 }}>
        <div className="eyebrow">Round complete</div>
        <div className="score-big">{score}/{qs.length}</div>
        <h2>{pct === 100 ? "Flawless round" : pct >= 70 ? "Strong result" : pct >= 40 ? "Getting there" : "Worth another pass"}</h2>
        <p className="muted">You earned <b style={{ color: "var(--ok)" }}>+{xpGain} XP</b> this round.</p>
        {missed.length > 0 && (
          <div className="miss">
            <b style={{ fontSize: ".85rem" }}>Review these</b>
            {missed.map((m) => <div key={m.id}>{m.explain}</div>)}
          </div>
        )}
        <div className="row center" style={{ marginTop: 22 }}>
          <button className="btn" onClick={() => start()}>Play again</button>
          <button className="btn btn-ghost" onClick={() => setPhase("pick")}>Change topic</button>
        </div>
      </div>
    );
  }

  const signOpts = q.options.some((o) => o.signId);
  return (
    <>
      <div className="q-head">
        <span>Question {i + 1} of {qs.length}</span>
        {combo >= 2 && <span className="combo">{combo}x combo</span>}
        <span>{score} correct</span>
      </div>
      <div className="progress"><i style={{ width: `${(i / qs.length) * 100}%` }} /></div>
      <div className="card q-card" key={q.id + i} style={{ marginTop: 14 }}>
        {q.signId && <div className="q-sign"><Sign id={q.signId} size={150} /></div>}
        <h2 style={{ marginTop: 8 }}>{q.prompt}</h2>
        <div className={`opts ${signOpts ? "signs" : ""}`}>
          {q.options.map((o, n) => {
            const state = picked === null ? "" : n === q.answer ? "ok" : n === picked ? "bad" : "dim";
            return (
              <button key={n} className={`opt ${state}`} disabled={picked !== null} onClick={() => choose(n)}>
                <span className="key">{n + 1}</span>
                {o.signId ? <Sign id={o.signId} size={88} label={`Option ${n + 1}`} /> : <span>{o.label}</span>}
              </button>
            );
          })}
        </div>
        {picked !== null && (
          <>
            <div className={`explain ${picked === q.answer ? "good" : "nope"}`} aria-live="polite">
              <b>{picked === q.answer ? "Correct" : "Not quite"}</b><br />{q.explain}
            </div>
            <div className="row center" style={{ marginTop: 18 }}>
              <button className="btn btn-lg" autoFocus onClick={next}>{i + 1 >= qs.length ? "See results" : "Next question"}<kbd>Enter</kbd></button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
