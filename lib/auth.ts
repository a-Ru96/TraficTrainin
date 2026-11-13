import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const COOKIE = "levha_session";

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s || s === "change-me" || s.length < 16) {
    // Never sign sessions with a guessable key in production.
    if (process.env.NODE_ENV === "production") {
      throw new Error("AUTH_SECRET is missing or too short (min 16 characters). Set it in the environment variables.");
    }
    return new TextEncoder().encode("dev-only-secret-not-for-production");
  }
  return new TextEncoder().encode(s);
}

export async function createSession(uid: number) {
  const token = await new SignJWT({ uid })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function getUserId(): Promise<number | null> {
  const t = (await cookies()).get(COOKIE)?.value;
  if (!t) return null;
  try {
    const { payload } = await jwtVerify(t, secret());
    return typeof payload.uid === "number" ? payload.uid : null;
  } catch {
    return null;
  }
}

export async function clearSession() {
  (await cookies()).set(COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
}
