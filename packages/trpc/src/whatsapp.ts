// Meta WhatsApp Cloud API sender (LA-341).
//
// Inactive until WHATSAPP_ACCESS_TOKEN + WHATSAPP_PHONE_NUMBER_ID are set
// (Meta Business > WhatsApp > API Setup) and the message templates are
// approved — see docs/whatsapp-templates.md for the exact templates to
// submit. Until then every call is a logged no-op, so callers (signup
// nudges, CRM notifications) can be wired now and start delivering the
// moment credentials land.

type TemplateParam = { type: "text"; text: string } | { type: "image"; image: { link: string } };

export type WaSendResult = { sent: boolean; reason: string };

export function waConfigured(): boolean {
  return Boolean(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
}

export async function sendWhatsAppTemplate(opts: {
  /** 10-digit Indian number or full E.164 without the plus. */
  to: string;
  template: string;
  /** {{1}}, {{2}}… body variables, in order. */
  bodyParams: string[];
  /** Optional image header (badge preview JPG etc). */
  headerImageUrl?: string;
}): Promise<WaSendResult> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneNumberId) {
    console.log(`[whatsapp] not configured — skipped template "${opts.template}" to ${opts.to}`);
    return { sent: false, reason: "not configured" };
  }

  const digits = opts.to.replace(/\D/g, "");
  const to = digits.length === 10 ? `91${digits}` : digits;

  const components: { type: string; parameters: TemplateParam[] }[] = [];
  if (opts.headerImageUrl) {
    components.push({ type: "header", parameters: [{ type: "image", image: { link: opts.headerImageUrl } }] });
  }
  if (opts.bodyParams.length > 0) {
    components.push({ type: "body", parameters: opts.bodyParams.map((text) => ({ type: "text", text })) });
  }

  const res = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "template",
      template: { name: opts.template, language: { code: "en" }, components },
    }),
  });

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
    console.error(`[whatsapp] send failed (${res.status}): ${err?.error?.message ?? "unknown"}`);
    return { sent: false, reason: err?.error?.message ?? `HTTP ${res.status}` };
  }

  return { sent: true, reason: "ok" };
}
