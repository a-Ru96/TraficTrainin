import { neon } from "@neondatabase/serverless";

export function hasDb() {
  return !!process.env.DATABASE_URL;
}

type Sql = ReturnType<typeof neon>;
let _sql: Sql | null = null;
export function getSql(): Sql {
  if (!_sql) _sql = neon(process.env.DATABASE_URL as string);
  return _sql;
}

let ready: Promise<void> | null = null;
/** Creates the tables on first use if they don't exist (idempotent). */
export function ensureSchema(): Promise<void> {
  if (!ready) {
    const sql = getSql();
    ready = (async () => {
      await sql`CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY, email TEXT UNIQUE NOT NULL, nickname TEXT NOT NULL,
        password_hash TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now())`;
      await sql`CREATE TABLE IF NOT EXISTS user_stats (
        user_id INT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        xp INT NOT NULL DEFAULT 0, streak INT NOT NULL DEFAULT 0, last_day DATE)`;
      await sql`CREATE TABLE IF NOT EXISTS card_progress (
        user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        card_id TEXT NOT NULL, known BOOLEAN NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(), PRIMARY KEY (user_id, card_id))`;
      await sql`CREATE TABLE IF NOT EXISTS quiz_results (
        id SERIAL PRIMARY KEY, user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        mode TEXT NOT NULL, score INT NOT NULL, total INT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now())`;
    })().catch((e) => {
      ready = null;
      throw e;
    });
  }
  return ready;
}

export interface Snapshot {
  user: { id: number; email: string; nickname: string };
  xp: number;
  streak: number;
  known: Record<string, boolean>;
}

export async function getSnapshot(uid: number): Promise<Snapshot | null> {
  const sql = getSql();
  const u = (await sql`
    SELECT u.id, u.email, u.nickname, COALESCE(s.xp,0) AS xp, COALESCE(s.streak,0) AS streak
    FROM users u LEFT JOIN user_stats s ON s.user_id = u.id WHERE u.id = ${uid}`) as Record<string, any>[];
  if (!u.length) return null;
  const k = (await sql`SELECT card_id, known FROM card_progress WHERE user_id = ${uid}`) as Record<string, any>[];
  const known: Record<string, boolean> = {};
  for (const r of k) known[r.card_id] = r.known;
  const r = u[0];
  return {
    user: { id: r.id, email: r.email, nickname: r.nickname },
    xp: Number(r.xp),
    streak: Number(r.streak),
    known,
  };
}
