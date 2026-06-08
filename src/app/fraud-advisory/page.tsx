import type { Metadata } from 'next';
import Link from 'next/link';
import { AlertTriangle, ShieldCheck, Phone, Mail, Search, UserX, CreditCard, Link2, Eye, CheckCircle2, Tag, MessageSquare, Lock } from 'lucide-react';
import { SiteHeader } from '@/components/site/SiteHeader';
import { SiteFooter } from '@/components/site/SiteFooter';

export const metadata: Metadata = {
  title: 'Fraud Advisory — NxtSft.com',
  description: 'Learn how to identify real estate fraud and scams. NxtSft.com\'s guide to staying safe when buying, renting, or selling property online.',
};

const RED_FLAGS = [
  {
    icon: CreditCard,
    title: 'Advance payment demands',
    desc: 'Being asked to pay a token, security deposit, or "processing fee" before viewing the property, meeting the owner, or signing any agreement — especially via UPI, wire transfer, or cryptocurrency.',
  },
  {
    icon: UserX,
    title: 'Owner is unavailable to meet',
    desc: 'The seller or landlord claims to be abroad, in the military, or otherwise unable to show the property in person and insists on completing the deal remotely via email or messaging apps.',
  },
  {
    icon: Tag,
    title: 'Prices far below market rate',
    desc: 'An offer that seems too good to be true — property priced 30–60% below comparable listings in the same area — is a classic lure used to create urgency and bypass due diligence.',
  },
  {
    icon: Link2,
    title: 'Fake or impersonated listings',
    desc: 'Fraudsters copy legitimate listings from NxtSft.com or other platforms and re-post them with fake contact details. Always verify that the contact number matches the one on NxtSft.com.',
  },
  {
    icon: Search,
    title: 'Pressure and urgency tactics',
    desc: '"Multiple people are interested — you need to pay now to hold it." Legitimate owners and agents will always allow reasonable time for due diligence and document verification.',
  },
  {
    icon: Mail,
    title: 'Phishing communications',
    desc: 'Emails, SMS, or WhatsApp messages purporting to be from NxtSft.com that ask for your login credentials, OTP, banking details, or Aadhaar/PAN information. NxtSft.com will never ask for these.',
  },
  {
    icon: Eye,
    title: 'Missing or suspicious documents',
    desc: 'Refusal to share property title documents, RERA registration certificate, encumbrance certificate, or society NOC before taking any payment or agreement.',
  },
  {
    icon: MessageSquare,
    title: 'Off-platform communication',
    desc: 'Being asked to continue communication outside NxtSft.com to avoid records — via personal email, messaging apps, or through unverified third parties posing as NxtSft.com agents.',
  },
];

const FRAUD_TYPES = [
  {
    tag: 'Rental Fraud',
    color: 'bg-red-50 border-red-200 text-red-800',
    tagColor: 'bg-red-100 text-red-700',
    title: 'Fake rental listings',
    desc: 'A non-existent or already-rented property is advertised at an attractive rate. The fraudster collects an advance deposit and vanishes, leaving the victim without a property or refund.',
    howItWorks: [
      'Scammer finds real property photos online and creates a fake listing.',
      'Victim expresses interest; scammer claims to be the owner or NRI landlord.',
      'Advance deposit is requested before the property can be "reserved".',
      'After payment, the scammer becomes unreachable.',
    ],
  },
  {
    tag: 'Title Fraud',
    color: 'bg-orange-50 border-orange-200 text-orange-800',
    tagColor: 'bg-orange-100 text-orange-700',
    title: 'Property title and document fraud',
    desc: 'Forged title deeds, NOCs, or sale agreements are used to sell or mortgage properties that the fraudster does not legally own, or to sell the same property to multiple buyers.',
    howItWorks: [
      'Fraudster obtains or forges property documents.',
      'Presents plausible paperwork; may engage accomplice "lawyers" or "sub-registrars".',
      'Buyer pays full or partial consideration and receives forged documents.',
      'Fraud is discovered only when the real owner or another buyer surfaces.',
    ],
  },
  {
    tag: 'Builder Fraud',
    color: 'bg-amber-50 border-amber-200 text-amber-800',
    tagColor: 'bg-amber-100 text-amber-700',
    title: 'Fraudulent developer projects',
    desc: 'Unscrupulous builders collect bookings for projects that are never built or do not match representations — missing RERA registration, illegal land use, or outright abandonment after fund collection.',
    howItWorks: [
      'Developer launches a project with attractive brochures and low prices.',
      'Project may not be RERA-registered or may be on disputed/agricultural land.',
      'Buyers make substantial payments; construction stalls or never begins.',
      'Developer winds up operations or files insolvency, leaving buyers stranded.',
    ],
  },
  {
    tag: 'Phishing',
    color: 'bg-purple-50 border-purple-200 text-purple-800',
    tagColor: 'bg-purple-100 text-purple-700',
    title: 'Identity and credential phishing',
    desc: 'Fake websites, emails, or calls mimic NxtSft.com to steal login credentials, OTPs, or banking details, or to trick users into making payments to fraudulent accounts.',
    howItWorks: [
      'Victim receives a communication appearing to be from NxtSft.com.',
      'Asked to log in through a fake link or share OTP to "verify account".',
      'Credentials are harvested and used to access the real account.',
      'Personal data, saved properties, or Credits are misused.',
    ],
  },
];

const PROTECTIONS = [
  { icon: ShieldCheck, title: 'Verified listings badge', desc: 'Our team manually verifies select listings for title authenticity, RERA registration, and ownership documents. Look for the "Verified" badge.' },
  { icon: CheckCircle2, title: 'Agent credentialing', desc: 'Agents on NxtSft.com must submit RERA agent registration details and valid ID proof before accessing lead tools.' },
  { icon: Eye, title: 'Fraud detection algorithms', desc: 'Our systems flag suspicious activity patterns — bulk listings, duplicate property photos, abnormal pricing, and unusual contact behaviour.' },
  { icon: Lock, title: 'Masked contact numbers', desc: 'Phone numbers are masked in listings until a Credit is used. This discourages mass data harvesting by bad actors.' },
  { icon: MessageSquare, title: 'In-Platform messaging', desc: 'All communication on NxtSft.com is through our Platform, creating a record that can be reviewed in case of a dispute.' },
  { icon: AlertTriangle, title: 'User report mechanism', desc: 'Any user can flag a suspicious listing or user via the "Report" button. Our trust team reviews all reports within 24 hours.' },
];

export default function FraudAdvisoryPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      {/* Hero */}
      <section className="border-b border-border bg-white">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <div className="text-xs font-bold uppercase tracking-widest text-amber-600">Safety & Fraud Advisory</div>
          </div>
          <h1 className="mt-3 font-display text-4xl font-black text-navy sm:text-5xl">
            Protect Yourself from<br className="hidden sm:block" /> Real Estate Fraud
          </h1>
          <p className="mt-5 max-w-2xl text-base text-muted-foreground">
            Real estate transactions involve large sums of money, making them a prime target for fraudsters. This advisory helps you recognise, avoid, and report fraud when buying, renting, or selling property on NxtSft.com.
          </p>

          {/* Emergency report CTA */}
          <div className="mt-8 inline-flex flex-col gap-3 rounded-2xl border-2 border-red-200 bg-red-50 px-6 py-5 sm:flex-row sm:items-center sm:gap-6">
            <div>
              <div className="text-sm font-bold text-red-700">Suspect fraud right now?</div>
              <div className="mt-0.5 text-xs text-red-600">Report immediately — do not make any payments.</div>
            </div>
            <a
              href="mailto:hello@nxtsft.com?subject=Fraud%20Report"
              className="shrink-0 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-red-700"
            >
              Report Fraud →
            </a>
          </div>
        </div>
      </section>

      {/* NxtSft.com is not responsible notice */}
      <div className="border-b border-amber-200 bg-amber-50">
        <div className="mx-auto max-w-5xl px-6 py-4">
          <p className="text-xs text-amber-800">
            <strong>Disclaimer:</strong> NxtSft.com is an online marketplace and intermediary. We do not own, sell, or lease any property listed on the Platform and are not party to any transaction. While we work hard to keep the Platform safe, we cannot guarantee the authenticity of every listing or the conduct of every user. Always exercise independent due diligence before making any payment or signing any agreement.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-6 py-14 space-y-16">

        {/* Common fraud types */}
        <section>
          <div className="mb-2 text-xs font-bold uppercase tracking-widest text-accent">Know the threats</div>
          <h2 className="font-display text-2xl font-black text-navy sm:text-3xl">Common types of real estate fraud</h2>
          <p className="mt-3 text-sm text-muted-foreground">Understanding how these scams operate is the first step to protecting yourself.</p>

          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            {FRAUD_TYPES.map((f) => (
              <div key={f.tag} className={`rounded-2xl border p-6 ${f.color}`}>
                <span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${f.tagColor}`}>{f.tag}</span>
                <h3 className="mt-3 font-display text-base font-bold">{f.title}</h3>
                <p className="mt-2 text-xs leading-relaxed opacity-80">{f.desc}</p>
                <div className="mt-4">
                  <div className="mb-2 text-[10px] font-bold uppercase tracking-widest opacity-60">How it typically works</div>
                  <ol className="space-y-1">
                    {f.howItWorks.map((step, i) => (
                      <li key={i} className="flex gap-2 text-xs leading-relaxed">
                        <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-current/20 text-[9px] font-bold">{i + 1}</span>
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Red flags */}
        <section>
          <div className="mb-2 text-xs font-bold uppercase tracking-widest text-red-500">Warning signs</div>
          <h2 className="font-display text-2xl font-black text-navy sm:text-3xl">Red flags to watch out for</h2>
          <p className="mt-3 text-sm text-muted-foreground">If you encounter any of the following, stop the transaction and contact us.</p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {RED_FLAGS.map((f) => (
              <div key={f.title} className="flex gap-4 rounded-2xl border border-border bg-white p-5 transition hover:border-red-200 hover:shadow-sm">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-50">
                  <f.icon className="h-4 w-4 text-red-500" />
                </div>
                <div>
                  <div className="font-semibold text-sm text-navy">{f.title}</div>
                  <div className="mt-1 text-xs leading-relaxed text-muted-foreground">{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Due diligence checklist */}
        <section className="rounded-2xl border border-border bg-white p-8">
          <div className="mb-2 text-xs font-bold uppercase tracking-widest text-accent">Buyer & Tenant Checklist</div>
          <h2 className="font-display text-2xl font-black text-navy">Due diligence before you pay</h2>
          <p className="mt-3 text-sm text-muted-foreground">Complete every item on this list before transferring any money or signing any document.</p>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {[
              'Physically visit the property before making any payment.',
              'Verify the seller\'s or landlord\'s identity with government-issued photo ID.',
              'Check the property\'s title deed at the local sub-registrar\'s office.',
              'Obtain an Encumbrance Certificate to confirm no pending loans or liens.',
              'Verify RERA registration number on the official state RERA portal.',
              'Confirm that property taxes and utility bills are current and in the owner\'s name.',
              'Engage an independent legal counsel to review all sale/rental agreements.',
              'Never pay via cryptocurrency, gift cards, or unverified personal accounts.',
              'Verify the NxtSft.com listing URL matches nxtsft.com — not a lookalike domain.',
              'Do not share your OTP, login credentials, or Aadhaar/PAN with anyone.',
              'For under-construction projects, check builder-buyer agreement and RERA project page.',
              'Ensure the agreement specifies possession date, penalties for delay, and refund terms.',
            ].map((item, i) => (
              <div key={i} className="flex gap-3 rounded-xl border border-border px-4 py-3">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                <span className="text-xs leading-relaxed text-foreground/70">{item}</span>
              </div>
            ))}
          </div>
        </section>

        {/* How NxtSft protects you */}
        <section>
          <div className="mb-2 text-xs font-bold uppercase tracking-widest text-accent">Our commitment</div>
          <h2 className="font-display text-2xl font-black text-navy sm:text-3xl">How NxtSft.com works to keep you safe</h2>

          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {PROTECTIONS.map((p) => (
              <div key={p.title} className="rounded-2xl border border-border bg-white p-5">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-accent/8">
                  <p.icon className="h-5 w-5 text-accent" />
                </div>
                <div className="font-semibold text-sm text-navy">{p.title}</div>
                <div className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{p.desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* What to do */}
        <section className="rounded-2xl border-2 border-navy/10 bg-navy/[0.03] p-8">
          <div className="mb-2 text-xs font-bold uppercase tracking-widest text-navy">Action plan</div>
          <h2 className="font-display text-2xl font-black text-navy">If you suspect or have been a victim of fraud</h2>

          <div className="mt-6 space-y-4">
            {[
              { step: '01', title: 'Stop all communication and payments', desc: 'Do not send any further money. Block the suspect\'s contact on all channels and preserve all communication records (screenshots, emails, messages).' },
              { step: '02', title: 'Report to NxtSft.com', desc: 'Email hello@nxtsft.com with the subject line "Fraud Report". Include the listing URL, contact details of the suspected fraudster, and all supporting screenshots. Our Trust & Safety team will investigate within 24 hours.' },
              { step: '03', title: 'File a police complaint', desc: 'Visit your nearest police station or file a complaint online at the National Cyber Crime Reporting Portal (cybercrime.gov.in). Provide all evidence including payment receipts and communication history.' },
              { step: '04', title: 'Contact your bank immediately', desc: 'If you have transferred money, contact your bank\'s fraud hotline immediately. Report the UPI transaction to NPCI at cybercrime.gov.in or call 1930 (National Cyber Crime Helpline).' },
              { step: '05', title: 'File with RERA', desc: 'For builder or developer fraud, file a complaint with the state RERA authority. RERA provides a formal adjudication mechanism for such disputes.' },
            ].map((item) => (
              <div key={item.step} className="flex gap-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-navy font-display text-sm font-black text-white">{item.step}</div>
                <div>
                  <div className="font-semibold text-sm text-navy">{item.title}</div>
                  <div className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Report CTA */}
        <section className="rounded-2xl border border-border bg-white p-8 text-center">
          <h2 className="font-display text-xl font-black text-navy">Report a suspicious listing or user</h2>
          <p className="mt-3 text-sm text-muted-foreground max-w-lg mx-auto">
            See something that doesn&apos;t look right? Use the "Report" button on any listing, or write to us directly. Every report is reviewed by our team.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href="mailto:hello@nxtsft.com?subject=Fraud%20Report"
              className="rounded-xl bg-accent px-6 py-3 text-sm font-bold text-white shadow-sm shadow-accent/30 transition hover:opacity-90"
            >
              Email hello@nxtsft.com
            </a>
            <Link
              href="/contact"
              className="rounded-xl border border-border px-6 py-3 text-sm font-semibold text-foreground transition hover:bg-secondary"
            >
              Go to Contact page
            </Link>
          </div>
          <p className="mt-5 text-xs text-muted-foreground">
            National Cyber Crime Helpline: <strong>1930</strong> &nbsp;|&nbsp; cybercrime.gov.in
          </p>
        </section>
      </div>

      <SiteFooter />
    </div>
  );
}
