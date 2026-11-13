"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp } from "./AppProvider";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/cards", label: "Cards" },
  { href: "/quiz", label: "Quiz" },
  { href: "/match", label: "Match" },
  { href: "/safety", label: "Safety" },
];

export function Nav() {
  const path = usePathname();
  const { xp, streak, level, levelInto, user, pops, ready } = useApp();
  return (
    <>
      <header className="top">
        <Link href="/" className="logo"><span className="mark" /><span>Road<b>ly</b></span></Link>
        <nav className="desk-nav">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className={path === l.href ? "on" : ""}>{l.label}</Link>
          ))}
          <Link href="/leaderboard" className={path === "/leaderboard" ? "on" : ""}>Leaderboard</Link>
        </nav>
        <div className="stats">
          <div className="pill" title="Daily streak"><b>{ready ? streak : 0}</b> day streak</div>
          <div className="pill lvl" title={`${levelInto}/100 XP to next level`}>
            <b>Lv {level}</b>
            <div className="xpbar"><i style={{ width: `${levelInto}%` }} /></div>
            <small>{xp} XP</small>
          </div>
          <Link href="/login" className="btn btn-sm btn-ghost">{user ? user.nickname : "Log in"}</Link>
        </div>
        <div className="pops" aria-hidden>
          {pops.map((p) => <div key={p.id} className="pop">+{p.n} XP</div>)}
        </div>
      </header>
      <nav className="mob-nav">
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} className={path === l.href ? "on" : ""}>{l.label}</Link>
        ))}
      </nav>
    </>
  );
}
