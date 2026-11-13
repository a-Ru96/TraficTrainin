/**
 * Public base URL used in emailed links. It comes from the environment, never from request
 * headers, so a forged Host header can't redirect a password-reset link to another site.
 */
export function siteUrl(): string | null {
  const explicit = process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/+$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return `https://${vercel}`;
  if (process.env.NODE_ENV !== "production") return "http://localhost:3000";
  return null;
}

export function contactEmail(): string | null {
  return process.env.NEXT_PUBLIC_CONTACT_EMAIL || null;
}
