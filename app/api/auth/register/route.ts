import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { ensureSchema, getSql, hasDb, getSnapshot } from "@/lib/db";
import { createSession } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!hasDb()) return NextResponse.json({ error: "Accounts are unavailable right now. You can continue as a guest." }, { status: 503 });
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  const email = String(body.email || "").trim().toLowerCase();
  const nickname = String(body.nickname || "").trim();
  const password = String(body.password || "");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
  if (!/^[\p{L}\p{N} ._-]{2,20}$/u.test(nickname)) return NextResponse.json({ error: "Nickname must be 2-20 characters: letters, numbers, spaces, . _ -" }, { status: 400 });
  if (password.length < 6 || password.length > 100) return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });

  try {
    await ensureSchema();
    const sql = getSql();
    const hash = await bcrypt.hash(password, 10);
    const rows = (await sql`INSERT INTO users (email, nickname, password_hash) VALUES (${email}, ${nickname}, ${hash}) RETURNING id`) as Record<string, any>[];
    const uid = rows[0].id as number;
    await sql`INSERT INTO user_stats (user_id) VALUES (${uid})`;
    await createSession(uid);
    return NextResponse.json(await getSnapshot(uid));
  } catch (e: any) {
    if (e?.code === "23505") return NextResponse.json({ error: "This email is already registered." }, { status: 409 });
    console.error(e);
    return NextResponse.json({ error: "Server error, please try again shortly." }, { status: 500 });
  }
}
