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
  const password = String(body.password || "");
  try {
    await ensureSchema();
    const sql = getSql();
    const rows = (await sql`SELECT id, password_hash FROM users WHERE email = ${email}`) as Record<string, any>[];
    if (!rows.length || !(await bcrypt.compare(password, rows[0].password_hash))) {
      return NextResponse.json({ error: "Wrong email or password." }, { status: 401 });
    }
    await createSession(rows[0].id);
    return NextResponse.json(await getSnapshot(rows[0].id));
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error, please try again shortly." }, { status: 500 });
  }
}
