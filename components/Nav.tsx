"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp } from "./AppProvider";

const LINKS = [
  { href: "/", label: "Home", emoji: "🏠" },
  { href: "/kartlar", label: "Cards", emoji: "🃏" },
  { href: "/quiz", label: "Quiz", emoji: "⚡" },
  { href: "/eslestir", label: "Match", emoji: "🧩" },
  { href: "/guvenlik", label: "Safety", emoji: "🛡️" },
];

export function Nav() {
  const path = usePathname();
  const { xp, streak, level, levelInto, user, pops, ready } = useApp();
  return (
    <>
      <header className="top">
        <Link href="/" className="logo"><span className="logo-sign">🚦</span> Levha<span>Lab</span></Link>
        <nav className="desk-nav">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className={path === l.href ? "on" : ""}>{l.label}</Link>
          ))}
          <Link href="/liderlik" className={path === "/liderlik" ? "on" : ""}>Leaderboard</Link>
        </nav>
        <div className="stats">
          <div className="pill streak" title="Daily streak">🔥 {ready ? streak : 0}</div>
          <div className="pill lvl" title={`${levelInto}/100 XP`}>
            <span>LV {level}</span>
            <div className="xpbar"><i style={{ width: `${levelInto}%` }} /></div>
            <small>{xp} XP</small>
          </div>
          <Link href="/giris" className="btn btn-sm btn-lime">{user ? `👤 ${user.nickname}` : "Log in"}</Link>
        </div>
        <div className="pops" aria-hidden>
          {pops.map((p) => <div key={p.id} className="pop">+{p.n} XP</div>)}
        </div>
      </header>
      <nav className="mob-nav">
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} className={path === l.href ? "on" : ""}>
            <span>{l.emoji}</span>{l.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
