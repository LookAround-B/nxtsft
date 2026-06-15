import { WHY } from "@/components/home/homeData";
import { Eyebrow } from "@/components/home/Eyebrow";
import { PropertyIllustration } from "@/components/home/PropertyIllustration";

export function WhySection() {
  return (
    <section className="px-4 py-5 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-7">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
            {/* illustration left on desktop */}
            <PropertyIllustration className="hidden lg:block lg:w-[280px] lg:shrink-0" />

            <div className="flex-1">
              <div className="mb-5 text-center lg:text-left" data-reveal>
                <Eyebrow>Why NxtSft.com?</Eyebrow>
                <h2 className="mt-1 font-display text-xl font-black text-navy sm:text-2xl">
                  Built for every journey
                </h2>
              </div>
              <div className="grid gap-4 sm:grid-cols-3 sm:gap-5">
                {WHY.map(({ Icon, t, d }, i) => (
                  <div
                    key={t}
                    data-reveal="scale"
                    className="flex flex-col rounded-2xl border border-border bg-secondary/30 p-5 transition hover:-translate-y-1 hover:shadow-lg"
                    style={{ transitionDelay: `${i * 90}ms` }}
                  >
                    <span className="grid h-11 w-11 place-items-center rounded-xl bg-accent/10 text-accent">
                      <Icon size={22} strokeWidth={1.75} />
                    </span>
                    <h3 className="mt-4 font-display text-base font-bold text-navy">{t}</h3>
                    <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{d}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
