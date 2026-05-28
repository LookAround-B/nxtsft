import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";

export const Route = createFileRoute("/about")({
  head: () => ({ meta: [{ title: "About NestIQ" }, { name: "description", content: "NestIQ vision, mission and the team building India's smart real estate ecosystem." }] }),
  component: () => (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <section className="bg-navy text-white">
        <div className="mx-auto max-w-4xl px-6 py-24">
          <div className="text-xs font-semibold uppercase tracking-widest text-gold">About</div>
          <h1 className="mt-3 font-display text-5xl font-bold">Real estate, re-engineered for India.</h1>
          <p className="mt-6 text-lg text-white/70">NestIQ democratises real estate transactions by building a transparent, technology-first marketplace — eliminating friction, opacity and information asymmetry from every step.</p>
        </div>
      </section>
      <section className="mx-auto max-w-4xl px-6 py-20">
        <div className="grid gap-10 md:grid-cols-2">
          <div>
            <div className="text-xs uppercase tracking-widest text-accent">Vision</div>
            <p className="mt-3 text-foreground/80">A pan-India marketplace that empowers buyers, renters, sellers, developers and agents — from Tier-3 first-time buyers to 500-unit developers.</p>
          </div>
          <div>
            <div className="text-xs uppercase tracking-widest text-accent">Mission</div>
            <p className="mt-3 text-foreground/80">Deliver an integrated platform where every stakeholder has access to best-in-class tools, data and support — backed by AI.</p>
          </div>
        </div>
        <div className="mt-16 rounded-2xl border border-border bg-white p-8">
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            {[["$1T", "RE by 2030"], ["13%", "of GDP"], ["40M+", "transactions/yr"], ["₹12K Cr", "PropTech TAM"]].map(([v, l]) => (
              <div key={l}>
                <div className="font-display text-3xl font-bold text-accent">{v}</div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground">{l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <SiteFooter />
    </div>
  ),
});