import { afterEach, describe, expect, it, vi } from "vitest";
import { isAllowedNickname } from "@/lib/moderation";
import { hashToken, newToken } from "@/lib/tokens";
import { siteUrl } from "@/lib/site";
import { levelOf } from "@/lib/util";

describe("nickname filter", () => {
  it("allows normal names, including ones that merely contain a short word", () => {
    for (const n of ["Alex", "Ayşe Y.", "Çağrı-9", "Essex_Boy", "Dickinson", "Nazir", "I am Sam", "Hancock", "Scunthorpe", "classic", "analyst", "got-it"]) {
      expect(isAllowedNickname(n), n).toBe(true);
    }
  });
  it("blocks profanity and simple obfuscation", () => {
    for (const n of ["fuck", "F.u.c.k", "sh1t", "b!tch", "FUUUUCK", "xxFuckxx", "hitler", "orospu", "s e x", "sex_pot", "a$$"]) {
      expect(isAllowedNickname(n), n).toBe(false);
    }
  });
});

describe("reset tokens", () => {
  it("are long random hex and stored only as a hash", () => {
    const a = newToken(), b = newToken();
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(a).not.toBe(b);
    expect(hashToken(a)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashToken(a)).toBe(hashToken(a));
    expect(hashToken(a)).not.toBe(a);
  });
});

describe("site url (used in emailed links)", () => {
  afterEach(() => { vi.unstubAllEnvs(); });
  it("prefers SITE_URL and strips trailing slashes", () => {
    vi.stubEnv("SITE_URL", "https://roadly.example/");
    expect(siteUrl()).toBe("https://roadly.example");
  });
  it("falls back to the Vercel production URL", () => {
    vi.stubEnv("SITE_URL", ""); vi.stubEnv("NEXT_PUBLIC_SITE_URL", ""); vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "roadly.vercel.app");
    expect(siteUrl()).toBe("https://roadly.vercel.app");
  });
  it("refuses to guess in production", () => {
    vi.stubEnv("SITE_URL", ""); vi.stubEnv("NEXT_PUBLIC_SITE_URL", ""); vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", ""); vi.stubEnv("NODE_ENV", "production");
    expect(siteUrl()).toBeNull();
  });
});

describe("levels", () => {
  it("is level 1 at 0 XP and +1 per 100 XP", () => {
    expect(levelOf(0)).toEqual({ level: 1, into: 0, next: 100 });
    expect(levelOf(99).level).toBe(1);
    expect(levelOf(100).level).toBe(2);
    expect(levelOf(250)).toEqual({ level: 3, into: 50, next: 100 });
  });
});
