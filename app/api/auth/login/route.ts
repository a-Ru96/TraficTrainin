import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { ensureSchema, getSql, hasDb, getSnapshot } from "@/lib/db";
import { createSession } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WINDOW_MIN = 15;
const MAX_PER_EMAIL = 8; // failed attempts per email per window
const MAX_PER_IP = 40; // failed attempts per IP per window

export async function POST(req: Request) {
  if (!hasDb()) return NextResponse.json({ error: "Accounts are unavailable right now. You can continue as a guest." }, { status: 503 });
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  const email = String(body.email || "").trim().toLowerCase().slice(0, 200);
  const password = String(body.password || "").slice(0, 200);
  const ip = (req.headers.get("x-forwarded-for") || "unknown").split(",")[0].trim().slice(0, 64);
  const emailKey = `email:${email}`;
  const ipKey = `ip:${ip}`;

  try {
    await ensureSchema();
    const sql = getSql();

    // Too many recent failures for this email or IP? Stop before doing any work.
    const counts = (await sql`
      SELECT key, COUNT(*)::int AS n FROM login_attempts
      WHERE key IN (${emailKey}, ${ipKey}) AND at > now() - (${WINDOW_MIN} * interval '1 minute')
      GROUP BY key`) as Record<string, any>[];
    const n = (k: string) => counts.find((c) => c.key === k)?.n ?? 0;
    if (n(emailKey) >= MAX_PER_EMAIL || n(ipKey) >= MAX_PER_IP) {
      return NextResponse.json({ error: `Too many attempts. Try again in ${WINDOW_MIN} minutes.` }, { status: 429 });
    }

    const rows = (await sql`SELECT id, password_hash FROM users WHERE email = ${email}`) as Record<string, any>[];
    const ok = rows.length > 0 && (await bcrypt.compare(password, rows[0].password_hash));
    if (!ok) {
      await sql`INSERT INTO login_attempts (key) VALUES (${emailKey}), (${ipKey})`;
      await sql`DELETE FROM login_attempts WHERE at < now() - interval '1 day'`;
      return NextResponse.json({ error: "Wrong email or password." }, { status: 401 });
    }
    await sql`DELETE FROM login_attempts WHERE key = ${emailKey}`;
    await createSession(rows[0].id);
    return NextResponse.json(await getSnapshot(rows[0].id));
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error, please try again shortly." }, { status: 500 });
  }
}
