import type { Metadata } from "next";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";

export const metadata: Metadata = {
  title: "Terms of Use — NxtSft.com",
  description:
    "Read the Terms of Use governing your access to and use of the NxtSft.com platform and services.",
};

const SECTIONS = [
  {
    id: "acceptance",
    title: "1. Acceptance of Terms",
    body: [
      'By accessing or using the NxtSft.com website, mobile application, or any related services (collectively, the "Platform"), you agree to be legally bound by these Terms of Use ("Terms"), our Privacy Policy, and any additional guidelines, rules, or policies applicable to specific features of the Platform, all of which are incorporated herein by reference.',
      "If you do not agree to these Terms, you must immediately cease using the Platform. Your continued use constitutes acceptance of any modifications to these Terms.",
      'NxtSft.com Technology Pvt. Ltd. ("NxtSft.com", "we", "us", or "our") reserves the right to revise these Terms at any time. We will notify registered users of material changes via email or a prominent in-Platform notice. Changes take effect upon posting unless stated otherwise.',
    ],
  },
  {
    id: "eligibility",
    title: "2. Eligibility",
    body: [
      "The Platform is available to individuals who are at least 18 years of age and are competent to contract under the Indian Contract Act, 1872. By using the Platform, you represent and warrant that you meet these eligibility requirements.",
      'If you are using the Platform on behalf of a company, organisation, or other legal entity, you represent that you have the authority to bind such entity to these Terms, in which case "you" shall refer to that entity.',
      "We reserve the right to refuse access to or terminate accounts of any user for any reason, including violation of these Terms.",
    ],
  },
  {
    id: "accounts",
    title: "3. User Accounts",
    body: [
      "To access certain features of the Platform, you must create an account. You agree to provide accurate, current, and complete information during registration and to keep your account information updated at all times.",
      "You are solely responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to notify us immediately at care@nxtsft.com of any unauthorised use of your account or any other security breach.",
      "NxtSft.com will not be liable for any loss or damage arising from your failure to protect your account credentials. You may not transfer or assign your account to any third party.",
      "We reserve the right to suspend or terminate your account if any information provided is found to be inaccurate, incomplete, or in violation of these Terms.",
    ],
  },
  {
    id: "services",
    title: "4. Description of Services",
    body: [
      'NxtSft.com is an online real estate marketplace that connects buyers, sellers, tenants, landlords, property developers, and real estate agents ("Parties"). Our Platform provides tools for searching and listing residential, commercial, and other real estate properties across India.',
      "NxtSft.com is an intermediary and facilitates communication between Parties. We do not own, sell, rent, or otherwise deal in properties listed on the Platform. We are not a real estate agent, broker, or advisor, and nothing on the Platform constitutes legal, financial, or investment advice.",
      "Property listings on the Platform are posted by sellers, developers, or agents and are subject to availability. NxtSft.com does not warrant the accuracy, completeness, or legality of any listing or the identity of any user.",
      "Certain features — including unlocking contact details, advanced search filters, and lead management tools — are available only to users with an active credit balance or subscription, as outlined on our Pricing page.",
    ],
  },
  {
    id: "listings",
    title: "5. Listings and User Content",
    body: [
      'By submitting property listings, photographs, descriptions, reviews, or any other content ("User Content") to the Platform, you grant NxtSft.com a non-exclusive, royalty-free, worldwide, sublicensable, and transferable licence to use, reproduce, modify, distribute, and display such content in connection with operating and promoting the Platform.',
      "You represent and warrant that: (a) you own or have the right to submit the User Content; (b) the User Content is accurate and not misleading; (c) the property is RERA-registered where required under the Real Estate (Regulation and Development) Act, 2016; and (d) the listing does not infringe any third-party intellectual property, privacy, or other rights.",
      "NxtSft.com reserves the right to remove any User Content that, in our sole discretion, violates these Terms, applicable law, or is otherwise objectionable, without prior notice or liability.",
      "We do not verify every listing and are not responsible for errors, omissions, or misrepresentations in User Content. Users are advised to independently verify all property information before entering into any transaction.",
    ],
  },
  {
    id: "prohibited",
    title: "6. Prohibited Conduct",
    body: ["You agree not to use the Platform to:"],
    list: [
      "Post false, misleading, or fraudulent listings or information.",
      "Impersonate any person or entity, or misrepresent your affiliation with any person or entity.",
      "Harvest, scrape, or collect user data or contact information without consent.",
      "Transmit unsolicited commercial communications (spam) to other users.",
      "List properties that you do not have authority to sell or rent.",
      "Circumvent or attempt to circumvent any access controls or security measures on the Platform.",
      "Use automated tools, bots, or scripts to access or interact with the Platform without our prior written consent.",
      "Engage in any conduct that could damage, disable, or impair the Platform or its infrastructure.",
      "Violate any applicable law, including RERA, the Information Technology Act, 2000, the Indian Penal Code, 1860, or the Consumer Protection Act, 2019.",
      "Facilitate or engage in money laundering, tax evasion, or any other illegal financial activity.",
    ],
  },
  {
    id: "ip",
    title: "7. Intellectual Property",
    body: [
      "All content on the Platform — including the NxtSft.com name and logo, text, graphics, software, data compilations, and the overall look and feel of the Platform — is the exclusive property of NxtSft.com Technology Pvt. Ltd. or its licensors and is protected under applicable intellectual property laws.",
      "Nothing in these Terms grants you any right, title, or interest in or to our intellectual property. You may not reproduce, distribute, modify, create derivative works from, publicly display, or exploit any content from the Platform without our prior written permission.",
      "Any feedback, suggestions, or ideas you provide to us regarding the Platform may be used by us without any obligation to compensate you.",
    ],
  },
  {
    id: "payments",
    title: "8. Payments and Credits",
    body: [
      "Certain services on the Platform, such as viewing seller contact details, require the use of Credits purchased through our Pricing plans. All payments are processed through third-party payment gateways. NxtSft.com does not store card or banking details.",
      "All fees are stated in Indian Rupees (INR) and are inclusive of applicable taxes unless stated otherwise. Credits are non-refundable, non-transferable, and have no cash value unless otherwise required by applicable law.",
      "In the event of a payment dispute, you must contact us at care@nxtsft.com within 7 days of the transaction. We reserve the right to suspend your account pending resolution of any payment dispute.",
      "We reserve the right to modify our fee structure at any time. Updated pricing will be displayed on the Platform and will apply prospectively.",
    ],
  },
  {
    id: "disclaimer",
    title: "9. Disclaimer of Warranties",
    body: [
      'THE PLATFORM AND ALL CONTENT, SERVICES, AND FEATURES ARE PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.',
      "NxtSft.com does not warrant that: (a) the Platform will be uninterrupted, timely, secure, or error-free; (b) the results obtained from use of the Platform will be accurate or reliable; (c) the quality of any property, listing, information, or service obtained through the Platform will meet your expectations.",
      "Any property transaction you enter into based on information found on the Platform is entirely at your own risk. NxtSft.com is not responsible for the conduct of any buyer, seller, agent, or developer on the Platform.",
    ],
  },
  {
    id: "liability",
    title: "10. Limitation of Liability",
    body: [
      "TO THE FULLEST EXTENT PERMITTED BY APPLICABLE INDIAN LAW, NXTSFT.COM AND ITS OFFICERS, DIRECTORS, EMPLOYEES, AGENTS, AND AFFILIATES SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES — INCLUDING LOSS OF PROFITS, DATA, GOODWILL, OR OTHER INTANGIBLE LOSSES — ARISING OUT OF OR IN CONNECTION WITH YOUR USE OF OR INABILITY TO USE THE PLATFORM.",
      "In no event shall our total aggregate liability to you for all claims arising out of or relating to these Terms or your use of the Platform exceed the amount paid by you to NxtSft.com in the six (6) months preceding the event giving rise to the claim, or ₹5,000, whichever is lesser.",
      "Some jurisdictions do not allow the exclusion or limitation of certain damages. In such cases, our liability shall be limited to the maximum extent permitted by law.",
    ],
  },
  {
    id: "indemnification",
    title: "11. Indemnification",
    body: [
      "You agree to indemnify, defend, and hold harmless NxtSft.com Technology Pvt. Ltd., its officers, directors, employees, agents, and affiliates from and against any claims, liabilities, damages, losses, costs, and expenses (including reasonable legal fees) arising out of or in any way connected with: (a) your access to or use of the Platform; (b) your User Content; (c) your violation of these Terms; or (d) your violation of any applicable law or the rights of any third party.",
    ],
  },
  {
    id: "third-party",
    title: "12. Third-Party Links and Services",
    body: [
      "The Platform may contain links to third-party websites, services, or resources. These links are provided for your convenience only. NxtSft.com has no control over and accepts no responsibility for the content, policies, or practices of any third-party site or service.",
      "Your interactions with third-party services are governed by their respective terms and privacy policies. We encourage you to review those policies before providing any personal information.",
    ],
  },
  {
    id: "governing-law",
    title: "13. Governing Law and Dispute Resolution",
    body: [
      "These Terms shall be governed by and construed in accordance with the laws of India, without regard to conflict of law principles.",
      "Any dispute arising out of or relating to these Terms or your use of the Platform shall first be attempted to be resolved through good-faith negotiation. If unresolved within 30 days, the dispute shall be submitted to binding arbitration in accordance with the Arbitration and Conciliation Act, 1996. The seat of arbitration shall be Gurugram, Haryana, India. The language of arbitration shall be English.",
      "Notwithstanding the foregoing, either party may seek injunctive or other equitable relief from a court of competent jurisdiction in Gurugram, Haryana, India.",
    ],
  },
  {
    id: "termination",
    title: "14. Termination",
    body: [
      "NxtSft.com may, in its sole discretion, suspend or terminate your access to the Platform at any time, with or without notice, for any reason, including but not limited to breach of these Terms.",
      "Upon termination, your right to use the Platform will immediately cease. Provisions of these Terms that by their nature should survive termination shall survive, including ownership provisions, warranty disclaimers, indemnity, and limitations of liability.",
      "You may close your account at any time by contacting us at care@nxtsft.com.",
    ],
  },
  {
    id: "general",
    title: "15. General Provisions",
    body: [
      "These Terms, together with the Privacy Policy and any other agreements expressly incorporated by reference, constitute the entire agreement between you and NxtSft.com regarding your use of the Platform.",
      "If any provision of these Terms is found to be invalid or unenforceable, that provision will be enforced to the maximum extent permissible, and the other provisions will remain in full force and effect.",
      "Our failure to enforce any right or provision of these Terms will not be deemed a waiver of such right or provision.",
      "These Terms are personal to you and may not be assigned or transferred without our prior written consent. We may freely assign these Terms.",
    ],
  },
  {
    id: "contact",
    title: "16. Contact Us",
    body: ["If you have questions or concerns about these Terms, please contact:"],
    contact: {
      company: "NxtSft.com Technology Pvt. Ltd.",
      address: "Cyber City, Gurugram 122002, Haryana, India",
      email: "hello@nxtsft.com",
      support: "care@nxtsft.com",
    },
  },
];

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      {/* Hero */}
      <section className="border-b border-border bg-white">
        <div className="mx-auto max-w-4xl px-6 py-16">
          <div className="text-xs font-bold uppercase tracking-widest text-accent">Legal</div>
          <h1 className="mt-3 font-display text-4xl font-black text-navy sm:text-5xl">
            Terms of Use
          </h1>
          <p className="mt-4 text-base text-muted-foreground">
            Please read these terms carefully before using the NxtSft.com platform.
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
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-6 py-4 text-sm text-amber-800">
              <strong>Important notice:</strong> NxtSft.com is an online marketplace intermediary.
              We do not own, sell, or lease any property and are not party to any real estate
              transaction. All transactions are solely between the buyer/tenant and seller/landlord.
            </div>

            {SECTIONS.map((s) => (
              <section key={s.id} id={s.id} className="scroll-mt-24">
                <h2 className="mb-4 font-display text-xl font-bold text-navy">{s.title}</h2>
                {s.body.map((p, i) => (
                  <p key={i} className="mb-3 text-sm leading-relaxed text-foreground/75">
                    {p}
                  </p>
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
                {"contact" in s && s.contact && (
                  <div className="mt-4 rounded-xl border border-border bg-white p-5 text-sm">
                    <div className="font-semibold text-navy">{s.contact.company}</div>
                    <div className="mt-1 text-muted-foreground">{s.contact.address}</div>
                    <div className="mt-3 space-y-1">
                      <div>
                        General:{" "}
                        <a
                          href={`mailto:${s.contact.email}`}
                          className="text-accent hover:underline"
                        >
                          {s.contact.email}
                        </a>
                      </div>
                      <div>
                        Support:{" "}
                        <a
                          href={`mailto:${s.contact.support}`}
                          className="text-accent hover:underline"
                        >
                          {s.contact.support}
                        </a>
                      </div>
                    </div>
                  </div>
                )}
              </section>
            ))}
          </article>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
