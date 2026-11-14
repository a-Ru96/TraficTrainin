import { NextResponse } from "next/server";
import { createSession } from "@/lib/auth";
import { ensureSchema, getSnapshot, getSql, hasDb } from "@/lib/db";
import { hashCode, safeEqual } from "@/lib/tokens";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_WRONG_PER_CODE = 5; // wrong guesses before the pending sign-up is thrown away
const MAX_BAD_PER_IP = 20; // wrong/expired attempts per IP per hour

export async function POST(req: Request) {
  if (!hasDb()) return NextResponse.json({ error: "Accounts are unavailable right now." }, { status: 503 });
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  const email = String(body.email || "").trim().toLowerCase().slice(0, 200);
  const code = String(body.code || "").trim();
  const ip = (req.headers.get("x-forwarded-for") || "unknown").split(",")[0].trim().slice(0, 64);
  const ipKey = `verify-bad:${ip}`;

  try {
    await ensureSchema();
    const sql = getSql();
    const bad = async (msg: string, status = 400) => {
      await sql`INSERT INTO login_attempts (key) VALUES (${ipKey})`;
      return NextResponse.json({ error: msg }, { status });
    };
    const recent = (await sql`SELECT COUNT(*)::int AS n FROM login_attempts WHERE key = ${ipKey} AND at > now() - interval '1 hour'`) as Record<string, any>[];
    if ((recent[0]?.n ?? 0) >= MAX_BAD_PER_IP) return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });

    const expired = "This code is invalid or has expired. Sign up again to get a new one.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !/^\d{6}$/.test(code)) return bad(expired);

    // Count this guess first (atomically), then compare: parallel guesses can't beat the limit.
    const rows = (await sql`
      UPDATE signup_codes SET attempts = attempts + 1
      WHERE email = ${email} AND expires_at > now() AND attempts < ${MAX_WRONG_PER_CODE}
      RETURNING code_hash, attempts`) as Record<string, any>[];
    if (!rows.length) return bad(expired);
    if (!safeEqual(rows[0].code_hash, hashCode(email, code))) {
      if (rows[0].attempts >= MAX_WRONG_PER_CODE) {
        await sql`DELETE FROM signup_codes WHERE email = ${email}`;
        return bad("Too many wrong codes. Sign up again to get a new one.");
      }
      return bad("That code isn't right. Check the email and try again.");
    }

    // Claim the pending sign-up atomically: the code works exactly once.
    const claimed = (await sql`
      DELETE FROM signup_codes WHERE email = ${email} AND code_hash = ${hashCode(email, code)} AND expires_at > now()
      RETURNING nickname, password_hash`) as Record<string, any>[];
    if (!claimed.length) return bad(expired);
    const created = (await sql`
      INSERT INTO users (email, nickname, password_hash) VALUES (${email}, ${claimed[0].nickname}, ${claimed[0].password_hash})
      ON CONFLICT (email) DO NOTHING RETURNING id`) as Record<string, any>[];
    if (!created.length) return NextResponse.json({ error: "This email is already registered. Log in instead." }, { status: 409 });
    const uid = created[0].id as number;
    await sql`INSERT INTO user_stats (user_id) VALUES (${uid}) ON CONFLICT DO NOTHING`;
    await createSession(uid);
    return NextResponse.json(await getSnapshot(uid));
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error, please try again shortly." }, { status: 500 });
  }
}
