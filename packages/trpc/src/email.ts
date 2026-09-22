// Transactional email via Resend's REST API. Inactive until RESEND_API_KEY and
// EMAIL_FROM are set (Vercel env), so callers can be wired now and start
// delivering the moment the key + verified sending domain land — same env-gated
// no-op pattern as bhashsms.ts. Callers should `void` these (fire-and-forget) so
// email never slows or breaks the request that triggered it.
//
// EMAIL_FROM must be a verified sender on the Resend domain, e.g.
// "NxtSft <noreply@mail.nxtsft.com>".

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const SEND_TIMEOUT_MS = 8000;

export function emailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

export async function sendEmailIfConfigured(opts: {
  to: string | null | undefined;
  subject: string;
  html: string;
  replyTo?: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from || !opts.to) return;
  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: opts.to,
        subject: opts.subject,
        html: opts.html,
        ...(opts.replyTo ? { reply_to: opts.replyTo } : {}),
      }),
      signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`[email] send failed to ${opts.to}: ${res.status} ${body}`);
    }
  } catch (err) {
    console.error(`[email] send error: ${err instanceof Error ? err.message : "unknown"}`);
  }
}
