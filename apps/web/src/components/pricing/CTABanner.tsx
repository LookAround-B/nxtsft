import Link from "next/link";

export function CTABanner({ session }: { session: unknown }) {
  return (
    <section className="mx-auto max-w-6xl px-6 pb-20">
      <div className="rounded-3xl bg-linear-to-r from-navy-deep to-navy p-10 text-center text-white">
        <h2 className="font-display text-2xl font-black sm:text-3xl">
          Ready to find your next home — or your next tenant?
        </h2>
        <p className="mt-3 text-white/70">
          Browse verified properties first, then unlock contacts when you are ready.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-4">
          <Link
            href="/properties"
            className="rounded-xl bg-gold px-7 py-3 font-display text-sm font-bold text-navy-deep shadow-lg transition hover:opacity-90"
          >
            Browse Properties
          </Link>
          {!session && (
            <Link
              href="/register"
              className="rounded-xl border border-white/25 bg-white/10 px-7 py-3 font-display text-sm font-bold text-white backdrop-blur transition hover:bg-white/20"
            >
              Create Free Account
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
