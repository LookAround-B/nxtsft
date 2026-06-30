import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Cookie Policy — NxtSft.com",
  description:
    "Learn how NxtSft.com uses cookies and similar tracking technologies, what choices you have, and how to manage your preferences.",
};

const SECTIONS = [
  {
    id: "introduction",
    title: "1. Introduction",
    body: [
      'This Cookie Policy explains how NxtSFT PropTech innovations ("NxtSft.com", "we", "us", or "our") uses cookies and similar tracking technologies when you visit our website or mobile application (collectively, the "Platform").',
      'By clicking "Accept All" on the cookie consent banner or by continuing to browse the Platform, you consent to the use of cookies as described in this Policy. If you select "Reject", only strictly necessary cookies will be placed. You may update your preferences at any time by clearing your browser\'s local storage or cookie settings.',
      "This Policy should be read alongside our Privacy Policy, which sets out the broader framework for how we handle your personal data.",
    ],
  },
  {
    id: "what-are-cookies",
    title: "2. What Are Cookies?",
    body: [
      "Cookies are small text files placed on your device (computer, smartphone, or tablet) when you visit a website. They are widely used to make websites work efficiently, remember your preferences, and provide information to website owners.",
      'Similar technologies include web beacons (also called tracking pixels), local storage objects, session storage, and fingerprinting techniques. Throughout this Policy, we use the term "cookies" to refer to all such technologies collectively.',
      'Cookies can be "session cookies" — which are deleted automatically when you close your browser — or "persistent cookies", which remain on your device for a set period or until you manually delete them. They can also be "first-party cookies" (set by NxtSft.com directly) or "third-party cookies" (set by our service partners such as analytics or advertising platforms).',
    ],
  },
  {
    id: "types",
    title: "3. Types of Cookies We Use",
    body: ["We categorise the cookies used on the Platform as follows:"],
    table: [
      {
        category: "Strictly Necessary",
        tone: "blue",
        purpose:
          "These cookies are essential for the Platform to function. They enable core features such as user authentication, session management, security, and access to paid features. The Platform cannot operate properly without them.",
        examples: [
          "Session token (keeps you logged in)",
          "CSRF protection token",
          "Consent preference cookie (stores your cookie choice)",
        ],
        canDisable: false,
      },
      {
        category: "Functional",
        tone: "violet",
        purpose:
          "These cookies remember choices you make to provide a personalised experience. They are not essential but significantly improve usability.",
        examples: [
          "Saved search filters",
          "Recently viewed properties",
          "Preferred city or region",
          "Language and display preferences",
        ],
        canDisable: true,
      },
      {
        category: "Analytics & Performance",
        tone: "amber",
        purpose:
          "These cookies help us understand how visitors interact with the Platform by collecting and reporting aggregated, anonymised usage data. This helps us improve content, navigation, and features.",
        examples: [
          "Google Analytics (_ga, _gid, _gat)",
          "Hotjar session recordings (hjSession)",
          "Internal page-view tracking",
          "Feature adoption metrics",
        ],
        canDisable: true,
      },
      {
        category: "Advertising & Targeting",
        tone: "rose",
        purpose:
          "These cookies are used to deliver advertisements relevant to you and your interests, both on the Platform and on third-party websites. They also limit the number of times you see an ad and help measure ad campaign effectiveness.",
        examples: [
          "Meta Pixel (_fbp, _fbc)",
          "Google Ads conversion tag (gcl_au)",
          "Retargeting cookies from ad networks",
          "Interest-based profiling cookies",
        ],
        canDisable: true,
      },
    ],
  },
  {
    id: "third-party",
    title: "4. Third-Party Cookies",
    body: [
      "Some cookies on the Platform are set by third-party service providers acting on our behalf or for their own purposes. These include:",
    ],
    subsections: [
      {
        heading: "Analytics Providers",
        items: [
          "Google Analytics (Google LLC): collects anonymised usage and behaviour data. Governed by Google's Privacy Policy at policies.google.com/privacy.",
          "Hotjar Ltd.: records anonymous session activity to help us identify usability issues. Governed by Hotjar's Privacy Policy at hotjar.com/legal/policies/privacy.",
        ],
      },
      {
        heading: "Advertising Networks",
        items: [
          "Meta Platforms, Inc.: places the Meta Pixel to measure conversions and support retargeting on Facebook and Instagram.",
          "Google Advertising Services: supports Google Ads remarketing and conversion tracking.",
        ],
      },
      {
        heading: "Infrastructure & Security",
        items: [
          "Cloudflare, Inc.: uses cookies for security (bot mitigation, DDoS protection) and performance optimisation.",
          "Payment gateways (Razorpay, PayU): may set cookies during payment flows for fraud prevention and session continuity.",
        ],
      },
    ],
    bodyAfterSubsections: [
      "We do not control the cookies set by third parties. Please refer to the respective third-party privacy and cookie policies for details on how they use and share data collected through their cookies.",
    ],
  },
  {
    id: "specific-cookies",
    title: "5. Cookies We Set Directly",
    body: ["The following first-party cookies are set by NxtSft.com:"],
    cookieTable: [
      {
        name: "nxtsft_cookie_consent",
        purpose:
          "Stores your cookie consent choice (accepted / rejected). Prevents the banner from reappearing.",
        duration: "12 months",
        type: "Strictly Necessary",
      },
      {
        name: "nxtsft_session",
        purpose: "Maintains your authenticated session after login.",
        duration: "Session",
        type: "Strictly Necessary",
      },
      {
        name: "nxtsft_csrf",
        purpose: "Cross-site request forgery protection token.",
        duration: "Session",
        type: "Strictly Necessary",
      },
      {
        name: "nxtsft_saved_search",
        purpose: "Persists your most recent search filters for a faster return experience.",
        duration: "30 days",
        type: "Functional",
      },
      {
        name: "nxtsft_recent_props",
        purpose: "Stores IDs of recently viewed property listings.",
        duration: "7 days",
        type: "Functional",
      },
      {
        name: "nxtsft_city_pref",
        purpose: "Remembers your preferred city for search results.",
        duration: "90 days",
        type: "Functional",
      },
      {
        name: "nxtsft_ab_variant",
        purpose: "Assigns you to an A/B test group for feature experiments.",
        duration: "30 days",
        type: "Analytics & Performance",
      },
    ],
  },
  {
    id: "manage",
    title: "6. Managing Your Cookie Preferences",
    body: ["You have several options for controlling cookies:"],
    subsections: [
      {
        heading: "a) Our Consent Banner",
        items: [
          'When you first visit the Platform, a cookie banner is displayed. Clicking "Accept All" enables all cookie categories. Clicking "Reject" limits cookies to strictly necessary ones only.',
          'To change your choice, clear the "nxtsft_cookie_consent" entry from your browser\'s local storage (Developer Tools → Application → Local Storage on most browsers), and refresh the page.',
        ],
      },
      {
        heading: "b) Browser Settings",
        items: [
          "Most browsers allow you to block or delete cookies via their privacy or settings menu. Consult your browser's help documentation: Chrome (Settings → Privacy and Security → Cookies), Safari (Preferences → Privacy), Firefox (Options → Privacy & Security), Edge (Settings → Cookies and Site Permissions).",
          "Please note that blocking strictly necessary cookies may prevent you from logging in or using paid features of the Platform.",
        ],
      },
      {
        heading: "c) Opt-Out Tools",
        items: [
          "Google Analytics: install the Google Analytics Opt-out Browser Add-on (tools.google.com/dlpage/gaoptout).",
          "Meta Pixel: manage preferences at facebook.com/ads/preferences.",
          "Interest-based advertising: visit youronlinechoices.eu (EU/UK) or networkadvertising.org/choices (US) for industry-wide opt-out tools.",
        ],
      },
    ],
  },
  {
    id: "mobile",
    title: "7. Cookies on Mobile Devices",
    body: [
      "If you access the Platform via a mobile browser, the same cookie categories apply. Mobile browsers offer cookie management settings typically found under the browser's privacy or settings menu.",
      "If you use a native mobile application, we may use device identifiers (such as the Advertising ID on Android or IDFA on iOS) and local storage rather than traditional browser cookies. You can reset or limit the use of your Advertising ID through your device's settings (iOS: Settings → Privacy & Security → Tracking; Android: Settings → Google → Ads).",
    ],
  },
  {
    id: "retention",
    title: "8. Cookie Retention Periods",
    body: [
      "Session cookies are automatically deleted when you close your browser. Persistent cookies expire after the period specified in Section 5 or in the third-party cookie documentation. We periodically review and update our cookies and retire those that are no longer necessary.",
    ],
  },
  {
    id: "legal-basis",
    title: "9. Legal Basis for Cookie Use",
    body: [
      "Under India's Digital Personal Data Protection Act, 2023 (DPDPA) and related rules, we process personal data collected through cookies on the following legal bases:",
    ],
    list: [
      "Consent: for functional, analytics, and advertising cookies — obtained via the consent banner at your first visit.",
      "Legitimate interest: for strictly necessary cookies required to maintain the security and functionality of the Platform.",
      "Contract performance: for session and authentication cookies needed to deliver services you have requested.",
    ],
    bodyAfterList: [
      "Where we rely on consent, you have the right to withdraw it at any time without affecting the lawfulness of processing based on consent before withdrawal.",
    ],
  },
  {
    id: "changes",
    title: "10. Changes to This Cookie Policy",
    body: [
      'We may update this Cookie Policy from time to time to reflect changes in technology, regulation, or our business practices. The "last updated" date at the top of this page will indicate when the most recent revision was made.',
      "For material changes, we will notify you via the cookie consent banner on your next visit or, for registered users, by email. Your continued use of the Platform after changes take effect constitutes acceptance of the updated Policy.",
    ],
  },
  {
    id: "contact",
    title: "11. Contact Us",
    body: ["If you have questions about our use of cookies or this Policy, please contact:"],
    contact: {
      name: "Data Privacy Team — NxtSFT PropTech innovations",
      address: "Awfis, Kirloskar Business Park, Hebbal, Bengaluru, Karnataka 560024, India",
      email: "hello@nxtsft.com",
      responseTime: "We aim to acknowledge all privacy-related enquiries within 48 hours.",
    },
  },
];

const TONE_CLASSES: Record<string, { badge: string; border: string; bg: string }> = {
  blue: { badge: "bg-blue-100 text-blue-700", border: "border-blue-200", bg: "bg-blue-50" },
  violet: {
    badge: "bg-violet-100 text-violet-700",
    border: "border-violet-200",
    bg: "bg-violet-50",
  },
  amber: { badge: "bg-amber-100 text-amber-700", border: "border-amber-200", bg: "bg-amber-50" },
  rose: { badge: "bg-rose-100 text-rose-700", border: "border-rose-200", bg: "bg-rose-50" },
};

export default function CookiePolicyPage() {
  return (
    <div className="min-h-screen bg-background">

      {/* Hero */}
      <section className="border-b border-border bg-white">
        <div className="mx-auto max-w-4xl px-6 py-16">
          <div className="text-xs font-bold uppercase tracking-widest text-accent">Legal</div>
          <h1 className="mt-3 font-display text-4xl font-black text-navy sm:text-5xl">
            Cookie Policy
          </h1>
          <p className="mt-4 text-base text-muted-foreground">
            How NxtSft.com uses cookies and tracking technologies, and the choices you have.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <span>
              Effective date: <strong className="text-foreground">1 January 2026</strong>
            </span>
            <span className="hidden text-border sm:inline">|</span>
            <span>
              Last updated: <strong className="text-foreground">1 June 2026</strong>
            </span>
          </div>
          <div className="mt-6 flex flex-wrap gap-3 text-xs">
            <Link
              href="/privacy"
              className="rounded-full border border-border bg-white px-3 py-1.5 font-semibold text-muted-foreground transition hover:border-accent hover:text-accent"
            >
              ← Privacy Policy
            </Link>
            <Link
              href="/terms"
              className="rounded-full border border-border bg-white px-3 py-1.5 font-semibold text-muted-foreground transition hover:border-accent hover:text-accent"
            >
              Terms of Use
            </Link>
          </div>
        </div>
      </section>

      {/* Body */}
      <div className="mx-auto max-w-4xl px-6 py-14">
        <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
          {/* Sticky TOC */}
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
              <strong>Quick summary:</strong> We use strictly necessary cookies at all times.
              Functional, analytics, and advertising cookies are only placed with your consent. You
              can reject non-essential cookies at any time via the banner or your browser settings.
            </div>

            {SECTIONS.map((s) => (
              <section key={s.id} id={s.id} className="scroll-mt-24">
                <h2 className="mb-4 font-display text-xl font-bold text-navy">{s.title}</h2>

                {s.body.map((p, i) => (
                  <p key={i} className="mb-3 text-sm leading-relaxed text-foreground/75">
                    {p}
                  </p>
                ))}

                {/* Cookie category cards */}
                {"table" in s && s.table && (
                  <div className="mt-4 space-y-4">
                    {s.table.map((row) => {
                      const t = TONE_CLASSES[row.tone] ?? TONE_CLASSES.blue;
                      return (
                        <div
                          key={row.category}
                          className={`rounded-xl border p-5 ${t.border} ${t.bg}`}
                        >
                          <div className="mb-2 flex flex-wrap items-center gap-2">
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${t.badge}`}
                            >
                              {row.category}
                            </span>
                            {!row.canDisable && (
                              <span className="rounded-full border border-border bg-white px-2.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                                Always active
                              </span>
                            )}
                          </div>
                          <p className="mb-3 text-sm leading-relaxed text-foreground/75">
                            {row.purpose}
                          </p>
                          <div className="text-xs font-semibold text-navy">Examples:</div>
                          <ul className="mt-1 space-y-1">
                            {row.examples.map((ex) => (
                              <li key={ex} className="flex gap-2 text-xs text-foreground/65">
                                <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-current opacity-50" />
                                {ex}
                              </li>
                            ))}
                          </ul>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Subsections */}
                {"subsections" in s && s.subsections && (
                  <div className="mt-2 space-y-5">
                    {s.subsections.map((sub, si) => (
                      <div key={si}>
                        <div className="mb-2 text-sm font-semibold text-navy">{sub.heading}</div>
                        <ul className="space-y-1.5 pl-4">
                          {sub.items.map((item, ii) => (
                            <li key={ii} className="flex gap-2.5 text-sm text-foreground/75">
                              <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-accent/60" />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}

                {"bodyAfterSubsections" in s &&
                  s.bodyAfterSubsections &&
                  s.bodyAfterSubsections.map((p: string, i: number) => (
                    <p key={i} className="mt-3 text-sm leading-relaxed text-foreground/75">
                      {p}
                    </p>
                  ))}

                {/* First-party cookie table */}
                {"cookieTable" in s && s.cookieTable && (
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                      <thead>
                        <tr className="border-b border-border bg-secondary/50 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                          <th className="px-3 py-2.5">Cookie name</th>
                          <th className="px-3 py-2.5">Purpose</th>
                          <th className="px-3 py-2.5">Duration</th>
                          <th className="px-3 py-2.5">Category</th>
                        </tr>
                      </thead>
                      <tbody>
                        {s.cookieTable.map((row, i) => (
                          <tr
                            key={row.name}
                            className={`border-b border-border text-xs ${i % 2 === 0 ? "bg-white" : "bg-secondary/20"}`}
                          >
                            <td className="px-3 py-3 font-mono font-semibold text-navy">
                              {row.name}
                            </td>
                            <td className="px-3 py-3 text-foreground/70">{row.purpose}</td>
                            <td className="px-3 py-3 text-muted-foreground">{row.duration}</td>
                            <td className="px-3 py-3 text-muted-foreground">{row.type}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Bulleted list */}
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

                {"bodyAfterList" in s &&
                  s.bodyAfterList &&
                  (s.bodyAfterList as string[]).map((p, i) => (
                    <p key={i} className="mt-3 text-sm leading-relaxed text-foreground/75">
                      {p}
                    </p>
                  ))}

                {/* Contact block */}
                {"contact" in s && s.contact && (
                  <div className="mt-4 rounded-xl border border-border bg-white p-5 text-sm">
                    <div className="font-semibold text-navy">{s.contact.name}</div>
                    <div className="mt-1 text-muted-foreground">{s.contact.address}</div>
                    <div className="mt-3">
                      Email:{" "}
                      <a href={`mailto:${s.contact.email}`} className="text-accent hover:underline">
                        {s.contact.email}
                      </a>
                    </div>
                    <div className="mt-2 rounded-lg bg-secondary/60 px-3 py-2 text-xs text-muted-foreground">
                      {s.contact.responseTime}
                    </div>
                  </div>
                )}
              </section>
            ))}
          </article>
        </div>
      </div>

    </div>
  );
}
