// Transactional email. Two providers, picked by env (Vercel), both no-ops until
// configured so callers can be wired now — same env-gated pattern as bhashsms.ts.
// Callers should `void` these (fire-and-forget) so email never slows or breaks
// the request that triggered it.
//
//  1. Gmail SMTP (boss 09-28, free ~500/day) — used when SMTP_USER + SMTP_PASS
//     are set. SMTP_PASS is a Google *App Password* (16 letters, needs 2-Step
//     Verification), never the account's login password. SMTP_HOST / SMTP_PORT
//     default to smtp.gmail.com:587. Gmail sends as SMTP_USER; EMAIL_FROM may
//     set the display name, e.g. "NxtSft <nextsquarefeet.india@gmail.com>".
//     Alerts only — Gmail isn't for bulk marketing.
//  2. Resend REST API — used when RESEND_API_KEY + EMAIL_FROM are set and SMTP
//     isn't. EMAIL_FROM must be a verified Resend sender.
import nodemailer, { type Transporter } from "nodemailer";

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const SEND_TIMEOUT_MS = 8000;

const smtpConfigured = () => Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);
const resendConfigured = () => Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);

// Accounts reached only by phone get a synthetic address (customerAccount.ts:
// lead.<phone>@nxtsft.internal); report forms use @nxtsft.local; tests use
// @example.com. Never send to those — bounces hurt the sender's reputation.
const UNDELIVERABLE = /@(nxtsft\.internal|nxtsft\.local|example\.com)$/i;
export function isDeliverable(to: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to) && !UNDELIVERABLE.test(to.trim());
}

export function emailConfigured(): boolean {
  return smtpConfigured() || resendConfigured();
}

// One pooled transporter per serverless instance.
let transporter: Transporter | null = null;
function smtp(): Transporter {
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT) || 587;
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port,
      secure: port === 465, // 587 = STARTTLS
      auth: { user: process.env.SMTP_USER!, pass: process.env.SMTP_PASS!.replace(/\s+/g, "") },
      connectionTimeout: SEND_TIMEOUT_MS,
      socketTimeout: SEND_TIMEOUT_MS,
    });
  }
  return transporter;
}

export async function sendEmailIfConfigured(opts: {
  to: string | null | undefined;
  subject: string;
  html: string;
  replyTo?: string;
}): Promise<void> {
  if (!opts.to || !isDeliverable(opts.to)) return;
  try {
    if (smtpConfigured()) {
      await smtp().sendMail({
        from: process.env.EMAIL_FROM || `NxtSft <${process.env.SMTP_USER}>`,
        to: opts.to,
        subject: opts.subject,
        html: opts.html,
        ...(opts.replyTo ? { replyTo: opts.replyTo } : {}),
      });
      return;
    }
    if (!resendConfigured()) return;
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM,
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
