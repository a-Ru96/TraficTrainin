"use client";
import Link from "next/link";
import { useApp } from "@/components/AppProvider";
import { Sign } from "@/components/Sign";
import { ALL_CARDS } from "@/lib/deck";

const MODES = [
  { href: "/kartlar", emoji: "🃏", title: "Flashcards", text: "Flip, learn, repeat. Cards you miss come back around.", c: "var(--pink)" },
  { href: "/quiz", emoji: "⚡", title: "Quick Quiz", text: "10 questions, build a combo, grab bonus XP!", c: "var(--yellow)" },
  { href: "/eslestir", emoji: "🧩", title: "Match Up", text: "Sign + meaning. Race the clock.", c: "var(--cyan)" },
  { href: "/guvenlik", emoji: "🛡️", title: "Safety Facts", text: "Stopping distances, alcohol, seat belts… life-saving stuff.", c: "var(--lime)" },
];

export default function Home() {
  const { xp, streak, level, known, user, ready } = useApp();
  const knownCount = Object.values(known).filter(Boolean).length;
  return (
    <>
      <section className="hero">
        <div className="float-signs" aria-hidden>
          <div style={{ left: "12%", top: 20, ["--r" as string]: "-10deg" }}><Sign id="speed30" size={70} /></div>
          <div style={{ left: "28%", top: 60, animationDelay: "-1s", ["--r" as string]: "8deg" }}><Sign id="roundabout-w" size={64} /></div>
          <div style={{ right: "28%", top: 56, animationDelay: "-2s", ["--r" as string]: "-6deg" }}><Sign id="parking" size={66} /></div>
          <div style={{ right: "12%", top: 14, animationDelay: "-3s", ["--r" as string]: "10deg" }}><Sign id="giveway" size={72} /></div>
          <div style={{ left: "calc(50% - 39px)", top: 0, animationDelay: "-.5s" }}><Sign id="stop" size={78} /></div>
        </div>
        <h1>Crush the signs,<br /><em>stack XP</em>, level up 🚀</h1>
        <p>UK road signs and road safety, learned with flashcards, quizzes and games. No sign-up needed. Just jump in.</p>
        <div className="row center">
          <Link href="/quiz" className="btn btn-lime btn-lg">⚡ Play now</Link>
          <Link href="/kartlar" className="btn btn-ghost btn-lg">🃏 Browse cards</Link>
        </div>
      </section>

      {ready && (
        <section className="quick" style={{ marginTop: 28 }}>
          <div className="stat"><b>LV {level}</b>Level</div>
          <div className="stat"><b>{xp}</b>Total XP</div>
          <div className="stat"><b>🔥 {streak}</b>Day streak</div>
          <div className="stat"><b>{knownCount}/{ALL_CARDS.length}</b>Cards learned</div>
        </section>
      )}

      <section className="modes">
        {MODES.map((m) => (
          <Link key={m.href} href={m.href} className="mode" style={{ ["--c" as string]: m.c }}>
            <span className="big">{m.emoji}</span>
            <h3>{m.title}</h3>
            <p>{m.text}</p>
          </Link>
        ))}
      </section>

      {!user && (
        <section className="card center" style={{ textAlign: "center" }}>
          <h2>👀 You&apos;re playing as a guest</h2>
          <p className="muted">Your progress is saved in this browser. Log in to keep it on every device and join the leaderboard.</p>
          <Link href="/giris" className="btn btn-cyan">Log in / Sign up</Link>
        </section>
      )}

      <p className="note">
        ℹ️ Content is based on the UK <b>Highway Code</b> and UK road signs. Many Commonwealth countries that drive on the left
        (Australia, India, New Zealand…) use similar signs, but details can differ by country. This app is a study aid; use current
        official sources for your real test.
      </p>
    </>
  );
}
