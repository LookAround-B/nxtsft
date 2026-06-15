"use client";
import Image from "next/image";
import { Section } from "@/components/portal/PortalShell";
import { properties } from "@/data/static";
import { Head } from "./shared";

export function ListingsTab() {
  return (
    <>
      <Head t="Assigned Listings" s="Properties tagged to you." />
      <Section title="Inventory">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {properties.map((p) => (
            <div key={p.id} className="overflow-hidden rounded-lg border border-border">
              <Image
                src={p.image}
                alt=""
                width={640}
                height={128}
                className="h-32 w-full object-cover"
              />
              <div className="p-3">
                <div className="text-xs text-muted-foreground">{p.locality}</div>
                <div className="font-semibold text-navy">{p.title}</div>
                <div className="mt-1 font-display text-base font-bold text-accent">
                  {p.priceLabel}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}
