"use client";
import { Users } from "lucide-react";
import { Section } from "@/components/portal/PortalShell";
import { PageHead } from "./shared";

export function ReassignmentTab() {
  return (
    <>
      <PageHead title="Reassignment" sub="Move a lead from one rep to another." />
      <Section title="Lead Reassignment">
        <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
          <Users size={32} className="text-muted-foreground/40" />
          <p className="max-w-md text-sm text-muted-foreground">
            Reassign a lead directly from the{" "}
            <a
              href="/supervisor-portal#leads"
              onClick={(e) => {
                e.preventDefault();
                window.location.hash = "leads";
              }}
              className="font-semibold text-accent hover:underline"
            >
              Team Leads
            </a>{" "}
            list — pick a lead and choose the rep. Team workload will surface here once leads are assigned.
          </p>
        </div>
      </Section>
    </>
  );
}
