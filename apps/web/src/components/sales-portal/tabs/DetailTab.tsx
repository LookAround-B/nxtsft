"use client";
import { FileText } from "lucide-react";
import { Section } from "@/components/portal/PortalShell";
import { Head } from "./shared";

export function DetailTab() {
  return (
    <>
      <Head t="Lead Detail" s="Open a lead to see full context." />
      <Section title="Lead Detail">
        <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
          <FileText size={32} className="text-muted-foreground/40" />
          <p className="max-w-md text-sm text-muted-foreground">
            Pick a lead from{" "}
            <a
              href="/sales-portal"
              onClick={(e) => {
                e.preventDefault();
                window.location.hash = "";
              }}
              className="font-semibold text-accent hover:underline"
            >
              My Leads
            </a>{" "}
            to view its profile, timeline and log the next action.
          </p>
        </div>
      </Section>
    </>
  );
}
