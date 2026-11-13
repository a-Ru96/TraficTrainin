"use client";
import Link from "next/link";
import { useApp } from "@/components/AppProvider";
import { Sign } from "@/components/Sign";
import { ALL_CARDS } from "@/lib/deck";

const MODES = [
  { href: "/cards", n: "01", title: "Flashcards", text: "Flip, self-assess, repeat. Cards you miss come back until they stick." },
  { href: "/quiz", n: "02", title: "Quick quiz", text: "Ten questions per round with instant explanations and combo XP." },
  { href: "/match", n: "03", title: "Match up", text: "Pair signs with their meanings against the clock." },
  { href: "/safety", n: "04", title: "Safety facts", text: "Stopping distances, alcohol limits, seat belts and more." },
];

const BOARD = ["stop", "speed30", "roundabout-w", "giveway", "nsl", "parking"];

export default function Home() {
  const { xp, streak, level, known, user, ready } = useApp();
  const knownCount = Object.values(known).filter(Boolean).length;
  return (
    <>
      <section className="hero">
        <div>
          <div className="eyebrow">UK Highway Code · Theory test prep</div>
          <h1>Learn UK road signs. <em>Actually remember them.</em></h1>
          <p className="lead">Flashcards, quizzes and quick games built for short study sessions. No account needed. Open it and start.</p>
          <div className="row">
            <Link href="/quiz" className="btn btn-lg">Start a quiz</Link>
            <Link href="/cards" className="btn btn-lg btn-ghost">Study flashcards</Link>
          </div>
        </div>
        <div className="sign-board" aria-hidden>
          {BOARD.map((id) => <div key={id} className="sign-tile"><Sign id={id} size={84} /></div>)}
        </div>
      </section>

      {ready && (
        <section className="quick">
          <div className="stat"><b>Lv {level}</b><span>Level</span></div>
          <div className="stat"><b>{xp}</b><span>Total XP</span></div>
          <div className="stat"><b>{streak}</b><span>Day streak</span></div>
          <div className="stat"><b>{knownCount}<small className="muted" style={{ fontSize: ".9rem" }}> / {ALL_CARDS.length}</small></b><span>Cards learned</span></div>
        </section>
      )}

      <section className="modes">
        {MODES.map((m) => (
          <Link key={m.href} href={m.href} className="mode">
            <span className="arrow">→</span>
            <span className="num">{m.n}</span>
            <h3>{m.title}</h3>
            <p>{m.text}</p>
          </Link>
        ))}
      </section>

      {!user && (
        <section className="card row" style={{ justifyContent: "space-between" }}>
          <div>
            <h3 style={{ marginBottom: 4 }}>You&apos;re studying as a guest</h3>
            <p className="muted" style={{ margin: 0, fontSize: ".92rem" }}>Progress is saved in this browser. Create an account to sync across devices and join the leaderboard.</p>
          </div>
          <Link href="/login" className="btn btn-ghost">Log in or sign up</Link>
        </section>
      )}

      <p className="note">
        Content is based on the UK Highway Code and UK road signs. Many Commonwealth countries that drive on the left (Australia, India,
        New Zealand and others) use similar signs, but details differ by country. This is a study aid; always check current official
        sources before your test. Dashboard warning light symbols and meanings can differ between manufacturers, so check your
        vehicle handbook.
      </p>
    </>
  );
}
