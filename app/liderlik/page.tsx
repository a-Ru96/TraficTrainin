"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useApp } from "@/components/AppProvider";

interface Row { nickname: string; xp: number; streak: number }
type Period = "daily" | "monthly" | "all";

const PERIODS: { key: Period; label: string; empty: string; sub: string }[] = [
  { key: "daily", label: "Today", empty: "Nobody has earned XP today yet. Be the first.", sub: "XP earned today (UTC)." },
  { key: "monthly", label: "This month", empty: "No XP earned this month yet. Be the first.", sub: "XP earned this calendar month." },
  { key: "all", label: "All time", empty: "Nobody here yet. Be the first.", sub: "Total XP since joining." },
];

export default function Leaderboard() {
  const { user } = useApp();
  const [period, setPeriod] = useState<Period>("daily");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [db, setDb] = useState(true);

  useEffect(() => {
    let live = true;
    setRows(null);
    fetch(`/api/leaderboard?period=${period}`).then((r) => r.json())
      .then((d) => { if (live) { setRows(d.rows); setDb(d.db); } })
      .catch(() => { if (live) { setRows([]); setDb(false); } });
    return () => { live = false; };
  }, [period]);

  const cur = PERIODS.find((p) => p.key === period)!;

  return (
    <>
      <div className="page-head">
        <h1>Leaderboard</h1>
        <p className="muted">{cur.sub}</p>
      </div>
      <div className="seg" role="tablist" aria-label="Leaderboard period">
        {PERIODS.map((p) => (
          <button key={p.key} role="tab" aria-selected={period === p.key}
            className={period === p.key ? "on" : ""} onClick={() => setPeriod(p.key)}>{p.label}</button>
        ))}
      </div>

      {rows === null ? <p className="muted"><span className="spin" /> Loading…</p>
        : !db ? <div className="card">The leaderboard needs the account system (database). Keep practising in the meantime.</div>
        : rows.length === 0 ? (
          <div className="card" style={{ textAlign: "center" }}>
            <p>{cur.empty}</p>
            <Link href={user ? "/quiz" : "/giris"} className="btn">{user ? "Take a quiz" : "Sign up"}</Link>
          </div>
        ) : (
          <div className="lb">
            {rows.map((r, i) => (
              <div key={i} className={`lb-row ${user && r.nickname === user.nickname ? "me" : ""}`}>
                <span className="rank">{i + 1}</span>
                <span className="name">{r.nickname}</span>
                <span className="muted streak-col" style={{ fontSize: ".85rem" }}>{r.streak} day streak</span>
                <span className="xp">{r.xp} XP</span>
              </div>
            ))}
          </div>
        )}
      {!user && <p className="note">Log in to appear on the leaderboard. Guests aren&apos;t listed.</p>}
    </>
  );
}
