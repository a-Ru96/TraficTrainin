import { createHash, randomBytes } from "crypto";

/** Random URL-safe token that is emailed to the user. */
export function newToken(): string {
  return randomBytes(32).toString("hex");
}

/** Only the hash is stored, so a database leak can't be used to reset passwords. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
