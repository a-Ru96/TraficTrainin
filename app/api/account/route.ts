import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { clearSession, getUserId } from "@/lib/auth";
import { ensureSchema, getSql, hasDb } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Permanently deletes the signed-in account and all its data (cascades to stats, progress, XP log, results). */
export async function DELETE(req: Request) {
  if (!hasDb()) return NextResponse.json({ error: "Accounts are unavailable right now." }, { status: 503 });
  const uid = await getUserId();
  if (!uid) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  const password = String(body.password || "").slice(0, 200);

  try {
    await ensureSchema();
    const sql = getSql();
    const rows = (await sql`SELECT email, password_hash FROM users WHERE id = ${uid}`) as Record<string, any>[];
    if (!rows.length) { await clearSession(); return NextResponse.json({ ok: true }); }
    if (!(await bcrypt.compare(password, rows[0].password_hash))) {
      return NextResponse.json({ error: "Wrong password." }, { status: 401 });
    }
    await sql`DELETE FROM users WHERE id = ${uid}`;
    await sql`DELETE FROM login_attempts WHERE key IN (${"email:" + rows[0].email}, ${"reset-email:" + rows[0].email})`;
    await clearSession();
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error, please try again shortly." }, { status: 500 });
  }
}
