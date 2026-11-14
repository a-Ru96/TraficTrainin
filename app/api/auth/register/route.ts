import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { ensureSchema, getSql, hasDb, getSnapshot } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { emailConfigured, sendEmail } from "@/lib/email";
import { isAllowedNickname } from "@/lib/moderation";
import { siteUrl } from "@/lib/site";
import { hashToken, newToken } from "@/lib/tokens";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_PER_EMAIL = 3; // confirmation emails per address per hour
const MAX_PER_IP = 10; // sign-up requests per IP per hour

export async function POST(req: Request) {
  if (!hasDb()) return NextResponse.json({ error: "Accounts are unavailable right now. You can continue as a guest." }, { status: 503 });
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  const email = String(body.email || "").trim().toLowerCase();
  const nickname = String(body.nickname || "").trim();
  const password = String(body.password || "");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
  if (!/^[\p{L}\p{N} ._-]{2,20}$/u.test(nickname)) return NextResponse.json({ error: "Nickname must be 2-20 characters: letters, numbers, spaces, . _ -" }, { status: 400 });
  if (!isAllowedNickname(nickname)) return NextResponse.json({ error: "Please choose a different nickname." }, { status: 400 });
  if (password.length < 8 || password.length > 100) return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });

  // With email set up, the account is only created after the person opens the emailed link.
  // Without it (e.g. local development) sign-up works directly, as before.
  const base = siteUrl();
  const confirmByEmail = emailConfigured() && !!base;

  try {
    await ensureSchema();
    const sql = getSql();

    if (confirmByEmail) {
      const taken = (await sql`SELECT 1 FROM users WHERE email = ${email}`) as Record<string, any>[];
      if (taken.length) return NextResponse.json({ error: "This email is already registered." }, { status: 409 });

      const ip = (req.headers.get("x-forwarded-for") || "unknown").split(",")[0].trim().slice(0, 64);
      const emailKey = `signup-email:${email}`;
      const ipKey = `signup-ip:${ip}`;
      const counts = (await sql`
        SELECT key, COUNT(*)::int AS n FROM login_attempts
        WHERE key IN (${emailKey}, ${ipKey}) AND at > now() - interval '1 hour' GROUP BY key`) as Record<string, any>[];
      const n = (k: string) => counts.find((c) => c.key === k)?.n ?? 0;
      if (n(emailKey) >= MAX_PER_EMAIL || n(ipKey) >= MAX_PER_IP) {
        return NextResponse.json({ error: "Too many sign-up attempts. Try again in an hour." }, { status: 429 });
      }
      await sql`INSERT INTO login_attempts (key) VALUES (${emailKey}), (${ipKey})`;
      await sql`DELETE FROM login_attempts WHERE at < now() - interval '1 day'`;
      await sql`DELETE FROM pending_signups WHERE expires_at < now()`;

      const token = newToken();
      const hash = await bcrypt.hash(password, 10);
      // A new request for the same address replaces the previous pending one (and its link).
      await sql`INSERT INTO pending_signups (email, nickname, password_hash, token_hash, expires_at)
        VALUES (${email}, ${nickname}, ${hash}, ${hashToken(token)}, now() + interval '24 hours')
        ON CONFLICT (email) DO UPDATE SET nickname = EXCLUDED.nickname, password_hash = EXCLUDED.password_hash,
          token_hash = EXCLUDED.token_hash, expires_at = EXCLUDED.expires_at, created_at = now()`;
      const sent = await sendEmail(
        email,
        "Confirm your Roadly email",
        `Welcome to Roadly! Open this link within 24 hours to confirm your email and finish creating your account:\n` +
          `${base}/verify?token=${token}\n\n` +
          `If you didn't sign up, ignore this email. No account will be created.`
      );
      if (!sent) {
        await sql`DELETE FROM pending_signups WHERE email = ${email}`;
        return NextResponse.json({ error: "We couldn't send the confirmation email. Please try again shortly." }, { status: 502 });
      }
      return NextResponse.json({ pending: true, email });
    }

    const hash = await bcrypt.hash(password, 10);
    const rows = (await sql`INSERT INTO users (email, nickname, password_hash) VALUES (${email}, ${nickname}, ${hash}) RETURNING id`) as Record<string, any>[];
    const uid = rows[0].id as number;
    await sql`INSERT INTO user_stats (user_id) VALUES (${uid})`;
    await createSession(uid);
    return NextResponse.json(await getSnapshot(uid));
  } catch (e: any) {
    if (e?.code === "23505") return NextResponse.json({ error: "This email is already registered." }, { status: 409 });
    console.error(e);
    return NextResponse.json({ error: "Server error, please try again shortly." }, { status: 500 });
  }
}
