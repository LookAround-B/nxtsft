"use client";
import { LeadBulkTools } from "@/components/portal/LeadBulkTools";
import { PageHead } from "./shared";

// Supervisor › Reassignment: filter the team's leads, reassign in bulk, or
// transfer every lead from one rep (e.g. inactive) to another active rep.
export function ReassignmentTab() {
  return (
    <>
      <PageHead title="Reassignment" sub="Filter your team's leads, reassign in bulk, or transfer all of one rep's leads." />
      <LeadBulkTools />
    </>
  );
}
