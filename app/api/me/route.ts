import { NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { ensureSchema, getSnapshot, hasDb } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!hasDb()) return NextResponse.json({ db: false, snapshot: null });
  try {
    const uid = await getUserId();
    if (!uid) return NextResponse.json({ db: true, snapshot: null });
    await ensureSchema();
    return NextResponse.json({ db: true, snapshot: await getSnapshot(uid) });
  } catch (e) {
    console.error(e);
    // even if the DB is unreachable the site keeps working in guest mode
    return NextResponse.json({ db: false, snapshot: null });
  }
}
