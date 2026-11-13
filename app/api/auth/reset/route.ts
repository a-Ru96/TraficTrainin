import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { ensureSchema, getSql, hasDb } from "@/lib/db";
import { hashToken } from "@/lib/tokens";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BAD_PER_IP = 20; // wrong/expired token attempts per IP per hour

export async function POST(req: Request) {
  if (!hasDb()) return NextResponse.json({ error: "Accounts are unavailable right now." }, { status: 503 });
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  const token = String(body.token || "");
  const password = String(body.password || "");
  if (password.length < 8 || password.length > 100) return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  const ip = (req.headers.get("x-forwarded-for") || "unknown").split(",")[0].trim().slice(0, 64);
  const ipKey = `reset-bad:${ip}`;
  const invalid = () => NextResponse.json({ error: "This reset link is invalid or has expired. Request a new one." }, { status: 400 });

  try {
    await ensureSchema();
    const sql = getSql();
    const bad = (await sql`SELECT COUNT(*)::int AS n FROM login_attempts WHERE key = ${ipKey} AND at > now() - interval '1 hour'`) as Record<string, any>[];
    if ((bad[0]?.n ?? 0) >= MAX_BAD_PER_IP) return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });

    if (!/^[0-9a-f]{64}$/.test(token)) {
      await sql`INSERT INTO login_attempts (key) VALUES (${ipKey})`;
      return invalid();
    }
    // Claim the token atomically: it can be used exactly once.
    const claimed = (await sql`
      DELETE FROM password_resets WHERE token_hash = ${hashToken(token)} AND expires_at > now() RETURNING user_id`) as Record<string, any>[];
    if (!claimed.length) {
      await sql`INSERT INTO login_attempts (key) VALUES (${ipKey})`;
      return invalid();
    }
    const hash = await bcrypt.hash(password, 10);
    await sql`UPDATE users SET password_hash = ${hash} WHERE id = ${claimed[0].user_id}`;
    await sql`DELETE FROM password_resets WHERE user_id = ${claimed[0].user_id}`;
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error, please try again shortly." }, { status: 500 });
  }
}
