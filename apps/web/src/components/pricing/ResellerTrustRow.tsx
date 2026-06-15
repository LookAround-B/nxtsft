import { BadgeCheck, UserCheck, Shield } from "lucide-react";

export function ResellerTrustRow() {
  const items = [
    {
      icon: <BadgeCheck size={20} className="text-emerald-500" />,
      title: "Intent-Verified Leads",
      desc: "Every buyer lead has a verified identity and active property search — no cold contacts, no time wasters.",
    },
    {
      icon: <UserCheck size={20} className="text-accent" />,
      title: "Dedicated RM from Day 1",
      desc: "Your Relationship Manager is assigned within 2 hours of purchase and stays with you until closing.",
    },
    {
      icon: <Shield size={20} className="text-gold" />,
      title: "Zero Commission",
      desc: "Flat-fee plans only. We charge nothing on your sale proceeds — every rupee from the deal is yours.",
    },
  ];
  return (
    <div className="mx-auto mt-8 max-w-6xl px-5 sm:px-6">
      <div className="grid gap-4 sm:grid-cols-3">
        {items.map(({ icon, title, desc }) => (
          <div
            key={title}
            className="flex gap-4 rounded-2xl border border-border bg-white p-5 shadow-sm"
          >
            <div className="mt-0.5 shrink-0">{icon}</div>
            <div>
              <div className="font-display text-sm font-bold text-navy">{title}</div>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
