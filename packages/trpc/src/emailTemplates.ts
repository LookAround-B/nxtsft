// HTML bodies for NxtSft's transactional emails (sent via email.ts). One simple,
// inline-styled layout so every email looks the same in Gmail / Outlook.

export const siteUrl = () => (process.env.NEXT_PUBLIC_SITE_URL || "https://www.nxtsft.com").replace(/\/$/, "");

export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function layout(o: { greeting: string; paragraphs: string[]; cta?: { label: string; url: string }; footer?: string }): string {
  return `
  <div style="font-family:system-ui,Segoe UI,Arial,sans-serif;max-width:520px;margin:0 auto;color:#0f172a;line-height:1.5">
    <p>${o.greeting}</p>
    ${o.paragraphs.map((p) => `<p>${p}</p>`).join("\n    ")}
    ${
      o.cta
        ? `<p><a href="${o.cta.url}" style="display:inline-block;background:#14b8a6;color:#fff;text-decoration:none;padding:10px 20px;border-radius:8px;font-weight:700">${escapeHtml(o.cta.label)}</a></p>`
        : ""
    }
    <p style="color:#64748b;font-size:13px">${o.footer ?? "NxtSft.com — India's real estate marketplace."}</p>
  </div>`;
}

/** Welcome email for a new Home Seller / Agent (seller-side registration). */
export function sellerWelcomeEmail(o: { name: string; isAgent: boolean; pendingApproval: boolean }) {
  const who = o.isAgent ? "Agent" : "Home Seller";
  if (o.pendingApproval) {
    return {
      subject: "Welcome to NxtSft — your Agent account is under review",
      html: layout({
        greeting: `Hi ${escapeHtml(o.name)},`,
        paragraphs: [
          "Thanks for registering as an <strong>Agent</strong> on NxtSft.",
          "Our team is reviewing your account. We'll let you know as soon as it's approved — then you can list properties and track every buyer lead from your dashboard.",
        ],
        cta: { label: "Visit NxtSft", url: siteUrl() },
      }),
    };
  }
  return {
    subject: `Welcome to NxtSft — you're a ${who} now`,
    html: layout({
      greeting: `Hi ${escapeHtml(o.name)},`,
      paragraphs: [
        `Your <strong>${who}</strong> account is ready.`,
        "Your first listing is <strong>free</strong>. Post it in a few minutes, and choose a plan any time for more listings, better placement and the Verified Owner badge.",
      ],
      cta: { label: "List your property", url: `${siteUrl()}/list` },
    }),
  };
}

/**
 * Buyer-request alert to a listing's owner. Deliberately carries NO buyer
 * name/phone — contact access follows the owner's plan inside the dashboard.
 */
export function buyerInterestEmail(o: { ownerName: string; propertyTitle: string }) {
  return {
    subject: `A buyer is interested in "${o.propertyTitle}"`,
    html: layout({
      greeting: `Hi ${escapeHtml(o.ownerName)},`,
      paragraphs: [
        `Good news — a buyer just sent an enquiry about your listing <strong>${escapeHtml(o.propertyTitle)}</strong> on NxtSft.`,
        "Open your dashboard to see the request and respond quickly — fast replies close more deals.",
      ],
      cta: { label: "View buyer request", url: `${siteUrl()}/user-portal#leads` },
      footer: "For everyone's privacy, buyer details are shown only inside your NxtSft dashboard.",
    }),
  };
}
