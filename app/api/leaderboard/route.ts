import { NextResponse } from "next/server";
import { ensureSchema, getSql, hasDb } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Period = "daily" | "monthly" | "all";

export async function GET(req: Request) {
  const p = new URL(req.url).searchParams.get("period");
  const period: Period = p === "daily" || p === "monthly" ? p : "all";
  if (!hasDb()) return NextResponse.json({ db: false, period, rows: [] });
  try {
    await ensureSchema();
    const sql = getSql();
    let rows: Record<string, any>[];
    if (period === "daily") {
      rows = (await sql`
        SELECT u.nickname, SUM(l.xp) AS xp, COALESCE(s.streak,0) AS streak
        FROM xp_log l JOIN users u ON u.id = l.user_id LEFT JOIN user_stats s ON s.user_id = u.id
        WHERE l.day = CURRENT_DATE
        GROUP BY u.id, u.nickname, s.streak HAVING SUM(l.xp) > 0
        ORDER BY xp DESC, u.id ASC LIMIT 20`) as Record<string, any>[];
    } else if (period === "monthly") {
      rows = (await sql`
        SELECT u.nickname, SUM(l.xp) AS xp, COALESCE(s.streak,0) AS streak
        FROM xp_log l JOIN users u ON u.id = l.user_id LEFT JOIN user_stats s ON s.user_id = u.id
        WHERE l.day >= date_trunc('month', CURRENT_DATE)::date
        GROUP BY u.id, u.nickname, s.streak HAVING SUM(l.xp) > 0
        ORDER BY xp DESC, u.id ASC LIMIT 20`) as Record<string, any>[];
    } else {
      rows = (await sql`
        SELECT u.nickname, s.xp, s.streak FROM user_stats s JOIN users u ON u.id = s.user_id
        WHERE s.xp > 0 ORDER BY s.xp DESC, u.id ASC LIMIT 20`) as Record<string, any>[];
    }
    return NextResponse.json({
      db: true,
      period,
      rows: rows.map((r) => ({ nickname: r.nickname, xp: Number(r.xp), streak: Number(r.streak) })),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ db: false, period, rows: [] });
  }
}
