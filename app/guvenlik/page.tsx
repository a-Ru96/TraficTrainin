import Link from "next/link";
import { FACTS } from "@/lib/facts";

export const metadata = { title: "Safety facts · Roadly" };

export default function Safety() {
  return (
    <>
      <div className="page-head">
        <h1>Safety facts</h1>
        <p className="muted">As important as the signs: key figures and rules from the Highway Code. Read them, then test yourself.</p>
      </div>
      <div className="row" style={{ marginBottom: 22 }}>
        <Link href="/quiz?kat=safety" className="btn">Take the safety quiz</Link>
        <Link href="/kartlar?kat=safety" className="btn btn-ghost">Study as flashcards</Link>
      </div>
      <div className="fact-list">
        {FACTS.map((f, i) => (
          <article key={f.id} className="fact">
            <span className="n">{String(i + 1).padStart(2, "0")}</span>
            <h3>{f.title}</h3>
            <p>{f.text}</p>
          </article>
        ))}
      </div>
    </>
  );
}
