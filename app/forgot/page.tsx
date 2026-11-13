"use client";
import { FormEvent, useState } from "react";
import Link from "next/link";

export default function Forgot() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null); setBusy(true);
    try {
      const res = await fetch("/api/auth/forgot", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
      const data = await res.json().catch(() => ({}));
      if (res.ok) setSent(true); else setErr(data.error || "Something went wrong.");
    } catch { setErr("Connection error."); }
    setBusy(false);
  };

  return (
    <div className="card auth">
      <h2 style={{ textAlign: "center" }}>Reset your password</h2>
      {sent ? (
        <>
          <p className="muted" style={{ textAlign: "center" }}>
            If an account exists for <b>{email}</b>, we&apos;ve sent a reset link. It works for 1 hour. Check your spam folder too.
          </p>
          <Link href="/login" className="btn btn-ghost" style={{ width: "100%" }}>Back to log in</Link>
        </>
      ) : (
        <form onSubmit={submit}>
          <p className="muted" style={{ textAlign: "center", fontSize: ".92rem" }}>Enter your email and we&apos;ll send you a link to choose a new password.</p>
          {err && <div className="err" role="alert">{err}</div>}
          <label className="field">Email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          </label>
          <button className="btn btn-lg" style={{ width: "100%" }} disabled={busy}>{busy ? <span className="spin" /> : "Send reset link"}</button>
          <p style={{ textAlign: "center", margin: "14px 0 0", fontSize: ".86rem" }}>
            <Link href="/login" className="muted" style={{ textDecoration: "underline" }}>Back to log in</Link>
          </p>
        </form>
      )}
    </div>
  );
}
