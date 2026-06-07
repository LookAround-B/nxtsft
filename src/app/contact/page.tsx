'use client';
import { toast } from 'sonner';
import { SiteHeader } from '@/components/site/SiteHeader';
import { SiteFooter } from '@/components/site/SiteFooter';

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <section className="mx-auto max-w-5xl px-6 py-20">
        <div className="text-xs font-semibold uppercase tracking-widest text-accent">Get in touch</div>
        <h1 className="mt-2 font-display text-5xl font-bold text-navy">Let's talk property.</h1>
        <div className="mt-12 grid gap-10 md:grid-cols-2">
          <form className="space-y-4 rounded-2xl border border-border bg-white p-8">
            {['Full name', 'Email address', 'Phone number', 'City of interest'].map((l) => (
              <div key={l}>
                <label className="text-xs uppercase tracking-wider text-muted-foreground">{l}</label>
                <input className="mt-1 w-full rounded-lg border border-border bg-secondary/40 px-4 py-3 text-sm outline-none focus:border-accent" />
              </div>
            ))}
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Message</label>
              <textarea rows={4} className="mt-1 w-full rounded-lg border border-border bg-secondary/40 px-4 py-3 text-sm outline-none focus:border-accent" />
            </div>
            <button type="button" onClick={() => toast.success("Enquiry sent! We'll reach out within 24 hours.")} className="w-full rounded-xl bg-accent py-3 font-display text-sm font-bold text-accent-foreground transition hover:-translate-y-0.5 hover:opacity-90 hover:shadow-lg hover:shadow-accent/20">Send Enquiry →</button>
          </form>
          <div className="space-y-6">
            {[
              ['Headquarters', 'Cyber City Tower 4, Gurugram 122002, Haryana'],
              ['Sales', '+91 1800-NXTSFT-1 · sales@nxtsft.com'],
              ['Support', 'Mon–Sun, 8am–10pm IST · care@nxtsft.com'],
              ['Partnerships', 'developers@nxtsft.com'],
            ].map(([t, d]) => (
              <div key={t} className="rounded-xl border border-border bg-white p-6">
                <div className="text-xs uppercase tracking-widest text-accent">{t}</div>
                <div className="mt-2 text-navy">{d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
