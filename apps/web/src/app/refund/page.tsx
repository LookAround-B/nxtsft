import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Refund & Cancellation Policy — NxtSft.com",
  description:
    "Refund and cancellation terms for NxtSft.com SaaS subscriptions, listing fees, and lead credit packs.",
};

// ── Fill in before Razorpay KYC submission ──────────────────────────────────
const PROPRIETOR_NAME    = "[PROPRIETOR_FULL_NAME]";
const PROPRIETOR_ADDRESS = "[COMPLETE_ADDRESS, Medchal, Telangana — PIN]";
const PROPRIETOR_PHONE   = "[+91-XXXXXXXXXX]";
// ────────────────────────────────────────────────────────────────────────────

const REFUND_TABLE = [
  {
    service: "SaaS Subscription",
    eligibility: "Pro-rata refund if cancelled within 7 days of payment AND service not used. No refund after 7 days or after login/data entry.",
    timeline: "7–10 working days to source",
  },
  {
    service: "Listing Fee",
    eligibility: "Refund only if listing rejected by us before going live. Once live, no refund for change of mind or property sold.",
    timeline: "7–10 working days",
  },
  {
    service: "Lead Credits",
    eligibility: "Unused credits refundable within 7 days of purchase. Used or expired credits are non-refundable. Credits expire 90 days post-purchase.",
    timeline: "7–10 working days",
  },
  {
    service: "Advertising",
    eligibility: "Refund if campaign not started. Once campaign starts, no refund.",
    timeline: "7–10 working days",
  },
];

const SECTIONS = [
  {
    id: "scope",
    title: "1. Scope",
    body: [
      "This Policy applies to all payments made via PayU / Razorpay on NxtSft.com for digital services only.",
      "NxtSft.com does NOT collect or process any payments related to property sale, rent, token, booking, or brokerage. This policy has no applicability to property transactions.",
    ],
  },
  {
    id: "services-covered",
    title: "2. Services Covered",
    body: ["Refunds and cancellations apply only to the following NxtSft.com digital services:"],
    list: [
      "SaaS Subscription — Monthly/Annual CRM access fee",
      "Listing Fee — Charges for Featured/Premium property ad slots",
      "Lead Credits — Prepaid credits to unlock buyer contact details",
      "Advertising — Banner ads, email campaigns",
    ],
  },
  {
    id: "refund-terms",
    title: "3. Refund Terms",
    body: ["The following terms apply per service. All refunds are processed to the original payment method via PayU / Razorpay."],
  },
  {
    id: "non-refundable",
    title: "4. Non-Refundable Situations",
    body: ["No refund will be issued in the following cases:"],
    list: [
      "Account suspended for T&C violation, RERA violation, or fake listings",
      "Property sold/leased/rented through your own efforts — our fee is for advertisement, not transaction success",
      "Change of mind after service activation",
      "GST paid to the Government — this cannot be refunded by us",
    ],
  },
  {
    id: "failed-payment",
    title: "5. Duplicate / Failed Payment",
    body: [
      "If amount is debited but service not activated due to a technical error: a full refund will be auto-initiated within 7–10 working days to the original payment mode.",
      "Email support@nxtsft.com with your Transaction ID if the refund is not received within 10 working days.",
    ],
  },
  {
    id: "cancellation-process",
    title: "6. Cancellation Process",
    body: ["To request a cancellation or refund:"],
    list: [
      "Email support@nxtsft.com with your registered email, Invoice No., and reason",
      "We respond within 48 hours",
      "If approved, PayU / Razorpay processes the refund to the original mode — your bank may take an additional 7–10 days",
    ],
  },
  {
    id: "chargebacks",
    title: "7. Chargebacks",
    body: [
      "Do NOT file a chargeback without contacting us first at support@nxtsft.com. Chargebacks cause a ₹500 penalty from the payment gateway.",
      "Unwarranted chargebacks — filed without prior support contact — may result in permanent account suspension and legal action.",
    ],
  },
  {
    id: "contact",
    title: "8. Contact for Refunds",
    body: [
      `Support: support@nxtsft.com | ${PROPRIETOR_PHONE}`,
      `Address: ${PROPRIETOR_ADDRESS}`,
      "Working Hours: Monday–Saturday, 10:00 AM – 6:00 PM IST",
    ],
  },
];

export default function RefundPage() {
  return (
    <div className="min-h-screen bg-background">

      {/* Hero */}
      <section className="border-b border-border bg-white">
        <div className="mx-auto max-w-4xl px-6 py-16">
          <div className="text-xs font-bold uppercase tracking-widest text-accent">Legal</div>
          <h1 className="mt-3 font-display text-4xl font-black text-navy sm:text-5xl">
            Refund & Cancellation Policy
          </h1>
          <p className="mt-4 text-base text-muted-foreground">
            Applies to SaaS subscriptions, listing fees, and lead credit purchases on NxtSft.com.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <span>
              Effective date: <strong className="text-foreground">1 July 2026</strong>
            </span>
            <span className="hidden sm:inline text-border">|</span>
            <span>
              Proprietor: <strong className="text-foreground">{PROPRIETOR_NAME}</strong>
            </span>
          </div>
        </div>
      </section>

      {/* Body */}
      <div className="mx-auto max-w-4xl px-6 py-14">
        <div className="grid gap-8 lg:grid-cols-[220px_1fr]">

          {/* TOC */}
          <aside className="hidden lg:block">
            <div className="sticky top-24 rounded-2xl border border-border bg-white p-5">
              <div className="mb-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Contents
              </div>
              <nav className="space-y-1">
                {SECTIONS.map((s) => (
                  <a
                    key={s.id}
                    href={`#${s.id}`}
                    className="block rounded-lg px-3 py-1.5 text-xs text-foreground/60 transition hover:bg-secondary hover:text-accent"
                  >
                    {s.title}
                  </a>
                ))}
              </nav>
            </div>
          </aside>

          {/* Content */}
          <article className="space-y-10">
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-6 py-4 text-sm text-amber-800">
              <strong>Important:</strong> NxtSft.com only charges for SaaS, listing ads, and lead credits.
              We do <strong>not</strong> collect booking amounts, tokens, rent, or brokerage.
              This policy has no applicability to property transactions.
            </div>

            {SECTIONS.map((s) => (
              <section key={s.id} id={s.id} className="scroll-mt-24">
                <h2 className="mb-4 font-display text-xl font-bold text-navy">{s.title}</h2>
                {s.body.map((p, i) => (
                  <p key={i} className="mb-3 text-sm leading-relaxed text-foreground/75">{p}</p>
                ))}
                {"list" in s && s.list && (
                  <ul className="mt-2 space-y-2 pl-4">
                    {s.list.map((item, i) => (
                      <li key={i} className="flex gap-2.5 text-sm text-foreground/75">
                        <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-accent" />
                        {item}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}

            {/* Refund Table */}
            <section id="refund-terms" className="scroll-mt-24 -mt-6">
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-secondary">
                      <th className="px-4 py-3 text-left font-semibold text-navy">Service</th>
                      <th className="px-4 py-3 text-left font-semibold text-navy">Refund Eligibility</th>
                      <th className="px-4 py-3 text-left font-semibold text-navy whitespace-nowrap">Timeline</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {REFUND_TABLE.map((row) => (
                      <tr key={row.service} className="hover:bg-secondary/40">
                        <td className="px-4 py-3 font-medium text-navy whitespace-nowrap">{row.service}</td>
                        <td className="px-4 py-3 text-foreground/70">{row.eligibility}</td>
                        <td className="px-4 py-3 text-foreground/70 whitespace-nowrap">{row.timeline}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <div className="rounded-2xl border border-border bg-white p-6 text-sm">
              <p className="font-semibold text-navy">Related Policies</p>
              <div className="mt-3 flex flex-wrap gap-3">
                <Link href="/terms" className="text-accent hover:underline">Terms of Use</Link>
                <span className="text-border">|</span>
                <Link href="/privacy" className="text-accent hover:underline">Privacy Policy</Link>
                <span className="text-border">|</span>
                <Link href="/contact" className="text-accent hover:underline">Contact Support</Link>
              </div>
            </div>
          </article>
        </div>
      </div>
    </div>
  );
}
