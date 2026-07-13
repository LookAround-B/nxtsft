"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Check, X as XIcon } from "lucide-react";
import { StatCard, Section } from "@/components/portal/PortalShell";
import { trpc } from "@/lib/trpc";

// Shared, DB-backed plans manager. Used by both the super-admin and admin
// portals (adminProcedure permits both roles). Add / edit / price / activate /
// delete persist straight to the Plan table and the live pricing page.

type PlanType = "seeker" | "owner-rent" | "owner-sell" | "designer" | "decor" | "boost";

type EditablePlan = {
  id: string;
  name: string;
  price: number;
  priceLabel: string;
  credits: number;
  validity: number; // days
  tagline: string;
  features: string[];
  active: boolean;
  popular: boolean;
  type: PlanType;
};

function PlanCard({
  plan,
  onSave,
  onToggle,
  onDelete,
}: {
  plan: EditablePlan;
  onSave: (updated: EditablePlan) => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<EditablePlan>(plan);
  const [newFeature, setNewFeature] = useState("");

  const save = () => {
    onSave(draft);
    setEditing(false);
  };
  const cancel = () => {
    setDraft(plan);
    setEditing(false);
  };

  const addFeature = () => {
    if (!newFeature.trim()) return;
    setDraft((d) => ({ ...d, features: [...d.features, newFeature.trim()] }));
    setNewFeature("");
  };
  const removeFeature = (i: number) =>
    setDraft((d) => ({ ...d, features: d.features.filter((_, idx) => idx !== i) }));

  return (
    <div
      className={`rounded-2xl border-2 bg-white p-5 shadow-sm transition-all duration-200 ${plan.active ? "border-border" : "border-border/40 opacity-60"}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {editing ? (
            <input
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              className="w-full rounded-lg border border-input bg-background px-2 py-1 font-display text-sm font-bold text-navy focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          ) : (
            <div className="font-display text-sm font-bold text-navy">{plan.name}</div>
          )}
          {plan.popular && (
            <span className="mt-1 inline-block rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent">
              Popular
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
          {!editing && (
            <>
              <button
                onClick={() => setEditing(true)}
                className="grid h-7 w-7 place-items-center rounded-lg border border-border text-muted-foreground hover:border-accent hover:text-accent transition"
              >
                <Pencil size={12} />
              </button>
              <button
                onClick={onDelete}
                className="grid h-7 w-7 place-items-center rounded-lg border border-border text-muted-foreground hover:border-red-400 hover:text-red-500 transition"
              >
                <Trash2 size={12} />
              </button>
            </>
          )}
          {editing && (
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

      {/* Price + credits */}
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
              type="number"
              value={draft.validity}
              onChange={(e) => setDraft((d) => ({ ...d, validity: Number(e.target.value) }))}
              className="mt-1 w-full rounded-lg border border-input bg-background px-2 py-1.5 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          ) : (
            <div className="mt-1 text-sm font-semibold text-navy">{plan.validity} days</div>
          )}
        </div>
        {(editing || plan.credits > 0) && (
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Credits
            </label>
            {editing ? (
              <input
                type="number"
                value={draft.credits}
                onChange={(e) => setDraft((d) => ({ ...d, credits: Number(e.target.value) }))}
                className="mt-1 w-full rounded-lg border border-input bg-background px-2 py-1.5 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
              />
            ) : (
              <div className="mt-1 text-sm font-semibold text-navy">{plan.credits} unlocks</div>
            )}
          </div>
        )}
        <div>
          <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Tagline
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

      {/* Features */}
      <div className="mt-4">
        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Features
        </label>
        <ul className="mt-2 space-y-1.5">
          {(editing ? draft : plan).features.map((f, i) => (
            <li key={i} className="flex items-center gap-2 text-xs">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
              <span className="flex-1 text-navy">{f}</span>
              {editing && (
                <button
                  onClick={() => removeFeature(i)}
                  className="text-muted-foreground hover:text-red-500 transition-colors"
                >
                  <XIcon size={11} />
                </button>
              )}
            </li>
          ))}
        </ul>
        {editing && (
          <div className="mt-2 flex gap-2">
            <input
              value={newFeature}
              onChange={(e) => setNewFeature(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addFeature()}
              placeholder="Add feature…"
              className="flex-1 rounded-lg border border-input bg-background px-2 py-1.5 text-xs focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
            <button
              onClick={addFeature}
              className="grid h-7 w-7 place-items-center rounded-lg bg-accent text-white hover:opacity-90 transition"
            >
              <Plus size={12} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function usePlanGroup(type: PlanType) {
  const plansQ = trpc.subscriptions.plansAdmin.useQuery({ type });
  const refetch = () => plansQ.refetch();
  const onError = (e: { message: string }) => toast.error(e.message);

  const updatePlan = trpc.subscriptions.updatePlan.useMutation({ onSuccess: () => refetch(), onError });
  const deletePlan = trpc.subscriptions.deletePlan.useMutation({ onSuccess: () => refetch(), onError });
  const createPlan = trpc.subscriptions.createPlan.useMutation({ onSuccess: () => refetch(), onError });

  const plans = (plansQ.data ?? []) as unknown as EditablePlan[];

  const save = (id: string, u: EditablePlan) =>
    updatePlan.mutate(
      {
        id,
        name: u.name,
        price: u.price,
        priceLabel: u.priceLabel,
        credits: u.credits,
        validity: u.validity,
        tagline: u.tagline,
        features: u.features,
        popular: u.popular,
      },
      { onSuccess: () => toast.success(`"${u.name}" saved`) },
    );

  const toggle = (id: string) => {
    const plan = plans.find((p) => p.id === id);
    if (!plan) return;
    updatePlan.mutate({ id, active: !plan.active });
  };

  const remove = (id: string) =>
    deletePlan.mutate({ id }, { onSuccess: () => toast.success("Plan deactivated") });

  const add = (name: string) =>
    // Created as a draft (inactive) with a valid placeholder price — the server
    // rejects price 0, and a new plan shouldn't go live until it's configured.
    createPlan.mutate(
      {
        name,
        price: 999,
        priceLabel: "₹999",
        credits: 0,
        validity: 30,
        tagline: "New plan",
        features: ["Feature 1"],
        popular: false,
        type,
      },
      {
        onSuccess: () =>
          toast.success(`"${name}" created as a draft — edit its price & details, then activate it.`),
      },
    );

  return { plans, isLoading: plansQ.isLoading, save, toggle, remove, add };
}

function PlanGroup({
  title,
  description,
  group,
  allowAdd = true,
}: {
  title: string;
  description: string;
  group: ReturnType<typeof usePlanGroup>;
  /** Boost tiers are fixed in code (BOOST_TIERS), so that group edits but never adds. */
  allowAdd?: boolean;
}) {
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);

  const handleAdd = () => {
    if (!newName.trim()) return;
    group.add(newName.trim());
    setNewName("");
    setAdding(false);
  };

  return (
    <Section
      title={title}
      action={
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {group.plans.filter((p) => p.active).length}/{group.plans.length} active
          </span>
          {allowAdd && (
            <button
              onClick={() => setAdding((v) => !v)}
              className="flex items-center gap-1.5 rounded-lg bg-gold px-3 py-1.5 text-xs font-bold text-navy-deep hover:opacity-90 transition"
            >
              <Plus size={12} /> Add Plan
            </button>
          )}
        </div>
      }
    >
      <p className="mb-4 text-sm text-muted-foreground">{description}</p>

      {adding && (
        <div className="mb-4 flex gap-2 rounded-xl border border-dashed border-accent/40 bg-accent/5 p-3">
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="New plan name…"
            className="flex-1 rounded-lg border border-input bg-white px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
          />
          <button
            onClick={handleAdd}
            className="rounded-lg bg-accent px-4 py-2 text-xs font-bold text-white hover:opacity-90 transition"
          >
            Create
          </button>
          <button
            onClick={() => setAdding(false)}
            className="rounded-lg border border-border px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-secondary transition"
          >
            Cancel
          </button>
        </div>
      )}

      {group.isLoading ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Loading plans…</p>
      ) : group.plans.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">No plans in this group yet.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {group.plans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              onSave={(updated) => group.save(plan.id, updated)}
              onToggle={() => group.toggle(plan.id)}
              onDelete={() => group.remove(plan.id)}
            />
          ))}
        </div>
      )}
    </Section>
  );
}

export function PlansManager({
  title = "Plans Manager",
  subtitle = "Create, edit, price and activate plans across all customer segments.",
}: {
  title?: string;
  subtitle?: string;
}) {
  const seekerGroup = usePlanGroup("seeker");
  const ownerRentalGroup = usePlanGroup("owner-rent");
  const ownerSellGroup = usePlanGroup("owner-sell");
  const designerGroup = usePlanGroup("designer");
  const decorGroup = usePlanGroup("decor");
  const boostGroup = usePlanGroup("boost");

  const allPlans = [...seekerGroup.plans, ...ownerRentalGroup.plans, ...ownerSellGroup.plans, ...designerGroup.plans, ...decorGroup.plans, ...boostGroup.plans];
  const activePlans = allPlans.filter((p) => p.active).length;

  return (
    <>
      <div className="mb-6">
        <h2 className="font-display text-2xl font-bold text-navy">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Total Plans" value={String(allPlans.length)} sub={`${activePlans} active`} />
        <StatCard label="Plan Groups" value="5" sub="Seeker · Owner Rent · Owner Sell · Designer · Decor" />
        <StatCard label="Active Plans" value={String(activePlans)} sub="live on pricing page" />
      </div>

      <div className="mt-6 space-y-6">
        <PlanGroup
          title="Seeker Plans (Home Buyers / Renters)"
          description="Credit-based contact unlock plans shown on the Pricing page and property detail pages."
          group={seekerGroup}
        />
        <PlanGroup
          title="Owner Rental Plans"
          description="Listing plans for landlords looking to find tenants."
          group={ownerRentalGroup}
        />
        <PlanGroup
          title="Owner Sell Plans"
          description="Listing plans for property sellers, agents and developers."
          group={ownerSellGroup}
        />
        <PlanGroup
          title="Designer Business Listing Plans"
          description="Monthly listing plans for Home Interiors designer businesses."
          group={designerGroup}
        />
        <PlanGroup
          title="Decor Business Listing Plans"
          description="Monthly listing plans for Decor Store businesses."
          group={decorGroup}
        />
        <PlanGroup
          title="Listing Boost Plans"
          description="Paid boosts that push a seller's listing up the search results. The three tiers are fixed — edit price, validity and copy here."
          group={boostGroup}
          allowAdd={false}
        />
      </div>
    </>
  );
}
