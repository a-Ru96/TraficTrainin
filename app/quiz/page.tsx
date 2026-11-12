"use client";
import { useEffect, useState } from "react";
import { useApp } from "@/components/AppProvider";
import { CatPicker } from "@/components/CatPicker";
import { Confetti } from "@/components/Confetti";
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

  if (phase === "pick") {
    return (
      <>
        <div className="page-title"><h1 style={{ fontSize: "2rem", margin: 0 }}>⚡ Quick Quiz</h1></div>
        <p className="muted">Pick a topic and answer 10 questions. Chain correct answers for combo bonus XP!</p>
        <CatPicker value={cat} onChange={setCat} />
        <div className="row center" style={{ marginTop: 24 }}>
          <button className="btn btn-lime btn-lg" onClick={() => start()}>🚀 Start</button>
        </div>
      </>
    );
  }

  if (phase === "done") {
    const pct = Math.round((score / qs.length) * 100);
    return (
      <div className="card" style={{ textAlign: "center", marginTop: 10 }}>
        {pct >= 70 && <Confetti />}
        <div style={{ fontSize: "3.4rem" }}>{pct === 100 ? "🏆" : pct >= 70 ? "🔥" : pct >= 40 ? "💪" : "📚"}</div>
        <div className="score-big">{score}/{qs.length}</div>
        <h2>{pct === 100 ? "Flawless! Legend!" : pct >= 70 ? "You're on fire!" : pct >= 40 ? "Not bad, keep going!" : "Review the cards and try again!"}</h2>
        <p className="muted">You earned <b style={{ color: "var(--lime)" }}>+{xpGain} XP</b> this round.</p>
        {missed.length > 0 && (
          <div className="miss">
            <b>Missed:</b>
            {missed.map((m) => <div key={m.id}>{m.explain}</div>)}
          </div>
        )}
        <div className="row center" style={{ marginTop: 20 }}>
          <button className="btn btn-lime" onClick={() => start()}>🔁 Play again</button>
          <button className="btn btn-ghost" onClick={() => setPhase("pick")}>Change topic</button>
        </div>
      </div>
    );
  }

  const signOpts = q.options.some((o) => o.signId);
  return (
    <>
      <div className="q-head">
        <span>Question {i + 1}/{qs.length}</span>
        {combo >= 2 && <span className="combo">🔥 x{combo} combo</span>}
        <span style={{ color: "var(--lime)" }}>✔ {score}</span>
      </div>
      <div className="progress"><i style={{ width: `${(i / qs.length) * 100}%` }} /></div>
      <div className="card q-card" key={q.id + i} style={{ marginTop: 14 }}>
        {q.signId && <div className="q-sign"><Sign id={q.signId} size={170} /></div>}
        <h2 style={{ marginTop: 8 }}>{q.prompt}</h2>
        <div className={`opts ${signOpts ? "signs" : ""}`}>
          {q.options.map((o, n) => {
            const state = picked === null ? "" : n === q.answer ? "ok" : n === picked ? "bad" : "dim";
            return (
              <button key={n} className={`opt ${state}`} disabled={picked !== null} onClick={() => choose(n)}>
                {o.signId ? <Sign id={o.signId} size={96} label={`Option ${n + 1}`} /> : o.label}
              </button>
            );
          })}
        </div>
        {picked !== null && (
          <>
            <div className={`explain ${picked === q.answer ? "good" : "nope"}`} aria-live="polite">
              <b>{picked === q.answer ? "Correct! 🎉" : "Nope 😬"}</b><br />{q.explain}
            </div>
            <div className="row center" style={{ marginTop: 16 }}>
              <button className="btn btn-cyan btn-lg" autoFocus onClick={next}>{i + 1 >= qs.length ? "See results 🏁" : "Next →"}</button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
