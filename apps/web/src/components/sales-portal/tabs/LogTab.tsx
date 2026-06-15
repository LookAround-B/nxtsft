"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Download } from "lucide-react";
import { Section, Badge } from "@/components/portal/PortalShell";
import { activities } from "@/data/static";
import { downloadCSV } from "@/lib/download-csv";
import { Head, type OutcomeTone } from "./shared";

const outcomeTone: Record<string, OutcomeTone> = {
  Positive: "success",
  Neutral: "new",
  Negative: "cold",
};

function classifyOutcome(outcome: string): "Positive" | "Neutral" | "Negative" {
  const lower = outcome.toLowerCase();
  if (lower.includes("interest") || lower.includes("confirm") || lower.includes("paid"))
    return "Positive";
  if (lower.includes("no answer") || lower.includes("callback") || lower.includes("busy"))
    return "Negative";
  return "Neutral";
}

function classifyType(action: string): string {
  const lower = action.toLowerCase();
  if (lower.includes("call")) return "Calls";
  if (lower.includes("visit")) return "Visits";
  return "Notes";
}

export function LogTab() {
  const [typeFilter, setTypeFilter] = useState<"All" | "Calls" | "Visits" | "Notes">("All");
  const allLogs = [...activities, ...activities];

  const filtered =
    typeFilter === "All" ? allLogs : allLogs.filter((a) => classifyType(a.action) === typeFilter);

  // Group by date (use first 10 chars of ts as date key)
  const grouped: Record<string, typeof allLogs> = {};
  filtered.forEach((a) => {
    const date = a.ts.slice(0, 10) || "Today";
    (grouped[date] ||= []).push(a);
  });

  function handleExport() {
    const headers = ["Date", "Action", "Outcome", "Type", "Outcome Sentiment"];
    const rows = filtered.map((a) => [
      a.ts,
      a.action,
      a.outcome,
      classifyType(a.action),
      classifyOutcome(a.outcome),
    ]);
    downloadCSV("activity-log.csv", headers, rows);
    toast.success("CSV downloaded");
  }

  return (
    <>
      <Head t="Activity Log" s="Everything you've done today." />
      <Section
        title="Log"
        action={
          <div className="flex items-center gap-3">
            <div className="flex rounded-lg border border-border overflow-hidden text-xs font-semibold">
              {(["All", "Calls", "Visits", "Notes"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setTypeFilter(f)}
                  className={`px-3 py-1.5 transition-colors ${typeFilter === f ? "bg-accent text-white" : "bg-background text-muted-foreground hover:bg-muted"}`}
                >
                  {f}
                </button>
              ))}
            </div>
            <button
              onClick={handleExport}
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted"
            >
              <Download size={12} /> Export
            </button>
          </div>
        }
      >
        {Object.entries(grouped).map(([date, entries]) => (
          <div key={date} className="mb-4 last:mb-0">
            <div className="mb-2 text-[10px] uppercase tracking-widest font-semibold text-muted-foreground border-b border-border pb-1">
              {date}
            </div>
            {entries.map((a, i) => {
              const sentiment = classifyOutcome(a.outcome);
              const tone = outcomeTone[sentiment] ?? "new";
              return (
                <div key={i} className="border-b border-border py-3 last:border-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-base">
                        {classifyType(a.action) === "Calls"
                          ? "📞"
                          : classifyType(a.action) === "Visits"
                            ? "🏠"
                            : "📝"}
                      </span>
                      <span className="font-semibold text-navy text-sm">{a.action}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge tone={tone}>{sentiment}</Badge>
                      <span className="font-mono text-xs text-muted-foreground">{a.ts}</span>
                    </div>
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground pl-7">{a.outcome}</div>
                </div>
              );
            })}
          </div>
        ))}
      </Section>
    </>
  );
}
