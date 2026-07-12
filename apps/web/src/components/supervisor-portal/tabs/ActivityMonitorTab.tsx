"use client";
import { Activity as ActivityIcon } from "lucide-react";
import { Section } from "@/components/portal/PortalShell";
import { PageHead } from "./shared";

export function ActivityMonitorTab() {
  return (
    <>
      <PageHead title="Activity Monitor" sub="Team calls, visits and engagement." />
      <Section title="Team Activity">
        <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
          <ActivityIcon size={32} className="text-muted-foreground/40" />
          <p className="max-w-md text-sm text-muted-foreground">
            Per-rep call and visit tracking will appear here as the team logs activity. Live
            platform-wide activity is available to admins in the Audit Trail and User Activity views.
          </p>
        </div>
      </Section>
    </>
  );
}
