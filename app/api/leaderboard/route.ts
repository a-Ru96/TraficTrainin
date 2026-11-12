import { NextResponse } from "next/server";
import { ensureSchema, getSql, hasDb } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!hasDb()) return NextResponse.json({ db: false, rows: [] });
  try {
    await ensureSchema();
    const rows = (await getSql()`
      SELECT u.nickname, s.xp, s.streak FROM user_stats s JOIN users u ON u.id = s.user_id
      WHERE s.xp > 0 ORDER BY s.xp DESC, u.id ASC LIMIT 20`) as Record<string, any>[];
    return NextResponse.json({
      db: true,
      rows: rows.map((r) => ({ nickname: r.nickname, xp: Number(r.xp), streak: Number(r.streak) })),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ db: false, rows: [] });
  }
}
