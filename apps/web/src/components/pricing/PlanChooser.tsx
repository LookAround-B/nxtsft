"use client";

import { useState } from "react";
import { Check, ArrowRight, Sparkles } from "lucide-react";
import { CHOOSER_FLOWS, type ChooserVariant } from "@/components/pricing/pricingData";

export function PlanChooser({
  variant,
  onScrollToPlans,
}: {
  variant: ChooserVariant;
  onScrollToPlans: (id: string) => void;
}) {
  const flow = CHOOSER_FLOWS[variant];
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [result, setResult] = useState<{ planId: string; name: string; why: string } | null>(null);

  const pick = (val: string) => {
    const next = [...answers, val];
    if (step < flow.steps.length - 1) {
      setAnswers(next);
      setStep(step + 1);
    } else {
      setResult(flow.recommend(next));
    }
  };

  const reset = () => {
    setStep(0);
    setAnswers([]);
    setResult(null);
  };

  return (
    <section className="mx-auto max-w-6xl px-5 pb-6 sm:px-6">
      <div className="rounded-3xl border-2 border-accent/20 bg-gradient-to-br from-accent/5 to-transparent p-8">
        <div className="flex items-center gap-2.5 mb-1">
          <Sparkles size={18} className="text-accent" />
          <div className="text-xs font-bold uppercase tracking-widest text-accent">
            Plan Customisation
          </div>
        </div>
        <h3 className="font-display text-xl font-black text-navy">Not sure which plan to pick?</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Answer 3 quick questions and we&apos;ll recommend the best plan for your situation.
        </p>

        {!result ? (
          <div className="mt-7">
            {/* Progress bar */}
            <div className="mb-5 flex items-center gap-2">
              {flow.steps.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${i <= step ? "bg-accent" : "bg-border"}`}
                />
              ))}
            </div>
            <div className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-3">
              Step {step + 1} of {flow.steps.length}
            </div>
            <div className="font-display text-base font-bold text-navy mb-5">
              {flow.steps[step].q}
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:flex lg:flex-wrap">
              {flow.steps[step].options.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => pick(opt.value)}
                  className="group flex flex-col items-start rounded-2xl border-2 border-border bg-white px-5 py-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-accent hover:shadow-md lg:min-w-[150px]"
                >
                  <span className="font-semibold text-sm text-navy group-hover:text-accent">
                    {opt.label}
                  </span>
                  {opt.sub && (
                    <span className="mt-0.5 text-xs text-muted-foreground">{opt.sub}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mt-7">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent text-white">
                <Check size={22} strokeWidth={2.5} />
              </div>
              <div className="flex-1">
                <div className="text-[11px] font-bold uppercase tracking-widest text-accent mb-1">
                  We recommend
                </div>
                <div className="font-display text-2xl font-black text-navy">{result.name}</div>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{result.why}</p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    onClick={() => onScrollToPlans(result.planId)}
                    className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:opacity-90"
                  >
                    View plan <ArrowRight size={14} />
                  </button>
                  <button
                    onClick={reset}
                    className="inline-flex items-center gap-2 rounded-xl border border-border bg-white px-5 py-2.5 text-sm font-semibold text-foreground/70 transition hover:bg-secondary"
                  >
                    Start over
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
