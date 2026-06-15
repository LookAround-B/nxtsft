"use client";
import { useState } from "react";
import { Section } from "@/components/portal/PortalShell";
import { Head } from "./shared";

export function EMICalcTab() {
  const [P, setP] = useState(25000000);
  const [r, setR] = useState(8.6);
  const [n, setN] = useState(20);
  const monthly =
    (P * (r / 1200) * Math.pow(1 + r / 1200, n * 12)) / (Math.pow(1 + r / 1200, n * 12) - 1);
  return (
    <>
      <Head t="EMI Calculator" s="Estimate your monthly payment." />
      <Section title="Inputs">
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">
              Loan Amount (₹)
            </label>
            <input
              type="number"
              value={P}
              onChange={(e) => setP(Number(e.target.value))}
              className="mt-1 w-full rounded-md border border-border bg-white px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">
              Interest %
            </label>
            <input
              type="number"
              step="0.1"
              value={r}
              onChange={(e) => setR(Number(e.target.value))}
              className="mt-1 w-full rounded-md border border-border bg-white px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">
              Tenure (yrs)
            </label>
            <input
              type="number"
              value={n}
              onChange={(e) => setN(Number(e.target.value))}
              className="mt-1 w-full rounded-md border border-border bg-white px-3 py-2 text-sm"
            />
          </div>
        </div>
        <div className="mt-5 rounded-lg bg-navy p-5 text-white">
          <div className="text-xs uppercase tracking-widest text-white/60">Estimated EMI</div>
          <div className="mt-1 font-display text-4xl font-bold text-gold">
            ₹ {Math.round(monthly).toLocaleString("en-IN")}{" "}
            <span className="text-sm text-white/50">/month</span>
          </div>
        </div>
      </Section>
    </>
  );
}
