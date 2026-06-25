"use client";
import { useState } from "react";
import { toast } from "sonner";
import Image from "next/image";
import { Section, Badge } from "@/components/portal/PortalShell";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { MessageSquare } from "lucide-react";
import { leads, activities, propertyViews, properties } from "@/data/static";
import { Head, Field, latestNote } from "./shared";

const leadMeta: Record<
  string,
  { budgetRange: string; source: "WhatsApp" | "Organic" | "Referral"; daysInPipeline: number }
> = {
  default: { budgetRange: "₹40L–₹60L", source: "Organic", daysInPipeline: 12 },
};

function getMeta(id: string) {
  return leadMeta[id] ?? leadMeta["default"];
}

export function DetailTab() {
  const l = leads[0];
  const leadViews = propertyViews.filter((v) => v.leadId === l.id);
  const fmtDur = (s: number) => (s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`);

  const [nextAction, setNextAction] = useState("Call");
  const [nextDate, setNextDate] = useState("");

  const activityIcons: Record<string, string> = {
    call: "📞",
    visit: "🏠",
    note: "📝",
    whatsapp: "💬",
  };
  function getIcon(action: string) {
    const key = Object.keys(activityIcons).find((k) => action.toLowerCase().includes(k));
    return key ? activityIcons[key] : "📋";
  }

  return (
    <>
      <Head t={`Lead Detail — ${l.name}`} s={`${l.id} · ${l.interest}`} />

      <Section title="Profile">
        <div className="grid gap-4 md:grid-cols-2">
          <Field k="Name" v={l.name} />
          <Field k="Phone" v={l.phone} />
          <Field k="City" v={l.city} />
          <Field k="Source" v={l.source} />
          <Field k="Budget Range" v={getMeta(l.id).budgetRange} />
          <Field k="Property Type Preferred" v={l.interest} />
          <Field k="Timeline" v="6 months" />
          <Field k="Last Contacted" v={l.lastActivity} />
        </div>
        {latestNote(l.notes) && (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-border bg-muted/40 p-3">
            <MessageSquare size={14} className="mt-0.5 shrink-0 text-muted-foreground/60" />
            <div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Latest Comment
              </div>
              <p className="mt-0.5 text-sm text-navy">{latestNote(l.notes)}</p>
            </div>
          </div>
        )}
      </Section>

      {/* Next Action */}
      <Section title="Next Action">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Action Type
            </label>
            <Select value={nextAction} onValueChange={setNextAction}>
              <SelectTrigger className="min-w-[10rem] font-semibold text-navy">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["Call", "WhatsApp", "Site Visit", "Send Brochure"].map((o) => (
                  <SelectItem key={o} value={o}>{o}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Scheduled Date
            </label>
            <input
              type="date"
              value={nextDate}
              onChange={(e) => setNextDate(e.target.value)}
              className="rounded-md border border-border bg-background px-3 py-2 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <button
            onClick={() =>
              toast.success(`Action logged: ${nextAction}${nextDate ? ` on ${nextDate}` : ""}`)
            }
            className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white"
          >
            Log Action
          </button>
        </div>
      </Section>

      <Section
        title={`Properties Viewed by ${l.name}`}
        action={
          <span className="text-xs font-semibold text-muted-foreground">
            {leadViews.length} properties
          </span>
        }
      >
        {leadViews.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No property views linked to this lead yet.
          </p>
        ) : (
          <div className="divide-y divide-border">
            {leadViews.map((v) => {
              const prop = properties.find((p) => p.id === v.propertyId);
              return (
                <div key={v.id} className="flex items-center gap-4 py-3">
                  {prop && (
                    <Image
                      src={prop.image}
                      alt=""
                      width={64}
                      height={48}
                      className="flex-shrink-0 rounded-lg object-cover"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-navy truncate">{v.propertyTitle}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {v.city} · {fmtDur(v.durationSec)} spent · {v.ts}
                    </div>
                  </div>
                  {v.contactUnlocked && <Badge tone="success">Contact Unlocked</Badge>}
                </div>
              );
            })}
          </div>
        )}
      </Section>

      <Section title="Timeline">
        <div className="relative pl-6">
          <div className="absolute left-2 top-0 h-full w-px bg-border" />
          {activities.slice(0, 4).map((a, i) => (
            <div key={i} className="relative mb-4 last:mb-0">
              <div className="absolute -left-4 top-0.5 flex h-5 w-5 items-center justify-center rounded-full border border-border bg-background text-xs">
                {getIcon(a.action)}
              </div>
              <div className="rounded-lg border border-border p-3">
                <div className="font-semibold text-navy text-sm">{a.action}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {a.outcome} · {a.ts}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}
