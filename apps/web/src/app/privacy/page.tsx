import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — NxtSft.com",
  description:
    "Learn how NxtSft.com collects, uses, shares, and protects your personal information.",
};

const SECTIONS = [
  {
    id: "introduction",
    title: "1. Introduction",
    body: [
      'NxtSFT PropTech innovations ("NxtSft.com", "we", "us", or "our") is committed to protecting your privacy and personal data. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our website, mobile application, or any related services (collectively, the "Platform").',
      'This Policy is published in accordance with the Information Technology Act, 2000, the Information Technology (Reasonable Security Practices and Procedures and Sensitive Personal Data or Information) Rules, 2011 ("SPDI Rules"), and, where applicable, the Digital Personal Data Protection Act, 2023 ("DPDPA").',
      "By using the Platform, you consent to the collection and use of your information as described in this Policy. If you do not agree, please discontinue use of the Platform immediately.",
    ],
  },
  {
    id: "information-collected",
    title: "2. Information We Collect",
    body: ["We collect the following categories of personal data:"],
    subsections: [
      {
        heading: "a) Information You Provide Directly",
        items: [
          "Account registration data: name, email address, phone number, and password.",
          "Property listing information: address, property type, photographs, price, and description.",
          "Communication data: messages sent through our in-Platform messaging, contact forms, or support channels.",
          "Payment information: billing address and transaction reference numbers (we do not store card or banking credentials).",
          "Identity verification documents: where required for agent or developer onboarding.",
        ],
      },
      {
        heading: "b) Information Collected Automatically",
        items: [
          "Usage data: pages viewed, search queries, features used, time spent, and click patterns.",
          "Device information: IP address, browser type, operating system, device identifiers.",
          "Location data: approximate location derived from IP address; precise location only with your explicit consent.",
          "Cookies and similar tracking technologies (see Section 6).",
        ],
      },
      {
        heading: "c) Information from Third Parties",
        items: [
          "Social login providers (Google, Facebook) when you choose to register using them.",
          "Property data aggregators and RERA portals for verification of listings.",
          "Analytics and advertising partners, subject to their own privacy policies.",
        ],
      },
    ],
  },
  {
    id: "how-we-use",
    title: "3. How We Use Your Information",
    body: ["We use personal data for the following purposes:"],
    list: [
      "To create and manage your account and verify your identity.",
      "To display and facilitate property listings, searches, and transactions.",
      "To process payments and manage Credits on your account.",
      "To connect buyers, tenants, sellers, landlords, and agents through the Platform.",
      "To send transactional communications, including account alerts, booking confirmations, and receipts.",
      "To send promotional communications and property recommendations, where you have opted in.",
      "To analyse usage patterns and improve our services, features, and user experience.",
      "To detect, prevent, and investigate fraud, abuse, and security incidents.",
      "To comply with legal obligations, resolve disputes, and enforce our Terms of Use.",
      "To conduct research and develop new products and features.",
    ],
  },
  {
    id: "sharing",
    title: "4. Sharing of Your Information",
    body: [
      "We do not sell your personal data to third parties. We may share your information in the following circumstances:",
    ],
    subsections: [
      {
        heading: "a) With Other Users",
        items: [
          "When you unlock a property listing, your contact details (name, phone number) may be shared with the listing owner or agent so they can respond to your enquiry, and vice versa.",
          "Public-facing profile information (name, agency affiliation) may be visible to other users.",
        ],
      },
      {
        heading: "b) With Service Providers",
        items: [
          "We engage trusted third-party vendors for payment processing, cloud hosting, analytics, email delivery, SMS notifications, and customer support. These vendors process data only on our instructions and under confidentiality obligations.",
        ],
      },
      {
        heading: "c) For Legal Compliance",
        items: [
          "We may disclose information when required by law, court order, or governmental authority, or when we believe disclosure is necessary to protect rights, property, or safety of NxtSft.com, our users, or the public.",
        ],
      },
      {
        heading: "d) Business Transfers",
        items: [
          "In the event of a merger, acquisition, or sale of all or a portion of our assets, your personal data may be transferred to the acquiring entity. We will notify you via email or a prominent notice on the Platform prior to any such transfer.",
        ],
      },
    ],
  },
  {
    id: "cookies",
    title: "5. Cookies and Tracking Technologies",
    body: [
      "We use cookies, web beacons, pixels, and similar technologies to enhance your experience, analyse usage, and deliver targeted content. Types of cookies we use include:",
    ],
    list: [
      "Essential cookies: Required for the Platform to function (authentication, session management, security).",
      "Functional cookies: Remember your preferences, such as saved searches and recently viewed properties.",
      "Analytics cookies: Collect aggregated data about how users interact with the Platform (e.g., Google Analytics).",
      "Advertising cookies: Used to show you relevant ads on and off the Platform, based on browsing behaviour.",
    ],
    bodyAfterList: [
      "You may manage cookie preferences through your browser settings. Disabling essential cookies may affect Platform functionality. For details on opting out of analytics, visit your browser's privacy settings or opt-out tools provided by analytics vendors.",
    ],
  },
  {
    id: "data-security",
    title: "6. Data Security",
    body: [
      "We implement industry-standard technical and organisational security measures to protect your personal data against unauthorised access, alteration, disclosure, or destruction. These include SSL/TLS encryption for data in transit, encrypted storage of sensitive data, role-based access controls, and regular security audits.",
      "While we take reasonable precautions, no method of transmission over the internet or electronic storage is 100% secure. We cannot guarantee absolute security of your data. In the event of a data breach that poses a risk to your rights, we will notify you and the appropriate authorities as required by law.",
      "You are responsible for keeping your account credentials confidential. Report any suspected unauthorised access immediately to care@nxtsft.com.",
    ],
  },
  {
    id: "retention",
    title: "7. Data Retention",
    body: [
      "We retain your personal data for as long as your account is active, as necessary to provide our services, or as required to comply with legal obligations, resolve disputes, and enforce agreements.",
      "Account data is retained for a minimum period as required under applicable Indian law. Upon account closure, we will delete or anonymise your personal data within 90 days, except where retention is required by law or legitimate business necessity.",
      "Transactional records and logs may be retained for up to 7 years for financial compliance purposes.",
    ],
  },
  {
    id: "rights",
    title: "8. Your Rights",
    body: [
      "Subject to applicable law, you have the following rights regarding your personal data:",
    ],
    list: [
      "Access: Request a copy of the personal data we hold about you.",
      "Correction: Request correction of inaccurate or incomplete personal data.",
      "Deletion: Request erasure of your personal data, subject to legal retention obligations.",
      "Withdrawal of consent: Withdraw consent for processing based on consent, without affecting lawfulness of prior processing.",
      "Portability: Receive your personal data in a machine-readable format where technically feasible.",
      "Objection: Object to processing for direct marketing purposes at any time.",
      "Nomination: Under DPDPA, nominate a person to exercise rights on your behalf in the event of death or incapacity.",
    ],
    bodyAfterList: [
      "To exercise any of these rights, please contact our Grievance Officer (see Section 11). We will respond within 30 days. We may verify your identity before processing requests.",
    ],
  },
  {
    id: "children",
    title: "9. Children's Privacy",
    body: [
      "The Platform is not directed at children under the age of 18. We do not knowingly collect personal data from minors. If you believe we have inadvertently collected information from a person under 18, please contact us at care@nxtsft.com and we will promptly delete such data.",
    ],
  },
  {
    id: "transfers",
    title: "10. Cross-Border Data Transfers",
    body: [
      "Your personal data is primarily processed and stored on servers located within India. Where data is transferred to service providers outside India (e.g., for cloud hosting or analytics), we ensure appropriate safeguards are in place as required under applicable Indian data protection law, including contractual commitments that meet applicable legal standards.",
    ],
  },
  {
    id: "grievance",
    title: "11. Grievance Officer",
    body: [
      "In accordance with the Information Technology Act, 2000, and the SPDI Rules, 2011, we have appointed a Grievance Officer to address any complaints regarding data processing. You may reach our Grievance Officer at:",
    ],
    contact: {
      name: "Grievance Officer — NxtSFT PropTech innovations  ",
      address: "Cyber City, Gurugram 122002, Haryana, India",
      email: "hello@nxtsft.com",
      responseTime:
        "We aim to acknowledge complaints within 24 hours and resolve them within 30 days.",
    },
  },
  {
    id: "changes",
    title: "12. Changes to This Policy",
    body: [
      "We may update this Privacy Policy periodically to reflect changes in our practices, the Platform, or applicable law. When we make material changes, we will notify you by email (to your registered address) or through a prominent notice on the Platform at least 7 days before the changes take effect.",
      "Your continued use of the Platform after the updated Policy takes effect constitutes acceptance of the revised Policy. We encourage you to review this page regularly.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">

      {/* Hero */}
      <section className="border-b border-border bg-white">
        <div className="mx-auto max-w-4xl px-6 py-16">
          <div className="text-xs font-bold uppercase tracking-widest text-accent">Legal</div>
          <h1 className="mt-3 font-display text-4xl font-black text-navy sm:text-5xl">
            Privacy Policy
          </h1>
          <p className="mt-4 text-base text-muted-foreground">
            How NxtSft.com collects, uses, and protects your personal information.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <span>
              Effective date: <strong className="text-foreground">1 January 2026</strong>
            </span>
            <span className="hidden sm:inline text-border">|</span>
            <span>
              Last updated: <strong className="text-foreground">1 June 2026</strong>
            </span>
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
            <div className="rounded-2xl border border-blue-200 bg-blue-50 px-6 py-4 text-sm text-blue-800">
              <strong>Your privacy matters.</strong> NxtSft.com does not sell your personal data to
              third parties. We collect only what is necessary to operate the Platform and connect
              you with relevant real estate opportunities.
            </div>

            {SECTIONS.map((s) => (
              <section key={s.id} id={s.id} className="scroll-mt-24">
                <h2 className="mb-4 font-display text-xl font-bold text-navy">{s.title}</h2>

                {s.body.map((p, i) => (
                  <p key={i} className="mb-3 text-sm leading-relaxed text-foreground/75">
                    {p}
                  </p>
                ))}

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
                  s.bodyAfterList.map((p, i) => (
                    <p key={i} className="mt-3 text-sm leading-relaxed text-foreground/75">
                      {p}
                    </p>
                  ))}

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
