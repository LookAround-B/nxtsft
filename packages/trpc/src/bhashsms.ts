// BhashSMS WhatsApp sender.
//
// Sends approved WhatsApp templates via BhashSMS's GET API
// (http://bhashsms.com/api/sendmsg.php). Inactive until BHASHSMS_USER +
// BHASHSMS_PASS are set (Vercel env), so callers can be wired now and start
// delivering the moment the credentials land. A success response looks like
// "s.123456"; anything else is an error string ("error", "Username/Password
// Incorrect…", "Sender ID Does not Exist…").

const ENDPOINT = "http://bhashsms.com/api/sendmsg.php";

export type BhashResult = { sent: boolean; reason: string; messageId?: string };

export function bhashConfigured(): boolean {
  return Boolean(process.env.BHASHSMS_USER && process.env.BHASHSMS_PASS);
}

/**
 * Fire-and-forget transactional WhatsApp send, gated on a per-template env var
 * that holds the approved template name (e.g. BHASHSMS_TEMPLATE_NEW_LEAD_ALERT).
 * No-ops silently when the env var is unset, the recipient has no number, or the
 * send fails — so it can be dropped into any mutation WITHOUT risking the main
 * flow. Utility templates only (stype defaults to "normal"). Callers should
 * `void` it (don't await) so notifications never slow the user's request.
 */
export async function sendTemplateIfConfigured(
  templateEnvKey: string,
  to: string | null | undefined,
  params: string[] = [],
): Promise<void> {
  const template = process.env[templateEnvKey];
  if (!template || !to) return;
  try {
    const res = await sendWhatsAppTemplate({ to, template, params });
    if (!res.sent) {
      console.error(`[bhashsms] ${templateEnvKey} not delivered to ${to}: ${res.reason}`);
    }
  } catch (err) {
    console.error(`[bhashsms] ${templateEnvKey} threw:`, err instanceof Error ? err.message : err);
  }
}

/**
 * BhashSMS's WhatsApp API wants the plain 10-digit number WITHOUT the 91
 * country code — the note under every example in their WA API docs says so.
 * Strip a leading country code if the caller passed a full number.
 */
function toWhatsAppNumber(to: string): string {
  const digits = to.replace(/\D/g, "");
  return digits.length > 10 ? digits.slice(-10) : digits;
}

export async function sendWhatsAppTemplate(opts: {
  /** 10-digit Indian number, or full number with the 91 country code. */
  to: string;
  /** Approved BhashSMS WhatsApp template name (sent as the `text` param). */
  template: string;
  /** Template placeholder values ({{1}}, {{2}}…) in order → the `Params` field. */
  params?: string[];
  /** Optional document header (e.g. a PDF) — sets htype=document + url. */
  documentUrl?: string;
  /** "auth" for Authentication OTP templates; "normal" (default) for utility. */
  stype?: "normal" | "auth";
}): Promise<BhashResult> {
  const user = process.env.BHASHSMS_USER;
  const pass = process.env.BHASHSMS_PASS;
  // Sender for Authentication OTP templates is the account's registered Sender
  // ID ("BhashSoftwareLab" for this account, per BhashSMS). Utility/normal WA
  // templates instead use "BUZWAP" per their docs — set BHASHSMS_SENDER if/when
  // those go live. Kept env-configurable so changing it needs no redeploy.
  const sender = process.env.BHASHSMS_SENDER || "BhashSoftwareLab";
  if (!user || !pass) {
    console.log(`[bhashsms] not configured — skipped template "${opts.template}" to ${opts.to}`);
    return { sent: false, reason: "not configured" };
  }

  const query = new URLSearchParams({
    user,
    pass,
    sender,
    text: opts.template,
    priority: "wa", // WhatsApp
    stype: opts.stype ?? "normal",
    phone: toWhatsAppNumber(opts.to),
  });
  if (opts.params && opts.params.length > 0) {
    query.set("Params", opts.params.join(","));
  }
  if (opts.documentUrl) {
    query.set("htype", "document");
    query.set("url", opts.documentUrl);
  }

  try {
    const res = await fetch(`${ENDPOINT}?${query.toString()}`, { method: "GET" });
    const body = (await res.text()).trim();
    // Success ids start with "s." (e.g. "s.123456"); everything else is an error.
    if (res.ok && /^s\./i.test(body)) {
      return { sent: true, reason: "ok", messageId: body };
    }
    console.error(`[bhashsms] send failed for "${opts.template}" to ${opts.to}: ${body || res.status}`);
    return { sent: false, reason: body || `HTTP ${res.status}` };
  } catch (err) {
    console.error(`[bhashsms] send error: ${err instanceof Error ? err.message : "unknown"}`);
    return { sent: false, reason: err instanceof Error ? err.message : "network error" };
  }
}
