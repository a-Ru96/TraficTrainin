"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useApp } from "@/components/AppProvider";

export default function Auth() {
  const { user, dbOn, login, register, logout, xp, streak, level, ready } = useApp();
  const router = useRouter();
  const [tab, setTab] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [nick, setNick] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null); setBusy(true);
    const r = tab === "login" ? await login(email, pw) : await register(email, nick, pw);
    setBusy(false);
    if (r) setErr(r); else router.push("/");
  };

  if (!ready) return null;

  if (user) {
    return (
      <div className="card auth center" style={{ textAlign: "center" }}>
        <div style={{ fontSize: "3.4rem" }}>😎</div>
        <h2>Hey, {user.nickname}!</h2>
        <p className="muted">LV {level} · {xp} XP · 🔥 {streak} day streak</p>
        <div className="row center">
          <Link href="/quiz" className="btn btn-lime">⚡ Keep playing</Link>
          <button className="btn btn-ghost" onClick={() => logout()}>Log out</button>
        </div>
      </div>
    );
  }

  return (
    <div className="card auth">
      <h2 style={{ textAlign: "center" }}>{tab === "login" ? "Welcome back 👋" : "Join the crew 🚀"}</h2>
      <p className="muted" style={{ textAlign: "center" }}>Take your progress to every device and claim your spot on the leaderboard.</p>

      {!dbOn ? (
        <div className="err">Accounts are unavailable right now (no database connected). You can continue as a guest.</div>
      ) : (
        <>
          <div className="tabs" role="tablist">
            <button className={tab === "login" ? "on" : ""} onClick={() => { setTab("login"); setErr(null); }}>Log in</button>
            <button className={tab === "register" ? "on" : ""} onClick={() => { setTab("register"); setErr(null); }}>Sign up</button>
          </div>
          <form onSubmit={submit}>
            {err && <div className="err" role="alert">{err}</div>}
            {tab === "register" && (
              <label className="field">Nickname
                <input value={nick} onChange={(e) => setNick(e.target.value)} required minLength={2} maxLength={20} autoComplete="nickname" placeholder="e.g. SignHunter" />
              </label>
            )}
            <label className="field">Email
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" placeholder="you@mail.com" />
            </label>
            <label className="field">Password
              <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} required minLength={6}
                autoComplete={tab === "login" ? "current-password" : "new-password"} placeholder="at least 6 characters" />
            </label>
            <button className="btn btn-lg" style={{ width: "100%" }} disabled={busy}>
              {busy ? <span className="spin">⏳</span> : tab === "login" ? "Log in" : "Create account"}
            </button>
          </form>
          <div className="divider">or</div>
        </>
      )}
      <button className="btn btn-ghost" style={{ width: "100%" }} onClick={() => router.push("/")}>👀 Continue as guest</button>
      {dbOn && <p className="muted" style={{ fontSize: ".8rem", textAlign: "center", marginTop: 12 }}>XP and cards you earned as a guest move to your account when you log in.</p>}
    </div>
  );
}
