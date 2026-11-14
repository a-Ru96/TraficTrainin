import { createHash, randomBytes, randomInt, timingSafeEqual } from "crypto";

/** Random URL-safe token that is emailed to the user. */
export function newToken(): string {
  return randomBytes(32).toString("hex");
}

/** Only the hash is stored, so a database leak can't be used to reset passwords. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Six-digit confirmation code for sign-up. */
export function newCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

/** Codes are short, so the hash is tied to the email address. */
export function hashCode(email: string, code: string): string {
  return createHash("sha256").update(`${email}:${code}`).digest("hex");
}

export function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
