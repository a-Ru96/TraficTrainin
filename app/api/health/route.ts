import { NextResponse } from "next/server";
import { getSql, hasDb } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** For uptime monitors (UptimeRobot, Better Stack, ...). 200 = healthy, 503 = database configured but failing. */
export async function GET() {
  if (!hasDb()) return NextResponse.json({ ok: true, db: "not configured" });
  try {
    await getSql()`SELECT 1`;
    return NextResponse.json({ ok: true, db: "ok" });
  } catch (e) {
    console.error("health check failed", e);
    return NextResponse.json({ ok: false, db: "error" }, { status: 503 });
  }
}
