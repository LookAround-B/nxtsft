"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

export function FAQ({ faqs, title }: { faqs: string[][]; title?: string }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section className="mx-auto max-w-4xl px-6 py-14">
      <div className="mb-2 text-xs font-bold uppercase tracking-widest text-accent text-center">
        Common questions
      </div>
      <h2 className="text-center font-display text-2xl font-black text-navy sm:text-3xl">
        {title ?? "Frequently asked questions"}
      </h2>
      <p className="mt-3 text-center text-sm text-muted-foreground">
        Everything you need to know before you buy.
      </p>
      <div className="mt-8 divide-y divide-border rounded-2xl border border-border bg-white overflow-hidden shadow-sm">
        {faqs.map(([q, a], i) => (
          <div key={q}>
            <button
              onClick={() => setOpen(open === i ? null : i)}
              className="flex w-full items-start justify-between gap-4 px-6 py-5 text-left transition hover:bg-secondary/30"
            >
              <span className="font-display text-sm font-bold text-navy pr-2 leading-snug">
                {q}
              </span>
              <span className="mt-0.5 shrink-0 text-accent">
                {open === i ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </span>
            </button>
            {open === i && (
              <div className="border-t border-border bg-secondary/20 px-6 pb-5 pt-4">
                <p className="text-sm leading-relaxed text-foreground/70">{a}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
