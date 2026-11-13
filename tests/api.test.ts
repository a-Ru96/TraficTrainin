import { PGlite } from "@electric-sql/pglite";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// End-to-end tests of the real route handlers. Neon is replaced by an in-process Postgres,
// cookies by an in-memory jar and the email provider by a recorder.
const h = vi.hoisted(() => ({ db: null as any, jar: new Map<string, string>(), sent: [] as { to: string; subject: string; text: string }[] }));

vi.mock("@neondatabase/serverless", () => ({
  neon: () => async (strings: TemplateStringsArray, ...vals: any[]) => {
    let text = "";
    strings.forEach((s, i) => { text += s + (i < vals.length ? `$${i + 1}` : ""); });
    return (await h.db.query(text, vals)).rows;
  },
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (n: string) => (h.jar.has(n) ? { name: n, value: h.jar.get(n) } : undefined),
    set: (n: string, v: string, o?: { maxAge?: number }) => { if (o?.maxAge === 0 || v === "") h.jar.delete(n); else h.jar.set(n, v); },
  }),
}));
vi.mock("@/lib/email", () => ({
  emailConfigured: () => true,
  sendEmail: async (to: string, subject: string, text: string) => { h.sent.push({ to, subject, text }); return true; },
}));

process.env.DATABASE_URL = "postgres://test";
process.env.AUTH_SECRET = "test-secret-0123456789abcdef";
process.env.SITE_URL = "https://roadly.test";

let routes: Record<string, any>;
beforeAll(async () => {
  h.db = new PGlite();
  routes = {
    register: (await import("@/app/api/auth/register/route")).POST,
    login: (await import("@/app/api/auth/login/route")).POST,
    logout: (await import("@/app/api/auth/logout/route")).POST,
    forgot: (await import("@/app/api/auth/forgot/route")).POST,
    reset: (await import("@/app/api/auth/reset/route")).POST,
    me: (await import("@/app/api/me/route")).GET,
    progress: (await import("@/app/api/progress/route")).POST,
    leaderboard: (await import("@/app/api/leaderboard/route")).GET,
    deleteAccount: (await import("@/app/api/account/route")).DELETE,
    health: (await import("@/app/api/health/route")).GET,
  };
});
beforeEach(() => { h.jar.clear(); h.sent.length = 0; });

let ipCounter = 0;
const nextIp = () => `10.0.${Math.floor(ipCounter / 250)}.${(ipCounter++ % 250) + 1}`;
const req = (url: string, body?: unknown, method = "POST", ip = nextIp()) =>
  new Request(`http://localhost${url}`, { method, headers: { "content-type": "application/json", "x-forwarded-for": ip }, body: body === undefined ? undefined : JSON.stringify(body) });
const call = async (fn: any, r: Request) => { const res = await fn(r); return { status: res.status as number, json: await res.json() }; };

const PW = "correct horse 9";
let counter = 0;
const uniq = () => `u${++counter}`;
async function signup(over: Partial<{ email: string; nickname: string; password: string }> = {}) {
  const id = uniq();
  const email = over.email ?? `${id}@example.com`;
  const r = await call(routes.register, req("/api/auth/register", { email, nickname: over.nickname ?? `Player ${id}`, password: over.password ?? PW }));
  return { email, ...r };
}

describe("register", () => {
  it("creates an account, signs in via cookie and returns a snapshot", async () => {
    const r = await signup();
    expect(r.status).toBe(200);
    expect(r.json.user.id).toBeGreaterThan(0);
    expect(r.json.xp).toBe(0);
    expect(h.jar.get("levha_session")).toBeTruthy();
    const me = await call(routes.me, req("/api/me", undefined, "GET"));
    expect(me.json.snapshot.user.email).toBe(r.email);
  });
  it("rejects bad input", async () => {
    expect((await signup({ password: "short" })).status).toBe(400);
    expect((await signup({ nickname: "<script>" })).status).toBe(400);
    expect((await signup({ nickname: "fuck" })).status).toBe(400);
    expect((await signup({ nickname: "a" })).status).toBe(400);
    expect((await signup({ email: "not-an-email" })).status).toBe(400);
  });
  it("rejects a duplicate email with 409", async () => {
    const a = await signup();
    const b = await signup({ email: a.email });
    expect(b.status).toBe(409);
  });
  it("allows normal nicknames incl. non-English letters", async () => {
    expect((await signup({ nickname: "Ayşe Y." })).status).toBe(200);
    expect((await signup({ nickname: "Scunthorpe" })).status).toBe(200);
  });
});

describe("login and sessions", () => {
  it("logs in with the right password and not with a wrong one", async () => {
    const { email } = await signup(); h.jar.clear();
    expect((await call(routes.login, req("/api/auth/login", { email, password: "wrong password" }))).status).toBe(401);
    expect(h.jar.size).toBe(0);
    const ok = await call(routes.login, req("/api/auth/login", { email, password: PW }));
    expect(ok.status).toBe(200);
    expect(h.jar.get("levha_session")).toBeTruthy();
  });
  it("is case-insensitive on email", async () => {
    const { email } = await signup(); h.jar.clear();
    expect((await call(routes.login, req("/api/auth/login", { email: email.toUpperCase(), password: PW }))).status).toBe(200);
  });
  it("logout clears the session", async () => {
    await signup();
    expect(h.jar.size).toBe(1);
    await call(routes.logout, req("/api/auth/logout"));
    expect(h.jar.size).toBe(0);
    const me = await call(routes.me, req("/api/me", undefined, "GET"));
    expect(me.json.snapshot).toBeNull();
  });
  it("blocks after 8 failed attempts, even with the right password, and says so with 429", async () => {
    const { email } = await signup(); h.jar.clear();
    const ip = nextIp();
    for (let i = 0; i < 8; i++) expect((await call(routes.login, req("/api/auth/login", { email, password: "nope nope nope" }, "POST", ip))).status).toBe(401);
    const blocked = await call(routes.login, req("/api/auth/login", { email, password: PW }, "POST", nextIp()));
    expect(blocked.status).toBe(429);
    expect(h.jar.size).toBe(0);
  });
  it("a successful login resets the email counter", async () => {
    const { email } = await signup(); h.jar.clear();
    for (let i = 0; i < 5; i++) await call(routes.login, req("/api/auth/login", { email, password: "nope nope nope" }));
    expect((await call(routes.login, req("/api/auth/login", { email, password: PW }))).status).toBe(200);
    for (let i = 0; i < 5; i++) expect((await call(routes.login, req("/api/auth/login", { email, password: "nope nope nope" }))).status).toBe(401);
  });
});

describe("progress", () => {
  it("requires a session", async () => {
    expect((await call(routes.progress, req("/api/progress", { xp: 10 }))).status).toBe(401);
  });
  it("adds XP, remembers known cards and tracks the streak", async () => {
    await signup();
    const r = await call(routes.progress, req("/api/progress", { xp: 12, known: { "s:stop": true, "s:giveway": false } }));
    expect(r.status).toBe(200);
    expect(r.json.xp).toBe(12);
    expect(r.json.streak).toBe(1);
    expect(r.json.known).toEqual({ "s:stop": true, "s:giveway": false });
  });
  it("caps a single request and the whole day", async () => {
    await signup();
    expect((await call(routes.progress, req("/api/progress", { xp: 99999 }))).json.xp).toBe(300);
    let last = 0;
    for (let i = 0; i < 15; i++) last = (await call(routes.progress, req("/api/progress", { xp: 300 }))).json.xp;
    expect(last).toBe(3000);
  });
  it("merges guest progress once, bypassing the cap", async () => {
    await signup();
    const r = await call(routes.progress, req("/api/progress", { merge: true, xp: 4000, known: { "s:stop": true } }));
    expect(r.json.xp).toBe(4000);
  });
  it("ignores junk input", async () => {
    await signup();
    const r = await call(routes.progress, req("/api/progress", { xp: "lots", known: { x: "yes", "s:ok": true }, result: { mode: "quiz-all", score: 99, total: 10 } }));
    expect(r.status).toBe(200);
    expect(r.json.xp).toBe(0);
    expect(r.json.known).toEqual({ "s:ok": true });
  });
});

describe("leaderboard", () => {
  it("lists users by period and includes ids", async () => {
    const a = await signup({ nickname: "Top Player" });
    await call(routes.progress, req("/api/progress", { xp: 250 }));
    for (const period of ["daily", "monthly", "all"]) {
      const r = await call(routes.leaderboard, req(`/api/leaderboard?period=${period}`, undefined, "GET"));
      expect(r.json.db).toBe(true);
      const row = r.json.rows.find((x: any) => x.id === a.json.user.id);
      expect(row, period).toBeTruthy();
      expect(row.xp).toBeGreaterThanOrEqual(250);
    }
  });
});

describe("password reset", () => {
  const linkToken = () => {
    const m = h.sent.at(-1)!.text.match(/https:\/\/roadly\.test\/reset\?token=([0-9a-f]{64})/);
    return m ? m[1] : null;
  };

  it("answers the same for unknown emails and sends nothing", async () => {
    const r = await call(routes.forgot, req("/api/auth/forgot", { email: "nobody@example.com" }));
    expect(r.status).toBe(200);
    expect(r.json).toEqual({ ok: true });
    expect(h.sent.length).toBe(0);
  });
  it("sends a link, lets you set a new password once, and the old password stops working", async () => {
    const { email } = await signup(); h.jar.clear();
    expect((await call(routes.forgot, req("/api/auth/forgot", { email }))).status).toBe(200);
    expect(h.sent.length).toBe(1);
    expect(h.sent[0].to).toBe(email);
    const token = linkToken()!;
    expect(token).toBeTruthy();

    expect((await call(routes.reset, req("/api/auth/reset", { token, password: "short" }))).status).toBe(400); // weak password doesn't burn the token
    const ok = await call(routes.reset, req("/api/auth/reset", { token, password: "a brand new pass 1" }));
    expect(ok.status).toBe(200);
    expect((await call(routes.reset, req("/api/auth/reset", { token, password: "another pass 22" }))).status).toBe(400); // reuse

    expect((await call(routes.login, req("/api/auth/login", { email, password: PW }))).status).toBe(401);
    expect((await call(routes.login, req("/api/auth/login", { email, password: "a brand new pass 1" }))).status).toBe(200);
  });
  it("rejects malformed and forged tokens", async () => {
    for (const token of ["", "abc", "z".repeat(64), "0".repeat(64)]) {
      expect((await call(routes.reset, req("/api/auth/reset", { token, password: "a brand new pass 1" }))).status, token).toBe(400);
    }
  });
  it("a new request invalidates the previous link", async () => {
    const { email } = await signup();
    await call(routes.forgot, req("/api/auth/forgot", { email }));
    const first = linkToken()!;
    await call(routes.forgot, req("/api/auth/forgot", { email }));
    const second = linkToken()!;
    expect(first).not.toBe(second);
    expect((await call(routes.reset, req("/api/auth/reset", { token: first, password: "a brand new pass 1" }))).status).toBe(400);
    expect((await call(routes.reset, req("/api/auth/reset", { token: second, password: "a brand new pass 1" }))).status).toBe(200);
  });
  it("an expired link is refused", async () => {
    const { email } = await signup();
    await call(routes.forgot, req("/api/auth/forgot", { email }));
    const token = linkToken()!;
    await h.db.exec("UPDATE password_resets SET expires_at = now() - interval '1 minute'");
    expect((await call(routes.reset, req("/api/auth/reset", { token, password: "a brand new pass 1" }))).status).toBe(400);
  });
  it("limits reset emails per address (3/hour)", async () => {
    const { email } = await signup();
    for (let i = 0; i < 3; i++) expect((await call(routes.forgot, req("/api/auth/forgot", { email }))).status).toBe(200);
    expect((await call(routes.forgot, req("/api/auth/forgot", { email }))).status).toBe(429);
    expect(h.sent.length).toBe(3);
  });
});

describe("delete account", () => {
  it("needs a session and the right password, then removes everything", async () => {
    const { email, json } = await signup();
    const uid = json.user.id;
    await call(routes.progress, req("/api/progress", { xp: 40, known: { "s:stop": true }, result: { mode: "quiz-all", score: 6, total: 10 } }));

    expect((await call(routes.deleteAccount, req("/api/account", { password: "wrong password" }, "DELETE"))).status).toBe(401);
    expect(h.jar.size).toBe(1); // still signed in after a failed attempt

    const del = await call(routes.deleteAccount, req("/api/account", { password: PW }, "DELETE"));
    expect(del.status).toBe(200);
    expect(h.jar.size).toBe(0);

    for (const t of ["users", "user_stats", "card_progress", "xp_log", "quiz_results"]) {
      const col = t === "users" ? "id" : "user_id";
      expect((await h.db.query(`SELECT COUNT(*)::int AS n FROM ${t} WHERE ${col} = $1`, [uid])).rows[0].n, t).toBe(0);
    }
    expect((await call(routes.login, req("/api/auth/login", { email, password: PW }))).status).toBe(401);
  });
  it("is refused when signed out", async () => {
    expect((await call(routes.deleteAccount, req("/api/account", { password: PW }, "DELETE"))).status).toBe(401);
  });
});

describe("health", () => {
  it("reports ok when the database answers", async () => {
    const r = await call(routes.health, req("/api/health", undefined, "GET"));
    expect(r).toEqual({ status: 200, json: { ok: true, db: "ok" } });
  });
});
