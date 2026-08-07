// BhashSMS WhatsApp sender.
//
// Sends approved WhatsApp templates via BhashSMS's GET API. Inactive until
// BHASHSMS_USER + BHASHSMS_PASS are set (Vercel env), so callers can be wired
// now and start delivering the moment the credentials land. A success response
// looks like "s.123456" / "S.123456"; anything else is an error string
// ("error", "Username/Password Incorrect…", "Marketing Templates Not Allowed").
//
// BhashSMS uses a DIFFERENT endpoint + sender per template category (confirmed
// by direct API tests against this account):
//   - auth / OTP  → sendmsg.php     + sender "BhashSoftwareLab" + stype "auth"
//   - utility     → sendmsgutil.php + sender "BUZWAP"           + stype "normal"
// Sending a utility template through sendmsg.php is rejected ("Marketing
// Templates Not Allowed"); the util endpoint + BUZWAP is what returns "S.<id>".
const AUTH_ENDPOINT = "http://bhashsms.com/api/sendmsg.php";
const UTIL_ENDPOINT = "https://bhashsms.com/api/sendmsgutil.php";

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
 * Alert the business owner on WhatsApp when a new user registers. Sends to the
 * single owner number in ADMIN_ALERT_WHATSAPP using the approved template named
 * in BHASHSMS_TEMPLATE_ADMIN_NEW_USER, with params [name, phone, city, role] in
 * that order (so the approved template's {{1}}..{{4}} map to those). No-ops —
 * like every transactional send — until BhashSMS is configured AND both env vars
 * are set, so it's safe to call from every signup path today and starts
 * delivering the moment the template name + owner number land in Vercel env.
 */
export async function notifyAdminNewUser(u: {
  name: string;
  phone?: string | null;
  city?: string | null;
  role: string;
}): Promise<void> {
  const roleLabel =
    u.role === "home-seller" ? "Home Seller" : u.role === "agent" ? "Agent / Partner" : "Home Buyer";
  await sendTemplateIfConfigured("BHASHSMS_TEMPLATE_ADMIN_NEW_USER", process.env.ADMIN_ALERT_WHATSAPP, [
    u.name,
    u.phone ?? "—",
    u.city ?? "—",
    roleLabel,
  ]);
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
  const stype = opts.stype ?? "normal";
  const isAuth = stype === "auth";
  // Endpoint + sender are paired to the template category (see top-of-file note).
  // Each sender is env-overridable without a redeploy (BHASHSMS_SENDER for auth,
  // BHASHSMS_SENDER_UTILITY for utility).
  const endpoint = isAuth ? AUTH_ENDPOINT : UTIL_ENDPOINT;
  const sender = isAuth
    ? process.env.BHASHSMS_SENDER || "BhashSoftwareLab"
    : process.env.BHASHSMS_SENDER_UTILITY || "BUZWAP";
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
    stype,
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
    const res = await fetch(`${endpoint}?${query.toString()}`, { method: "GET" });
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
