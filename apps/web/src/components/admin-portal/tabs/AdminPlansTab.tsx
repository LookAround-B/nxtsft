"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Pencil, Check, X as XIcon } from "lucide-react";
import { StatCard, Section } from "@/components/portal/PortalShell";
import { seekerPlans, ownerRentalPlans, ownerSellPlans } from "@/data/static";
import { PageHead } from "./PageHead";

type EditablePlan = {
  id: string;
  name: string;
  price: number;
  priceLabel: string;
  credits?: number;
  validity: string;
  tagline: string;
  features: string[];
  active: boolean;
  badge?: string | null;
};

function PlanCard({
  plan,
  onSave,
  onToggle,
}: {
  plan: EditablePlan;
  onSave: (updated: EditablePlan) => void;
  onToggle: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<EditablePlan>(plan);

  const save = () => {
    onSave(draft);
    setEditing(false);
    toast.success(`"${draft.name}" saved`);
  };
  const cancel = () => {
    setDraft(plan);
    setEditing(false);
  };

  return (
    <div
      className={`rounded-2xl border-2 bg-white p-5 shadow-sm transition-all duration-200 ${plan.active ? "border-border" : "border-border/40 opacity-60"}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-display text-sm font-bold text-navy">{plan.name}</div>
          {plan.badge && (
            <span className="mt-1 inline-block rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent">
              {plan.badge}
            </span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            onClick={onToggle}
            className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider transition ${plan.active ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100" : "bg-secondary text-muted-foreground hover:bg-border"}`}
          >
            {plan.active ? "Active" : "Inactive"}
          </button>
          {!editing ? (
            <button
              onClick={() => setEditing(true)}
              className="grid h-7 w-7 place-items-center rounded-lg border border-border text-muted-foreground hover:border-accent hover:text-accent transition"
            >
              <Pencil size={12} />
            </button>
          ) : (
            <>
              <button
                onClick={save}
                className="grid h-7 w-7 place-items-center rounded-lg bg-accent text-white hover:opacity-90 transition"
              >
                <Check size={12} />
              </button>
              <button
                onClick={cancel}
                className="grid h-7 w-7 place-items-center rounded-lg border border-border text-muted-foreground hover:bg-secondary transition"
              >
                <XIcon size={12} />
              </button>
            </>
          )}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Price (₹)
          </label>
          {editing ? (
            <input
              type="number"
              value={draft.price}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  price: Number(e.target.value),
                  priceLabel: `₹${Number(e.target.value).toLocaleString("en-IN")}`,
                }))
              }
              className="mt-1 w-full rounded-lg border border-input bg-background px-2 py-1.5 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          ) : (
            <div className="mt-1 font-display text-xl font-black text-navy">{plan.priceLabel}</div>
          )}
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Validity
          </label>
          {editing ? (
            <input
              value={draft.validity}
              onChange={(e) => setDraft((d) => ({ ...d, validity: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-input bg-background px-2 py-1.5 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          ) : (
            <div className="mt-1 text-sm font-semibold text-navy">{plan.validity}</div>
          )}
        </div>
        <div className="col-span-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Description / Tagline
          </label>
          {editing ? (
            <input
              value={draft.tagline}
              onChange={(e) => setDraft((d) => ({ ...d, tagline: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-input bg-background px-2 py-1.5 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          ) : (
            <div className="mt-1 text-xs text-muted-foreground">{plan.tagline}</div>
          )}
        </div>
      </div>
    </div>
  );
}

function usePlanGroup(initial: EditablePlan[]) {
  const [plans, setPlans] = useState<EditablePlan[]>(initial);
  const save = (id: string, updated: EditablePlan) =>
    setPlans((ps) => ps.map((p) => (p.id === id ? updated : p)));
  const toggle = (id: string) =>
    setPlans((ps) => ps.map((p) => (p.id === id ? { ...p, active: !p.active } : p)));
  return { plans, save, toggle };
}

export function AdminPlansTab() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const toEditable = (p: Record<string, any>): EditablePlan => ({
    id: p.id,
    name: p.name,
    price: p.price,
    priceLabel: p.priceLabel,
    credits: p.credits,
    validity: p.validity,
    tagline: p.tagline,
    features: [...p.features],
    active: true,
    badge: "badge" in p ? (p.badge ?? null) : null,
  });

  const seekerG = usePlanGroup(seekerPlans.map(toEditable));
  const ownerRentG = usePlanGroup(ownerRentalPlans.map(toEditable));
  const ownerSellG = usePlanGroup(ownerSellPlans.map(toEditable));

  const allPlans = [...seekerG.plans, ...ownerRentG.plans, ...ownerSellG.plans];

  const renderGroup = (title: string, desc: string, group: ReturnType<typeof usePlanGroup>) => (
    <Section title={title} key={title}>
      <p className="mb-4 text-sm text-muted-foreground">{desc}</p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {group.plans.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            onSave={(updated) => group.save(plan.id, updated)}
            onToggle={() => group.toggle(plan.id)}
          />
        ))}
      </div>
    </Section>
  );

  return (
    <>
      <PageHead
        title="Plans Manager"
        subtitle="Edit plan prices and descriptions across all customer segments."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Total Plans"
          value={String(allPlans.length)}
          sub={`${allPlans.filter((p) => p.active).length} active`}
        />
        <StatCard label="Plan Groups" value="3" sub="Seeker · Owner Rent · Owner Sell" />
        <StatCard label="MRR from Plans" value="₹12.4 Cr" sub="↑ +8.4% this month" />
      </div>

      <div className="mt-6 space-y-6">
        {renderGroup(
          "Seeker Plans",
          "Credit-based contact unlock plans for home buyers and renters.",
          seekerG,
        )}
        {renderGroup(
          "Owner Rental Plans",
          "Listing plans for landlords looking to find tenants.",
          ownerRentG,
        )}
        {renderGroup(
          "Owner Sell Plans",
          "Listing plans for property sellers, brokers and developers.",
          ownerSellG,
        )}
      </div>

      <div className="mt-4 flex justify-end">
        <button
          onClick={() => toast.success("Plan changes submitted for super admin approval")}
          className="rounded-lg bg-accent px-5 py-2.5 text-sm font-bold text-white hover:opacity-90 transition"
        >
          Submit Changes for Approval →
        </button>
      </div>
    </>
  );
}
