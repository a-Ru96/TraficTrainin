import { NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { ensureSchema, getSql, getSnapshot, hasDb } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DAILY_XP_CAP = 3000; // far above any realistic day of studying

export async function POST(req: Request) {
  if (!hasDb()) return NextResponse.json({ error: "db" }, { status: 503 });
  const uid = await getUserId();
  if (!uid) return NextResponse.json({ error: "auth" }, { status: 401 });
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "bad" }, { status: 400 }); }

  try {
    await ensureSchema();
    const sql = getSql();
    const merge = body.merge === true; // when moving guest data into the account
    const maxGain = merge ? 20000 : 300;
    const requested = Math.max(0, Math.min(maxGain, Math.floor(Number(body.xp) || 0)));
    // Server-side daily cap, so a forged request can't inflate the leaderboard.
    let gain = requested;
    if (!merge && requested > 0) {
      const t = (await sql`SELECT COALESCE(SUM(xp), 0)::int AS s FROM xp_log WHERE user_id = ${uid} AND day = CURRENT_DATE`) as Record<string, any>[];
      gain = Math.max(0, Math.min(requested, DAILY_XP_CAP - Number(t[0]?.s ?? 0)));
    }

    await sql`INSERT INTO user_stats (user_id) VALUES (${uid}) ON CONFLICT DO NOTHING`;
    await sql`UPDATE user_stats SET
      xp = xp + ${gain},
      streak = CASE WHEN last_day = CURRENT_DATE THEN streak
                    WHEN last_day = CURRENT_DATE - 1 THEN streak + 1
                    ELSE 1 END,
      last_day = CURRENT_DATE
      WHERE user_id = ${uid}`;

    // Daily XP log feeds the daily/monthly leaderboards. Guest XP being merged is not logged,
    // so it doesn't count as activity "today".
    if (!merge && gain > 0) {
      await sql`INSERT INTO xp_log (user_id, day, xp) VALUES (${uid}, CURRENT_DATE, ${gain})
        ON CONFLICT (user_id, day) DO UPDATE SET xp = xp_log.xp + EXCLUDED.xp`;
    }

    if (body.known && typeof body.known === "object") {
      const entries = Object.entries(body.known as Record<string, unknown>)
        .filter(([k, v]) => typeof k === "string" && k.length < 60 && typeof v === "boolean")
        .slice(0, 300);
      if (entries.length) {
        const ids = entries.map(([k]) => k);
        const vals = entries.map(([, v]) => v as boolean);
        await sql`INSERT INTO card_progress (user_id, card_id, known)
          SELECT ${uid}, t.k, t.v FROM unnest(${ids}::text[], ${vals}::boolean[]) AS t(k, v)
          ON CONFLICT (user_id, card_id) DO UPDATE SET known = EXCLUDED.known, updated_at = now()`;
      }
    }

    const r = body.result;
    if (r && typeof r.mode === "string") {
      const total = Math.max(0, Math.min(100, Math.floor(Number(r.total) || 0)));
      const score = Math.max(0, Math.min(total, Math.floor(Number(r.score) || 0)));
      await sql`INSERT INTO quiz_results (user_id, mode, score, total) VALUES (${uid}, ${String(r.mode).slice(0, 20)}, ${score}, ${total})`;
    }
    return NextResponse.json(await getSnapshot(uid));
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "server" }, { status: 500 });
  }
}
