"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Trash2, TicketPercent } from "lucide-react";
import { Section } from "@/components/portal/PortalShell";
import { trpc } from "@/lib/trpc";
import { ListSkeleton } from "@/components/ui/skeleton";
import { PageHead } from "./PageHead";

const inputCls =
  "w-full rounded-xl border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent";

/** Default valid-until: one month out, as a YYYY-MM-DD for the date input. */
function defaultValidUntil() {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return d.toISOString().slice(0, 10);
}

export function AdminCouponsTab() {
  const utils = trpc.useUtils();
  const listQ = trpc.coupons.list.useQuery();

  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [discountRupees, setDiscountRupees] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [validUntil, setValidUntil] = useState(defaultValidUntil());

  const resetForm = () => {
    setCode("");
    setDescription("");
    setDiscountRupees("");
    setMaxUses("");
    setValidUntil(defaultValidUntil());
  };

  const create = trpc.coupons.create.useMutation({
    onSuccess: () => {
      toast.success("Coupon created");
      resetForm();
      utils.coupons.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const setActive = trpc.coupons.setActive.useMutation({
    onSuccess: ({ active }) => {
      toast.success(active ? "Coupon activated" : "Coupon deactivated");
      utils.coupons.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const remove = trpc.coupons.remove.useMutation({
    onSuccess: (r) => {
      toast.success(r.deleted ? "Coupon deleted" : "Coupon had redemptions — deactivated instead");
      utils.coupons.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const submit = () => {
    const discount = Number(discountRupees);
    const uses = Number(maxUses);
    if (!code.trim()) return toast.error("Enter a coupon code");
    if (!Number.isFinite(discount) || discount <= 0) return toast.error("Enter a valid discount amount");
    if (!Number.isFinite(uses) || uses <= 0) return toast.error("Enter a valid max-uses count");
    if (!validUntil) return toast.error("Pick a valid-until date");
    // End of the chosen day, local time → ISO for the datetime API.
    const validUntilIso = new Date(`${validUntil}T23:59:59`).toISOString();
    create.mutate({
      code: code.trim(),
      description: description.trim() || undefined,
      discountRupees: discount,
      maxUses: uses,
      validUntil: validUntilIso,
    });
  };

  const coupons = listQ.data ?? [];

  return (
    <>
      <PageHead
        title="Discount Coupons"
        subtitle="Create coupon codes for sales reps to apply when sending payment links. Each has a flat ₹ discount, a total-use cap and an expiry."
      />

      <Section title="Create a coupon">
        <div className="grid gap-3 rounded-2xl border border-border bg-white p-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Code</label>
            <input
              className={inputCls}
              placeholder="DIWALI2000"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              maxLength={24}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Discount (₹ off)</label>
            <input
              className={inputCls}
              type="number"
              min={1}
              placeholder="2000"
              value={discountRupees}
              onChange={(e) => setDiscountRupees(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Max uses (total)</label>
            <input
              className={inputCls}
              type="number"
              min={1}
              placeholder="10"
              value={maxUses}
              onChange={(e) => setMaxUses(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Valid until</label>
            <input className={inputCls} type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Label (optional)</label>
            <input
              className={inputCls}
              placeholder="Diwali festive offer"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={120}
            />
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={submit}
              disabled={create.isPending}
              className="w-full rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {create.isPending ? "Creating…" : "Create coupon"}
            </button>
          </div>
        </div>
      </Section>

      <Section title="Coupons">
        {listQ.isLoading && <ListSkeleton rows={4} />}

        {!listQ.isLoading && coupons.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No coupons yet. Create one above.
          </div>
        )}

        {!listQ.isLoading && coupons.length > 0 && (
          <div className="grid gap-3">
            {coupons.map((c) => {
              const dead = !c.active || c.expired || c.exhausted;
              const statusLabel = !c.active ? "Inactive" : c.expired ? "Expired" : c.exhausted ? "Used up" : "Active";
              return (
                <div
                  key={c.id}
                  className={`flex flex-wrap items-center gap-3 rounded-2xl border p-4 transition ${
                    dead ? "border-dashed border-border bg-secondary/40 opacity-70" : "border-border bg-white"
                  }`}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
                    <TicketPercent size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold text-navy">{c.code}</span>
                      <span className="rounded-full bg-accent/10 px-2 py-0.5 text-xs font-semibold text-accent">
                        ₹{c.discountRupees.toLocaleString("en-IN")} off
                      </span>
                      <span className="text-xs text-muted-foreground">{statusLabel}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {c.description ? `${c.description} · ` : ""}
                      {c.usedCount}/{c.maxUses} used · {c.remaining} left · expires{" "}
                      {new Date(c.validUntil).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={c.active}
                    disabled={setActive.isPending}
                    onClick={() => setActive.mutate({ id: c.id, active: !c.active })}
                    title={c.active ? "Deactivate" : "Activate"}
                    className={`relative h-6 w-11 shrink-0 rounded-full transition disabled:opacity-50 ${
                      c.active ? "bg-emerald-500" : "bg-muted-foreground/30"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                        c.active ? "left-[22px]" : "left-0.5"
                      }`}
                    />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Delete coupon ${c.code}? (kept & deactivated if it has redemptions)`)) {
                        remove.mutate({ id: c.id });
                      }
                    }}
                    disabled={remove.isPending}
                    title="Delete"
                    className="rounded-lg p-2 text-muted-foreground transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </Section>
    </>
  );
}
