"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useApp } from "@/components/AppProvider";

export default function Auth() {
  const { user, dbOn, login, register, logout, deleteAccount, xp, streak, level, ready } = useApp();
  const router = useRouter();
  const [tab, setTab] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [nick, setNick] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [delPw, setDelPw] = useState("");
  const [delErr, setDelErr] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null); setBusy(true);
    const r = tab === "login" ? await login(email, pw) : await register(email, nick, pw);
    setBusy(false);
    if (r) setErr(r); else router.push("/");
  };

  const remove = async (e: FormEvent) => {
    e.preventDefault();
    setDelErr(null); setBusy(true);
    const r = await deleteAccount(delPw);
    setBusy(false);
    if (r) setDelErr(r); else router.push("/");
  };

  if (!ready) return null;

  if (user) {
    return (
      <div className="card auth" style={{ textAlign: "center" }}>
        <div className="eyebrow">Signed in</div>
        <h2>{user.nickname}</h2>
        <p className="muted">Level {level} · {xp} XP · {streak} day streak</p>
        <div className="row center">
          <Link href="/quiz" className="btn">Keep studying</Link>
          <button className="btn btn-ghost" onClick={() => logout()}>Log out</button>
        </div>

        <div className="divider">account</div>
        {!confirming ? (
          <button className="btn btn-sm btn-bad" onClick={() => setConfirming(true)}>Delete my account</button>
        ) : (
          <form onSubmit={remove} style={{ textAlign: "left" }}>
            <p className="muted" style={{ fontSize: ".88rem" }}>
              This permanently deletes your account, progress, XP and leaderboard entry. It can&apos;t be undone.
              Enter your password to confirm.
            </p>
            {delErr && <div className="err" role="alert">{delErr}</div>}
            <label className="field">Password
              <input type="password" value={delPw} onChange={(e) => setDelPw(e.target.value)} required autoComplete="current-password" />
            </label>
            <div className="row">
              <button className="btn btn-sm btn-bad" disabled={busy}>{busy ? <span className="spin" /> : "Delete permanently"}</button>
              <button type="button" className="btn btn-sm btn-ghost" onClick={() => { setConfirming(false); setDelPw(""); setDelErr(null); }}>Cancel</button>
            </div>
          </form>
        )}
      </div>
    );
  }

  return (
    <div className="card auth">
      <h2 style={{ textAlign: "center" }}>{tab === "login" ? "Welcome back" : "Create your account"}</h2>
      <p className="muted" style={{ textAlign: "center", fontSize: ".92rem" }}>Sync your progress across devices and appear on the leaderboard.</p>

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
                <input value={nick} onChange={(e) => setNick(e.target.value)} required minLength={2} maxLength={20} autoComplete="nickname" placeholder="e.g. alex" />
              </label>
            )}
            <label className="field">Email
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" placeholder="you@university.ac.uk" />
            </label>
            <label className="field">Password
              <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} required minLength={tab === "register" ? 8 : 1}
                autoComplete={tab === "login" ? "current-password" : "new-password"} placeholder={tab === "register" ? "At least 8 characters" : ""} />
            </label>
            <button className="btn btn-lg" style={{ width: "100%" }} disabled={busy}>
              {busy ? <span className="spin" /> : tab === "login" ? "Log in" : "Create account"}
            </button>
            {tab === "login" && (
              <p style={{ textAlign: "center", margin: "14px 0 0", fontSize: ".86rem" }}>
                <Link href="/forgot" className="muted" style={{ textDecoration: "underline" }}>Forgot your password?</Link>
              </p>
            )}
            {tab === "register" && (
              <p className="muted" style={{ fontSize: ".78rem", textAlign: "center", margin: "12px 0 0" }}>
                By signing up you agree to the <Link href="/legal" style={{ textDecoration: "underline" }}>terms and privacy policy</Link>.
              </p>
            )}
          </form>
          <div className="divider">or</div>
        </>
      )}
      <button className="btn btn-ghost" style={{ width: "100%" }} onClick={() => router.push("/")}>Continue as guest</button>
      {dbOn && <p className="muted" style={{ fontSize: ".8rem", textAlign: "center", marginTop: 14, marginBottom: 0 }}>XP and cards you earned as a guest move to your account when you log in.</p>}
    </div>
  );
}
