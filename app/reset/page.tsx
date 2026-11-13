"use client";
import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";

export default function Reset() {
  const [token, setToken] = useState<string | null>(null);
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const read = useRef(false);
  useEffect(() => {
    if (read.current) return; // effects run twice in dev strict mode; read the token only once
    read.current = true;
    setToken(new URLSearchParams(location.search).get("token") || "");
    // Keep the token out of the address bar, history and any later referrer.
    history.replaceState(null, "", location.pathname);
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null); setBusy(true);
    try {
      const res = await fetch("/api/auth/reset", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, password: pw }) });
      const data = await res.json().catch(() => ({}));
      if (res.ok) setDone(true); else setErr(data.error || "Something went wrong.");
    } catch { setErr("Connection error."); }
    setBusy(false);
  };

  if (token === null) return null;

  return (
    <div className="card auth">
      <h2 style={{ textAlign: "center" }}>Choose a new password</h2>
      {done ? (
        <>
          <p className="muted" style={{ textAlign: "center" }}>Your password has been changed. You can log in now.</p>
          <Link href="/login" className="btn" style={{ width: "100%" }}>Log in</Link>
        </>
      ) : !token ? (
        <>
          <div className="err">This reset link is incomplete. Request a new one.</div>
          <Link href="/forgot" className="btn btn-ghost" style={{ width: "100%" }}>Request a new link</Link>
        </>
      ) : (
        <form onSubmit={submit}>
          {err && <div className="err" role="alert">{err}</div>}
          <label className="field">New password
            <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} required minLength={8} autoComplete="new-password" placeholder="At least 8 characters" />
          </label>
          <button className="btn btn-lg" style={{ width: "100%" }} disabled={busy}>{busy ? <span className="spin" /> : "Change password"}</button>
        </form>
      )}
    </div>
  );
}
