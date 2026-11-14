import { NextResponse } from "next/server";
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
  const ip = (req.headers.get("x-forwarded-for") || "unknown").split(",")[0].trim().slice(0, 64);
  const ipKey = `verify-bad:${ip}`;
  const invalid = () => NextResponse.json({ error: "This confirmation link is invalid or has expired. Sign up again to get a new one." }, { status: 400 });

  try {
    await ensureSchema();
    const sql = getSql();
    const bad = (await sql`SELECT COUNT(*)::int AS n FROM login_attempts WHERE key = ${ipKey} AND at > now() - interval '1 hour'`) as Record<string, any>[];
    if ((bad[0]?.n ?? 0) >= MAX_BAD_PER_IP) return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });

    if (!/^[0-9a-f]{64}$/.test(token)) {
      await sql`INSERT INTO login_attempts (key) VALUES (${ipKey})`;
      return invalid();
    }
    // Claim the pending sign-up atomically: the link works exactly once.
    const claimed = (await sql`
      DELETE FROM pending_signups WHERE token_hash = ${hashToken(token)} AND expires_at > now()
      RETURNING email, nickname, password_hash`) as Record<string, any>[];
    if (!claimed.length) {
      await sql`INSERT INTO login_attempts (key) VALUES (${ipKey})`;
      return invalid();
    }
    const p = claimed[0];
    const created = (await sql`
      INSERT INTO users (email, nickname, password_hash) VALUES (${p.email}, ${p.nickname}, ${p.password_hash})
      ON CONFLICT (email) DO NOTHING RETURNING id`) as Record<string, any>[];
    if (created.length) await sql`INSERT INTO user_stats (user_id) VALUES (${created[0].id}) ON CONFLICT DO NOTHING`;
    // If the account already existed, there's nothing more to do: the address is confirmed either way.
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error, please try again shortly." }, { status: 500 });
  }
}
