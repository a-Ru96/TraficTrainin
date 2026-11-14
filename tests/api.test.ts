import { PGlite } from "@electric-sql/pglite";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// End-to-end tests of the real route handlers. Neon is replaced by an in-process Postgres,
// cookies by an in-memory jar and the email provider by a recorder.
const h = vi.hoisted(() => ({
  db: null as any, jar: new Map<string, string>(), sent: [] as { to: string; subject: string; text: string }[],
  emailOn: true, sendOk: true,
}));

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
  emailConfigured: () => h.emailOn,
  sendEmail: async (to: string, subject: string, text: string) => { h.sent.push({ to, subject, text }); return h.sendOk; },
}));

process.env.DATABASE_URL = "postgres://test";
process.env.AUTH_SECRET = "test-secret-0123456789abcdef";
process.env.SITE_URL = "https://roadly.test";

let routes: Record<string, any>;
beforeAll(async () => {
  h.db = new PGlite();
  routes = {
    register: (await import("@/app/api/auth/register/route")).POST,
    verify: (await import("@/app/api/auth/verify/route")).POST,
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
beforeEach(() => { h.jar.clear(); h.sent.length = 0; h.emailOn = true; h.sendOk = true; });

let ipCounter = 0;
const nextIp = () => `10.0.${Math.floor(ipCounter / 250)}.${(ipCounter++ % 250) + 1}`;
const req = (url: string, body?: unknown, method = "POST", ip = nextIp()) =>
  new Request(`http://localhost${url}`, { method, headers: { "content-type": "application/json", "x-forwarded-for": ip }, body: body === undefined ? undefined : JSON.stringify(body) });
const call = async (fn: any, r: Request) => { const res = await fn(r); return { status: res.status as number, json: await res.json() }; };

const PW = "correct horse 9";
let counter = 0;
const uniq = () => `u${++counter}`;
/** One sign-up request, nothing more. */
async function signupRaw(over: Partial<{ email: string; nickname: string; password: string }> = {}) {
  const id = uniq();
  const email = over.email ?? `${id}@example.com`;
  const r = await call(routes.register, req("/api/auth/register", { email, nickname: over.nickname ?? `Player ${id}`, password: over.password ?? PW }));
  return { email, ...r };
}
const emailedCode = () => h.sent.at(-1)?.text.match(/\b(\d{6})\b/)?.[1] ?? null;
const confirm = (email: string, code: string | null, ip = nextIp()) => call(routes.verify, req("/api/auth/verify", { email, code }, "POST", ip));
/** The normal journey: sign up, enter the emailed code. Confirming signs the person in; returns that snapshot. */
async function signup(over: Partial<{ email: string; nickname: string; password: string }> = {}) {
  const raw = await signupRaw(over);
  if (raw.status !== 200) return raw;
  const r = await confirm(raw.email, emailedCode());
  h.sent.length = 0; // tests below count the emails they trigger themselves
  return { email: raw.email, ...r };
}

describe("register", () => {
  it("after confirming the email, the account exists and logging in returns a snapshot", async () => {
    const r = await signup();
    expect(r.status).toBe(200);
    expect(r.json.user.id).toBeGreaterThan(0);
    expect(r.json.xp).toBe(0);
    expect(h.jar.get("levha_session")).toBeTruthy();
    const me = await call(routes.me, req("/api/me", undefined, "GET"));
    expect(me.json.snapshot.user.email).toBe(r.email);
  });
  it("rejects bad input", async () => {
    expect((await signupRaw({ password: "short" })).status).toBe(400);
    expect((await signupRaw({ nickname: "<script>" })).status).toBe(400);
    expect((await signupRaw({ nickname: "fuck" })).status).toBe(400);
    expect((await signupRaw({ nickname: "a" })).status).toBe(400);
    expect((await signupRaw({ email: "not-an-email" })).status).toBe(400);
    expect(h.sent.length).toBe(0);
  });
  it("rejects a duplicate email with 409 and sends nothing", async () => {
    const a = await signup();
    const b = await signupRaw({ email: a.email });
    expect(b.status).toBe(409);
    expect(h.sent.length).toBe(0);
  });
  it("allows normal nicknames incl. non-English letters", async () => {
    expect((await signupRaw({ nickname: "Ayşe Y." })).status).toBe(200);
    expect((await signupRaw({ nickname: "Scunthorpe" })).status).toBe(200);
  });
});

describe("email confirmation", () => {
  const count = async (sql: string, ...p: any[]) => (await h.db.query(sql, p)).rows[0].n as number;
  const otherThan = (code: string) => (code === "000000" ? "111111" : "000000");

  it("sign-up only emails a 6-digit code: no account, no session yet", async () => {
    const r = await signupRaw();
    expect(r.status).toBe(200);
    expect(r.json).toEqual({ pending: true, email: r.email });
    expect(h.jar.size).toBe(0);
    expect(h.sent.length).toBe(1);
    expect(h.sent[0].to).toBe(r.email);
    expect(emailedCode()).toMatch(/^\d{6}$/);
    expect(await count("SELECT COUNT(*)::int AS n FROM users WHERE email = $1", r.email)).toBe(0);
    expect((await call(routes.login, req("/api/auth/login", { email: r.email, password: PW }))).status).toBe(401);
  });
  it("stores only hashes: neither the code nor the password is in the database as plain text", async () => {
    const r = await signupRaw();
    const code = emailedCode()!;
    const row = (await h.db.query("SELECT code_hash, password_hash FROM signup_codes WHERE email = $1", [r.email])).rows[0];
    expect(row.code_hash).not.toContain(code);
    expect(row.code_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(row.password_hash).not.toContain(PW);
    expect(row.password_hash).toMatch(/^\$2[aby]\$/);
  });
  it("the right code creates the account once, signs in, and keeps the chosen nickname and password", async () => {
    const r = await signupRaw({ nickname: "Road Runner" });
    const code = emailedCode()!;
    const ok = await confirm(r.email, code);
    expect(ok.status).toBe(200);
    expect(ok.json.user.nickname).toBe("Road Runner");
    expect(h.jar.get("levha_session")).toBeTruthy();
    expect(await count("SELECT COUNT(*)::int AS n FROM user_stats s JOIN users u ON u.id = s.user_id WHERE u.email = $1", r.email)).toBe(1);
    expect(await count("SELECT COUNT(*)::int AS n FROM signup_codes WHERE email = $1", r.email)).toBe(0);
    expect((await confirm(r.email, code)).status).toBe(400); // reuse
    h.jar.clear();
    expect((await call(routes.login, req("/api/auth/login", { email: r.email, password: PW }))).status).toBe(200);
  });
  it("a wrong code is refused and creates nothing", async () => {
    const r = await signupRaw();
    expect((await confirm(r.email, otherThan(emailedCode()!))).status).toBe(400);
    expect(h.jar.size).toBe(0);
    expect(await count("SELECT COUNT(*)::int AS n FROM users WHERE email = $1", r.email)).toBe(0);
  });
  it("five wrong guesses burn the code, even if the right one comes next", async () => {
    const r = await signupRaw();
    const right = emailedCode()!;
    for (let i = 0; i < 5; i++) expect((await confirm(r.email, otherThan(right))).status).toBe(400);
    expect((await confirm(r.email, right)).status).toBe(400);
    expect(await count("SELECT COUNT(*)::int AS n FROM users WHERE email = $1", r.email)).toBe(0);
    // Signing up again gives a fresh code and a fresh allowance.
    await signupRaw({ email: r.email });
    expect((await confirm(r.email, emailedCode())).status).toBe(200);
  });
  it("an expired code is refused and creates nothing", async () => {
    const r = await signupRaw();
    const code = emailedCode()!;
    await h.db.exec("UPDATE signup_codes SET expires_at = now() - interval '1 minute'");
    expect((await confirm(r.email, code)).status).toBe(400);
    expect(await count("SELECT COUNT(*)::int AS n FROM users WHERE email = $1", r.email)).toBe(0);
  });
  it("rejects malformed codes and unknown emails", async () => {
    const r = await signupRaw();
    for (const code of ["", "12345", "1234567", "abcdef", "12 456"]) expect((await confirm(r.email, code)).status, code).toBe(400);
    expect((await confirm("nobody@example.com", "123456")).status).toBe(400);
    expect((await confirm("not-an-email", "123456")).status).toBe(400);
  });
  it("signing up again replaces the earlier code, and the newest password wins", async () => {
    const email = `${uniq()}@example.com`;
    await signupRaw({ email, password: "attacker pass 1" });
    const first = emailedCode()!;
    await signupRaw({ email, password: PW });
    const second = emailedCode()!;
    if (first !== second) expect((await confirm(email, first)).status).toBe(400);
    expect((await confirm(email, second)).status).toBe(200);
    h.jar.clear();
    expect((await call(routes.login, req("/api/auth/login", { email, password: "attacker pass 1" }))).status).toBe(401);
    expect((await call(routes.login, req("/api/auth/login", { email, password: PW }))).status).toBe(200);
  });
  it("limits confirmation emails per address (3/hour)", async () => {
    const email = `${uniq()}@example.com`;
    for (let i = 0; i < 3; i++) expect((await signupRaw({ email })).status).toBe(200);
    expect((await signupRaw({ email })).status).toBe(429);
    expect(h.sent.length).toBe(3);
  });
  it("limits sign-up requests per IP (10/hour)", async () => {
    const ip = nextIp();
    const attempt = () => call(routes.register, req("/api/auth/register", { email: `${uniq()}@example.com`, nickname: "Someone", password: PW }, "POST", ip));
    for (let i = 0; i < 10; i++) expect((await attempt()).status).toBe(200);
    expect((await attempt()).status).toBe(429);
  });
  it("throttles code guessing per IP", async () => {
    const ip = nextIp();
    for (let i = 0; i < 20; i++) expect((await confirm("nobody@example.com", "123456", ip)).status).toBe(400);
    expect((await confirm("nobody@example.com", "123456", ip)).status).toBe(429);
  });
  it("if the email can't be sent, says so and leaves nothing pending", async () => {
    h.sendOk = false;
    const email = `${uniq()}@example.com`;
    expect((await signupRaw({ email })).status).toBe(502);
    expect(await count("SELECT COUNT(*)::int AS n FROM signup_codes WHERE email = $1", email)).toBe(0);
  });
  it("without an email provider, sign-up works directly as before", async () => {
    h.emailOn = false;
    const r = await signupRaw();
    expect(r.status).toBe(200);
    expect(r.json.user.id).toBeGreaterThan(0);
    expect(h.jar.get("levha_session")).toBeTruthy();
    expect(h.sent.length).toBe(0);
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
