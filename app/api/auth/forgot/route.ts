import { NextResponse } from "next/server";
import { ensureSchema, getSql, hasDb } from "@/lib/db";
import { emailConfigured, sendEmail } from "@/lib/email";
import { siteUrl } from "@/lib/site";
import { hashToken, newToken } from "@/lib/tokens";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_PER_EMAIL = 3; // reset emails per address per hour
const MAX_PER_IP = 10; // reset requests per IP per hour

export async function POST(req: Request) {
  if (!hasDb()) return NextResponse.json({ error: "Accounts are unavailable right now." }, { status: 503 });
  const base = siteUrl();
  if (!emailConfigured() || !base) {
    return NextResponse.json({ error: "Password reset by email isn't set up on this site yet." }, { status: 503 });
  }
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  const email = String(body.email || "").trim().toLowerCase().slice(0, 200);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
  const ip = (req.headers.get("x-forwarded-for") || "unknown").split(",")[0].trim().slice(0, 64);
  const emailKey = `reset-email:${email}`;
  const ipKey = `reset-ip:${ip}`;

  try {
    await ensureSchema();
    const sql = getSql();

    const counts = (await sql`
      SELECT key, COUNT(*)::int AS n FROM login_attempts
      WHERE key IN (${emailKey}, ${ipKey}) AND at > now() - interval '1 hour' GROUP BY key`) as Record<string, any>[];
    const n = (k: string) => counts.find((c) => c.key === k)?.n ?? 0;
    if (n(emailKey) >= MAX_PER_EMAIL || n(ipKey) >= MAX_PER_IP) {
      return NextResponse.json({ error: "Too many requests. Try again in an hour." }, { status: 429 });
    }
    await sql`INSERT INTO login_attempts (key) VALUES (${emailKey}), (${ipKey})`;
    await sql`DELETE FROM login_attempts WHERE at < now() - interval '1 day'`;
    await sql`DELETE FROM password_resets WHERE expires_at < now()`;

    const rows = (await sql`SELECT id FROM users WHERE email = ${email}`) as Record<string, any>[];
    if (rows.length) {
      const token = newToken();
      await sql`DELETE FROM password_resets WHERE user_id = ${rows[0].id}`;
      await sql`INSERT INTO password_resets (token_hash, user_id, expires_at)
                VALUES (${hashToken(token)}, ${rows[0].id}, now() + interval '1 hour')`;
      await sendEmail(
        email,
        "Reset your Roadly password",
        `Someone asked to reset the password for your Roadly account.\n\n` +
          `Open this link within 1 hour to choose a new password:\n${base}/reset?token=${token}\n\n` +
          `If it wasn't you, ignore this email. Your password stays unchanged.`
      );
    }
    // Same answer whether or not the account exists, so emails can't be probed.
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error, please try again shortly." }, { status: 500 });
  }
}
