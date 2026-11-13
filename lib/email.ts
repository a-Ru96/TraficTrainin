/**
 * Minimal email sender using the Resend HTTP API (no extra dependency).
 * Configure RESEND_API_KEY and EMAIL_FROM. Without them, password reset is reported as unavailable.
 */
export function emailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY && !!process.env.EMAIL_FROM;
}

export async function sendEmail(to: string, subject: string, text: string): Promise<boolean> {
  if (!emailConfigured()) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: process.env.EMAIL_FROM, to: [to], subject, text }),
    });
    if (!res.ok) console.error("Email provider error", res.status, await res.text().catch(() => ""));
    return res.ok;
  } catch (e) {
    console.error("Email send failed", e);
    return false;
  }
}
