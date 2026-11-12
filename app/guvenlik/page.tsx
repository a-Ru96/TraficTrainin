import Link from "next/link";
import { FACTS } from "@/lib/facts";

export const metadata = { title: "Safety facts · LevhaLab" };

export default function Safety() {
  return (
    <>
      <div className="page-title"><h1 style={{ fontSize: "2rem", margin: 0 }}>🛡️ Safety Facts</h1></div>
      <p className="muted">As important as the signs: life-saving facts from the Highway Code. Read them, then test yourself.</p>
      <div className="row" style={{ marginBottom: 18 }}>
        <Link href="/quiz?kat=safety" className="btn btn-lime">⚡ Safety quiz</Link>
        <Link href="/kartlar?kat=safety" className="btn btn-ghost">🃏 Study as cards</Link>
      </div>
      <div className="fact-list">
        {FACTS.map((f) => (
          <article key={f.id} className="fact">
            <span className="emoji">{f.emoji}</span>
            <div><h3>{f.title}</h3><p>{f.text}</p></div>
          </article>
        ))}
      </div>
    </>
  );
}
