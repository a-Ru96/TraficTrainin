"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";

export default function Verify() {
  const [token, setToken] = useState<string | null>(null);
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

  // The link is used by a button press, not on page load, so mail scanners that open links can't use it up.
  const confirm = async () => {
    setErr(null); setBusy(true);
    try {
      const res = await fetch("/api/auth/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) });
      const data = await res.json().catch(() => ({}));
      if (res.ok) setDone(true); else setErr(data.error || "Something went wrong.");
    } catch { setErr("Connection error."); }
    setBusy(false);
  };

  if (token === null) return null;

  return (
    <div className="card auth" style={{ textAlign: "center" }}>
      <h2>Confirm your email</h2>
      {done ? (
        <>
          <p className="muted">Your email is confirmed and your account is ready. You can log in now.</p>
          <Link href="/login" className="btn" style={{ width: "100%" }}>Log in</Link>
        </>
      ) : !token ? (
        <>
          <div className="err">This confirmation link is incomplete. Sign up again to get a new one.</div>
          <Link href="/login" className="btn btn-ghost" style={{ width: "100%" }}>Back to sign up</Link>
        </>
      ) : (
        <>
          {err && <div className="err" role="alert">{err}</div>}
          <p className="muted">One click and your account is created.</p>
          <button className="btn btn-lg" style={{ width: "100%" }} onClick={confirm} disabled={busy}>
            {busy ? <span className="spin" /> : "Confirm my email"}
          </button>
        </>
      )}
    </div>
  );
}
