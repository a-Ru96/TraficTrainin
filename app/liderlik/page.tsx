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
      <div className="page-head">
        <h1>Leaderboard</h1>
        <p className="muted">Top learners by total XP.</p>
      </div>
      {rows === null ? <p className="muted"><span className="spin" /> Loading…</p>
        : !db ? <div className="card">The leaderboard needs the account system (database). Keep practising in the meantime.</div>
        : rows.length === 0 ? (
          <div className="card" style={{ textAlign: "center" }}>
            <p>Nobody here yet. Be the first.</p>
            <Link href={user ? "/quiz" : "/giris"} className="btn">{user ? "Take a quiz" : "Sign up"}</Link>
          </div>
        ) : (
          <div className="lb">
            {rows.map((r, i) => (
              <div key={i} className={`lb-row ${user && r.nickname === user.nickname ? "me" : ""}`}>
                <span className="rank">{i + 1}</span>
                <span className="name">{r.nickname}</span>
                <span className="muted" style={{ fontSize: ".85rem" }}>{r.streak} day streak</span>
                <span className="xp">{r.xp} XP</span>
              </div>
            ))}
          </div>
        )}
      {!user && <p className="note">Log in to appear on the leaderboard. Guests aren&apos;t listed.</p>}
    </>
  );
}
