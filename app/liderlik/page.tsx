"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useApp } from "@/components/AppProvider";

interface Row { nickname: string; xp: number; streak: number }

export default function Leaderboard() {
  const { user } = useApp();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [db, setDb] = useState(true);

  useEffect(() => {
    fetch("/api/leaderboard").then((r) => r.json()).then((d) => { setRows(d.rows); setDb(d.db); })
      .catch(() => { setRows([]); setDb(false); });
  }, []);

  return (
    <>
      <div className="page-title"><h1 style={{ fontSize: "2rem", margin: 0 }}>🏆 Leaderboard</h1></div>
      {rows === null ? <p className="muted"><span className="spin">⏳</span> Loading…</p>
        : !db ? <div className="card">The leaderboard needs the account system (database). Keep practising in the meantime!</div>
        : rows.length === 0 ? (
          <div className="card center" style={{ textAlign: "center" }}>
            <p>Nobody here yet. Be the first! 🥇</p>
            <Link href={user ? "/quiz" : "/giris"} className="btn btn-lime">{user ? "Take a quiz" : "Sign up"}</Link>
          </div>
        ) : (
          <div className="lb">
            {rows.map((r, i) => (
              <div key={i} className={`lb-row ${user && r.nickname === user.nickname ? "me" : ""}`}>
                <span className="rank">{["🥇", "🥈", "🥉"][i] ?? i + 1}</span>
                <span className="name">{r.nickname}</span>
                <span className="muted">🔥 {r.streak}</span>
                <span className="xp">{r.xp} XP</span>
              </div>
            ))}
          </div>
        )}
      {!user && <p className="note">Log in to appear on the leaderboard. Guests aren&apos;t listed.</p>}
    </>
  );
}
