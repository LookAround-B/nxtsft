"use client";
import { toast } from "sonner";
import { Badge, Section } from "@/components/portal/PortalShell";
import { Head } from "./shared";

export function KYCTab() {
  return (
    <>
      <Head t="Documents (KYC)" s="Verify once, transact faster." />
      <Section title="Status">
        {(
          [
            ["Aadhaar", "Verified", "success"],
            ["PAN Card", "Verified", "success"],
            ["Income Proof", "Pending", "warm"],
          ] as const
        ).map(([d, s, t]) => (
          <div
            key={d}
            className="flex items-center justify-between border-b border-border py-3 last:border-0"
          >
            <span className="text-sm">{d}</span>
            <div className="flex items-center gap-2">
              <Badge tone={t}>{s}</Badge>
              {s === "Pending" && (
                <button
                  onClick={() => toast.success("Document uploaded")}
                  className="rounded-md bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground"
                >
                  Upload
                </button>
              )}
            </div>
          </div>
        ))}
      </Section>
    </>
  );
}
