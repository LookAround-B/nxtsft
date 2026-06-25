"use client";
import { Flame, TrendingUp, Snowflake, TrendingDown, Sparkles, CheckCircle2 } from "lucide-react";
import { useContext } from "react";
import { AdminPortalContext } from "@/lib/admin-portal-context";
import { trpc } from "@/lib/trpc";

interface StatusCard {
  label: string;
  color: string;
  bgColor: string;
  icon: React.ReactNode;
  value: number;
  pct: number;
}

export function LeadStatusSummary() {
  const ctx = useContext(AdminPortalContext);
  const startDate = ctx?.startDate ?? null;
  const endDate = ctx?.endDate ?? null;
  const statusQ = trpc.admin.leadStatus.useQuery({
    startDate: startDate ? startDate.toISOString() : undefined,
    endDate: endDate ? endDate.toISOString() : undefined,
  });

  const data = statusQ.data;

  if (!data) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="rounded-2xl border border-border bg-white p-4 h-24 animate-pulse"
          />
        ))}
      </div>
    );
  }

  const cards: StatusCard[] = [
    {
      label: "New Leads",
      color: "text-violet-600",
      bgColor: "bg-violet-50",
      icon: <Sparkles size={18} />,
      value: data.new,
      pct: data.newPct,
    },
    {
      label: "Hot Leads",
      color: "text-red-600",
      bgColor: "bg-red-50",
      icon: <Flame size={18} />,
      value: data.hot,
      pct: data.hotPct,
    },
    {
      label: "Warm Leads",
      color: "text-amber-600",
      bgColor: "bg-amber-50",
      icon: <TrendingUp size={18} />,
      value: data.warm,
      pct: data.warmPct,
    },
    {
      label: "Cold Leads",
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      icon: <Snowflake size={18} />,
      value: data.cold,
      pct: data.coldPct,
    },
    {
      label: "Lost Leads",
      color: "text-slate-600",
      bgColor: "bg-slate-50",
      icon: <TrendingDown size={18} />,
      value: data.lost,
      pct: data.lostPct,
    },
    {
      label: "Converted",
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
      icon: <CheckCircle2 size={18} />,
      value: data.converted,
      pct: data.convertedPct,
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-base font-bold text-navy">Lead Status</h3>
        <span className="text-xs text-muted-foreground">{data.total} total leads</span>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {cards.map((card) => (
          <div
            key={card.label}
            className={`rounded-2xl border ${card.bgColor} border-border bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md`}
          >
            <div className="flex items-start justify-between mb-2">
              <span className={`inline-flex rounded-lg p-2 ${card.bgColor}`}>
                <span className={card.color}>{card.icon}</span>
              </span>
              <span className="text-[10px] font-bold text-muted-foreground">{card.pct}%</span>
            </div>
            <div className="font-display text-2xl font-black text-navy">{card.value}</div>
            <div className="text-xs font-medium text-muted-foreground mt-1">{card.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
