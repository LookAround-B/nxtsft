"use client";
import { Building2 } from "lucide-react";
import { Section } from "@/components/portal/PortalShell";
import { Head } from "./shared";

export function ListingsTab() {
  return (
    <>
      <Head t="Listings" s="Browse the property catalogue." />
      <Section title="Listings">
        <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
          <Building2 size={32} className="text-muted-foreground/40" />
          <p className="max-w-md text-sm text-muted-foreground">
            Browse the full property catalogue on the{" "}
            <a href="/properties" className="font-semibold text-accent hover:underline">
              Properties
            </a>{" "}
            page. Listings you own or manage will appear here.
          </p>
        </div>
      </Section>
    </>
  );
}
