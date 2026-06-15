import Link from "next/link";
import { CitySkySVG } from "@/components/home/CitySkySVG";

function CTADecorations() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {/* dot grid */}
      <div className="absolute inset-0 bg-dots opacity-[0.18]" />
      {/* blobs */}
      <div className="absolute -right-20 -top-20 h-72 w-72 animate-blob rounded-full bg-accent/20 blur-3xl" />
      <div className="absolute -left-12 bottom-0 h-56 w-56 animate-blob-slow rounded-full bg-gold/15 blur-3xl" />
      {/* spinning rings */}
      <div className="absolute left-10 top-10 h-24 w-24 animate-spin-slow rounded-full border border-white/10" />
      <div className="absolute right-10 bottom-8 h-16 w-16 animate-spin-slow-r rounded-full border border-white/8" />
      {/* floating dots */}
      <div className="absolute right-14 top-8 h-3 w-3 animate-float rounded-full bg-white/25" />
      <div className="absolute left-1/4 top-6 h-2 w-2 animate-float-slow rounded-full bg-white/18" />
      <div className="absolute right-1/3 bottom-6 h-2 w-2 animate-float-r rounded-full bg-gold/40" />
      {/* city skyline */}
      <CitySkySVG />
    </div>
  );
}

export function CTASection() {
  return (
    <section className="px-4 pb-14 pt-5 sm:px-6 sm:pb-16">
      <div className="mx-auto max-w-7xl">
        <div
          data-reveal
          className="relative overflow-hidden rounded-3xl bg-navy px-5 py-10 text-center text-white shadow-2xl sm:px-14 sm:py-16"
        >
          <CTADecorations />
          <div className="relative z-10">
            <h2 className="font-display text-2xl font-black sm:text-3xl md:text-4xl">
              Ready to find your <span className="text-gradient-gold">perfect home?</span>
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm text-white/70 sm:mt-4 sm:text-base">
              Join over 1 lakh buyers who discovered their dream home on NxtSft.com.
            </p>
            <div className="mt-6 flex flex-col items-center gap-3 sm:mt-8 sm:flex-row sm:justify-center sm:gap-4">
              <Link
                href="/properties"
                className="w-full rounded-xl bg-accent px-8 py-3.5 font-display text-sm font-bold text-white shadow-lg shadow-accent/40 transition hover:opacity-90 sm:w-auto"
              >
                Browse Properties
              </Link>
              <Link
                href="/register"
                className="w-full rounded-xl border border-white/25 bg-white/10 px-8 py-3.5 font-display text-sm font-bold text-white backdrop-blur transition hover:bg-white/20 sm:w-auto"
              >
                Create Free Account
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
