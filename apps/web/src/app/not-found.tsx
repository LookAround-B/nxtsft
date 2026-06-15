import Link from "next/link";
import { Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[oklch(0.97_0.01_260)] px-4 text-center">
      <div className="mb-4 text-8xl font-black text-accent/20 select-none">404</div>
      <h1 className="font-display text-2xl font-bold text-navy sm:text-3xl">
        Page not found
      </h1>
      <p className="mt-3 max-w-md text-sm text-muted-foreground">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <Home size={15} />
          Go home
        </Link>
        <Link
          href="/properties"
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-white px-5 py-2.5 text-sm font-semibold text-navy shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <ArrowLeft size={15} />
          Browse properties
        </Link>
      </div>
    </div>
  );
}
