import fs from "fs";
import path from "path";
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";
import { hashToken, newToken } from "@/lib/tokens";

// Runs the real schema statements from lib/db.ts and the same queries the API routes use,
// against an in-process Postgres (PGlite), so SQL mistakes are caught without a Neon database.
let db: PGlite;
const sql = async (strings: TemplateStringsArray, ...vals: any[]) => {
  let text = "";
  strings.forEach((s, i) => { text += s + (i < vals.length ? `$${i + 1}` : ""); });
  return (await db.query(text, vals)).rows as Record<string, any>[];
};

beforeAll(async () => {
  db = new PGlite();
  const src = fs.readFileSync(path.resolve(process.cwd(), "lib/db.ts"), "utf8");
  const statements = [...src.matchAll(/await sql`([\s\S]*?)`;/g)].map((m) => m[1]);
  for (const s of statements) await db.exec(s);
});

async function newUser(email: string, nick = "Alex") {
  const id = (await sql`INSERT INTO users (email, nickname, password_hash) VALUES (${email}, ${nick}, ${"hash"}) RETURNING id`)[0].id as number;
  await sql`INSERT INTO user_stats (user_id) VALUES (${id})`;
  return id;
}

describe("schema", () => {
  it("is idempotent (can run on every cold start)", async () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "lib/db.ts"), "utf8");
    for (const m of src.matchAll(/await sql`([\s\S]*?)`;/g)) await db.exec(m[1]);
  });
  it("matches db/schema.sql (same tables)", async () => {
    const tables = (await sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY 1`).map((r) => r.table_name);
    const file = fs.readFileSync(path.resolve(process.cwd(), "db/schema.sql"), "utf8");
    const declared = [...file.matchAll(/CREATE TABLE IF NOT EXISTS (\w+)/g)].map((m) => m[1]).sort();
    expect(declared).toEqual(tables);
  });
});

describe("registration", () => {
  it("rejects a duplicate email with Postgres code 23505", async () => {
    await newUser("dupe@x.co");
    await expect(sql`INSERT INTO users (email, nickname, password_hash) VALUES (${"dupe@x.co"}, ${"B"}, ${"h"})`).rejects.toMatchObject({ code: "23505" });
  });
});

describe("login throttle", () => {
  const WINDOW_MIN = 15;
  const count = async (key: string) =>
    (await sql`SELECT COUNT(*)::int AS n FROM login_attempts WHERE key = ${key} AND at > now() - (${WINDOW_MIN} * interval '1 minute')`)[0].n as number;

  it("counts recent failures only", async () => {
    const key = "email:throttle@x.co";
    for (let i = 0; i < 8; i++) await sql`INSERT INTO login_attempts (key) VALUES (${key})`;
    await sql`INSERT INTO login_attempts (key, at) VALUES (${key}, now() - interval '20 minutes')`;
    expect(await count(key)).toBe(8);
  });
  it("clears the email key after a successful login", async () => {
    const key = "email:ok@x.co";
    await sql`INSERT INTO login_attempts (key) VALUES (${key})`;
    await sql`DELETE FROM login_attempts WHERE key = ${key}`;
    expect(await count(key)).toBe(0);
  });
});

describe("XP, daily cap and streak", () => {
  const CAP = 3000;
  async function addXp(uid: number, requested: number, merge = false) {
    let gain = requested;
    if (!merge && requested > 0) {
      const t = await sql`SELECT COALESCE(SUM(xp), 0)::int AS s FROM xp_log WHERE user_id = ${uid} AND day = CURRENT_DATE`;
      gain = Math.max(0, Math.min(requested, CAP - Number(t[0]?.s ?? 0)));
    }
    await sql`INSERT INTO user_stats (user_id) VALUES (${uid}) ON CONFLICT DO NOTHING`;
    await sql`UPDATE user_stats SET xp = xp + ${gain},
        streak = CASE WHEN last_day = CURRENT_DATE THEN streak WHEN last_day = CURRENT_DATE - 1 THEN streak + 1 ELSE 1 END,
        last_day = CURRENT_DATE WHERE user_id = ${uid}`;
    if (!merge && gain > 0) {
      await sql`INSERT INTO xp_log (user_id, day, xp) VALUES (${uid}, CURRENT_DATE, ${gain})
        ON CONFLICT (user_id, day) DO UPDATE SET xp = xp_log.xp + EXCLUDED.xp`;
    }
    return gain;
  }
  const stat = async (uid: number) => (await sql`SELECT xp, streak FROM user_stats WHERE user_id = ${uid}`)[0];

  it("applies gains, starts the streak and never exceeds the daily cap", async () => {
    const uid = await newUser("xp@x.co");
    expect(await addXp(uid, 10)).toBe(10);
    expect((await stat(uid)).streak).toBe(1);
    for (let i = 0; i < 15; i++) await addXp(uid, 300);
    const logged = (await sql`SELECT SUM(xp)::int AS s FROM xp_log WHERE user_id = ${uid} AND day = CURRENT_DATE`)[0].s;
    expect(logged).toBe(CAP);
    expect(await addXp(uid, 300)).toBe(0);
    expect((await stat(uid)).xp).toBe(CAP);
  });
  it("merging guest XP bypasses the cap and is not logged as today's activity", async () => {
    const uid = await newUser("merge@x.co");
    expect(await addXp(uid, 5000, true)).toBe(5000);
    expect((await sql`SELECT COUNT(*)::int AS n FROM xp_log WHERE user_id = ${uid}`)[0].n).toBe(0);
  });
  it("extends the streak after yesterday and resets it after a gap", async () => {
    const uid = await newUser("streak@x.co");
    await db.exec(`UPDATE user_stats SET last_day = CURRENT_DATE - 1, streak = 4 WHERE user_id = ${uid}`);
    await addXp(uid, 0, true);
    expect((await stat(uid)).streak).toBe(5);
    await db.exec(`UPDATE user_stats SET last_day = CURRENT_DATE - 3 WHERE user_id = ${uid}`);
    await addXp(uid, 0, true);
    expect((await stat(uid)).streak).toBe(1);
  });
});

describe("leaderboard queries", () => {
  it("rank by period and expose the user id", async () => {
    const a = await newUser("lb-a@x.co", "Sam");
    const b = await newUser("lb-b@x.co", "Sam"); // same nickname on purpose
    await sql`UPDATE user_stats SET xp = 100, streak = 1 WHERE user_id = ${a}`;
    await sql`UPDATE user_stats SET xp = 60, streak = 2 WHERE user_id = ${b}`;
    await sql`INSERT INTO xp_log (user_id, day, xp) VALUES (${a}, CURRENT_DATE, 10), (${b}, CURRENT_DATE, 40), (${b}, date_trunc('month', CURRENT_DATE)::date, 5)`;
    const daily = await sql`
      SELECT u.id, u.nickname, SUM(l.xp) AS xp FROM xp_log l JOIN users u ON u.id = l.user_id
      WHERE l.day = CURRENT_DATE AND u.id IN (${a}, ${b}) GROUP BY u.id, u.nickname HAVING SUM(l.xp) > 0 ORDER BY xp DESC, u.id ASC`;
    expect(daily.map((r) => r.id)).toEqual([b, a]);
    const all = await sql`SELECT u.id, s.xp FROM user_stats s JOIN users u ON u.id = s.user_id WHERE s.xp > 0 AND u.id IN (${a}, ${b}) ORDER BY s.xp DESC`;
    expect(all.map((r) => r.id)).toEqual([a, b]);
    expect(new Set(all.map((r) => r.id)).size).toBe(2); // ids keep two "Sam"s apart
  });
});

describe("card progress upsert", () => {
  it("inserts and overwrites in one statement", async () => {
    const uid = await newUser("cards@x.co");
    const upsert = (ids: string[], vals: boolean[]) => sql`
      INSERT INTO card_progress (user_id, card_id, known)
      SELECT ${uid}, t.k, t.v FROM unnest(${ids}::text[], ${vals}::boolean[]) AS t(k, v)
      ON CONFLICT (user_id, card_id) DO UPDATE SET known = EXCLUDED.known, updated_at = now()`;
    await upsert(["s:stop", "s:giveway"], [true, false]);
    await upsert(["s:giveway"], [true]);
    const rows = await sql`SELECT card_id, known FROM card_progress WHERE user_id = ${uid} ORDER BY card_id`;
    expect(rows).toEqual([{ card_id: "s:giveway", known: true }, { card_id: "s:stop", known: true }]);
  });
});

describe("password reset", () => {
  const issue = async (uid: number, interval = "1 hour") => {
    const token = newToken();
    await sql`DELETE FROM password_resets WHERE user_id = ${uid}`;
    await db.query(`INSERT INTO password_resets (token_hash, user_id, expires_at) VALUES ($1, $2, now() + interval '${interval}')`, [hashToken(token), uid]);
    return token;
  };
  // same atomic claim the route uses
  const claim = (token: string) => sql`DELETE FROM password_resets WHERE token_hash = ${hashToken(token)} AND expires_at > now() RETURNING user_id`;

  it("stores only a hash, never the token", async () => {
    const uid = await newUser("reset1@x.co");
    const token = await issue(uid);
    const stored = (await sql`SELECT token_hash FROM password_resets WHERE user_id = ${uid}`)[0].token_hash;
    expect(stored).not.toContain(token);
    expect(stored).toBe(hashToken(token));
  });
  it("can be used exactly once", async () => {
    const uid = await newUser("reset2@x.co");
    const token = await issue(uid);
    expect((await claim(token)).map((r) => r.user_id)).toEqual([uid]);
    expect(await claim(token)).toEqual([]);
  });
  it("two simultaneous claims: only one wins", async () => {
    const uid = await newUser("reset3@x.co");
    const token = await issue(uid);
    const results = await Promise.all([claim(token), claim(token)]);
    expect(results.filter((r) => r.length === 1).length).toBe(1);
  });
  it("does not work after it expires", async () => {
    const uid = await newUser("reset4@x.co");
    const token = await issue(uid, "-1 minute");
    expect(await claim(token)).toEqual([]);
  });
  it("a new request replaces the old link", async () => {
    const uid = await newUser("reset5@x.co");
    const first = await issue(uid);
    const second = await issue(uid);
    expect(await claim(first)).toEqual([]);
    expect((await claim(second)).length).toBe(1);
  });
  it("an unknown token claims nothing", async () => {
    expect(await claim(newToken())).toEqual([]);
  });
});

describe("account deletion", () => {
  it("removes the user and every related row", async () => {
    const uid = await newUser("gone@x.co");
    await sql`INSERT INTO card_progress (user_id, card_id, known) VALUES (${uid}, ${"s:stop"}, ${true})`;
    await sql`INSERT INTO xp_log (user_id, day, xp) VALUES (${uid}, CURRENT_DATE, 20)`;
    await sql`INSERT INTO quiz_results (user_id, mode, score, total) VALUES (${uid}, ${"quiz-all"}, 7, 10)`;
    await sql`INSERT INTO password_resets (token_hash, user_id, expires_at) VALUES (${hashToken("t")}, ${uid}, now() + interval '1 hour')`;
    await sql`INSERT INTO login_attempts (key) VALUES (${"email:gone@x.co"}), (${"reset-email:gone@x.co"})`;

    await sql`DELETE FROM users WHERE id = ${uid}`;
    await sql`DELETE FROM login_attempts WHERE key IN (${"email:gone@x.co"}, ${"reset-email:gone@x.co"})`;

    for (const t of ["user_stats", "card_progress", "xp_log", "quiz_results", "password_resets"]) {
      expect((await db.query<{ n: number }>(`SELECT COUNT(*)::int AS n FROM ${t} WHERE user_id = $1`, [uid])).rows[0].n, t).toBe(0);
    }
    expect((await sql`SELECT COUNT(*)::int AS n FROM login_attempts WHERE key LIKE ${"%gone@x.co"}`)[0].n).toBe(0);
    expect((await sql`SELECT COUNT(*)::int AS n FROM users WHERE id = ${uid}`)[0].n).toBe(0);
  });
});
