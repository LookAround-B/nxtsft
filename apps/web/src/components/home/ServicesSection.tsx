import { SERVICES } from "@/components/home/homeData";
import { Eyebrow } from "@/components/home/Eyebrow";
import { PropertyIllustration } from "@/components/home/PropertyIllustration";

export function ServicesSection() {
  return (
    <section className="px-4 py-5 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-7">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
            {/* left: heading + grid */}
            <div className="flex-1">
              <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div data-reveal>
                  <Eyebrow>Platform Features</Eyebrow>
                  <h2 className="mt-1 font-display text-xl font-black text-navy sm:text-2xl">
                    Everything You Need at One Place
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    From discovery to possession — NxtSft.com covers every step.
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  {["For Buyers", "For Sellers"].map((t, i) => (
                    <span
                      key={t}
                      className={`rounded-full border px-3 py-1.5 text-xs font-semibold
                        ${i === 0 ? "border-transparent bg-navy text-white" : "border-border bg-white text-muted-foreground"}`}
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {SERVICES.map(({ Icon, title, desc }, i) => (
                  <div
                    key={title}
                    data-reveal="scale"
                    className="group flex flex-col items-center rounded-2xl border border-border bg-secondary/30 p-4 text-center transition hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-md"
                    style={{ transitionDelay: `${i * 60}ms` }}
                  >
                    <span className="mb-3 grid h-12 w-12 place-items-center rounded-xl bg-accent/10 text-accent transition group-hover:bg-accent group-hover:text-white">
                      <Icon size={22} strokeWidth={1.75} />
                    </span>
                    <h3 className="mb-1 text-sm font-bold leading-tight text-navy">{title}</h3>
                    <p className="text-[11px] leading-relaxed text-muted-foreground">{desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* right: house illustration (desktop only) */}
            <PropertyIllustration className="hidden lg:block lg:w-[300px] lg:shrink-0" />
          </div>
        </div>
      </div>
    </section>
  );
}
