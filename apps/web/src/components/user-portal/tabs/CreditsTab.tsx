"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import { StatCard, Section, Badge } from "@/components/portal/PortalShell";
import { useAuth } from "@/lib/auth";
import { trpc } from "@/lib/trpc";
import { openRazorpayCheckout } from "@/lib/razorpay";
import { walletLedger, disputes } from "@/data/static";
import { Head } from "./shared";

const myLedger = walletLedger;
const myDisputes = disputes;

const unlockKindLabel: Record<"property" | "designer" | "decor", string> = {
  property: "Property",
  designer: "Interiors",
  decor: "Decor",
};

// Static credit usage timeline (last 5 unlock events)
const creditTimeline = [
  { date: "2026-05-18", action: "Unlocked Marina Heights contact", tokens: -1 },
  { date: "2026-05-16", action: "Unlocked Skyline Residences contact", tokens: -1 },
  { date: "2026-05-19", action: "Refund: Dispute resolved (Marina)", tokens: +1 },
  { date: "2026-05-15", action: "Basic plan purchased", tokens: +6 },
  { date: "2026-05-10", action: "Trial credits granted (signup bonus)", tokens: +1 },
];


export function CreditsTab() {
  const { session, credits, refreshCredits } = useAuth();
  const router = useRouter();
  const isSeller = session?.role === "home-seller";
  const [showTopUp, setShowTopUp] = useState(false);
  const [buyingPlanId, setBuyingPlanId] = useState<string | null>(null);

  // Sellers buy owner-rent/owner-sell subscription plans, not per-contact
  // buyer credits — send them to /pricing (which has both plan types) rather
  // than this buyer-only credit top-up modal. LA-324.
  const viewPlans = () => (isSeller ? router.push("/pricing") : setShowTopUp(true));

  const creditsQ = trpc.users.credits.useQuery();
  const plansQ = trpc.subscriptions.plans.useQuery({ type: "seeker" }, { enabled: !isSeller });
  const planQ = trpc.subscriptions.myCurrent.useQuery();
  const gatewayQ = trpc.subscriptions.activeGateway.useQuery();
  const createOrder = trpc.subscriptions.createOrder.useMutation();
  const createPayUOrder = trpc.subscriptions.createPayUOrder.useMutation();
  const verifyPayment = trpc.subscriptions.verifyPayment.useMutation();
  const cancelPlan = trpc.subscriptions.cancel.useMutation({
    onSuccess: () => { planQ.refetch(); toast.success("Subscription cancelled"); },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  type CurrentPlan = { id: string; planName: string; amount: number; status: string; startDate: string; endDate: string; renewalDate: string | null };
  const plan = planQ.data as CurrentPlan | null | undefined;
  const planFmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  const daysLeft = plan ? Math.max(0, Math.ceil((new Date(plan.endDate).getTime() - Date.now()) / 86_400_000)) : 0;

  type TxItem = { id: string; type: string; amount: number; reason: string | null; createdAt: string };
  const balance = creditsQ.data?.balance ?? credits;
  const transactions = (creditsQ.data?.transactions ?? []) as unknown as TxItem[];
  const unlockedQ = trpc.users.unlockedContacts.useQuery();

  const handleTopUp = async (plan: { id: string; name: string; credits: number }) => {
    const gateway = gatewayQ.data?.gateway ?? "razorpay";
    setBuyingPlanId(plan.id);
    try {
      if (gateway === "razorpay") {
        const order = await createOrder.mutateAsync({ planId: plan.id });
        await openRazorpayCheckout({
          keyId: order.keyId,
          orderId: order.orderId,
          amount: order.amount,
          currency: order.currency,
          prefill: order.prefill,
          onDismiss: () => setBuyingPlanId(null),
          onSuccess: async (resp) => {
            try {
              await verifyPayment.mutateAsync({
                razorpayOrderId: resp.razorpay_order_id,
                razorpayPaymentId: resp.razorpay_payment_id,
                razorpaySignature: resp.razorpay_signature,
                planId: plan.id,
              });
              refreshCredits?.();
              router.push(
                `/payment/success?credits=${plan.credits}&plan=${encodeURIComponent(plan.name)}`,
              );
            } catch (verifyErr) {
              toast.error(verifyErr instanceof Error ? verifyErr.message : "Payment verification failed.");
            } finally {
              setBuyingPlanId(null);
            }
          },
        });
      } else {
        // PayU — redirect flow
        const fields = await createPayUOrder.mutateAsync({ planId: plan.id });
        const form = document.createElement("form");
        form.method = "POST";
        form.action = fields.action;
        (Object.entries(fields) as [string, string][]).forEach(([k, v]) => {
          if (k === "action") return;
          const inp = document.createElement("input");
          inp.type = "hidden";
          inp.name = k;
          inp.value = v;
          form.appendChild(inp);
        });
        document.body.appendChild(form);
        form.submit();
      }
    } catch (err) {
      setBuyingPlanId(null);
      toast.error(err instanceof Error ? err.message : "Purchase failed.");
    }
  };

  return (
    <>
      <Head t="My Credits" s="Subscription status and unlock history." />

      {/* Stat cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          label="Credit Balance"
          value={creditsQ.isLoading ? "…" : String(balance)}
          sub={balance === 0 ? "Top up to unlock contacts" : "ready to use"}
          accent={balance === 0 ? "text-accent" : "text-emerald-600"}
        />
        <StatCard
          label="Total Purchased"
          value={String(transactions.filter((t) => t.type === "credit").reduce((s, t) => s + t.amount, 0))}
          sub={`across ${transactions.filter((t) => t.type === "credit").length} purchase${transactions.filter((t) => t.type === "credit").length !== 1 ? "s" : ""}`}
        />
        <StatCard
          label="Credits Used"
          value={String(transactions.filter((t) => t.type === "debit").reduce((s, t) => s + t.amount, 0))}
          sub={`${unlockedQ.data?.length ?? 0} contacts unlocked`}
        />
        <StatCard
          label="Disputes Filed"
          value={String(myDisputes.length)}
          sub={`${myDisputes.filter((d) => d.status === "Resolved").length} resolved`}
        />
      </div>

      {/* Active plan (PRD §5.4) */}
      <Section title="Active Plan">
        {planQ.isLoading ? (
          <p className="py-4 text-sm text-muted-foreground">Loading plan…</p>
        ) : plan ? (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display text-lg font-bold text-navy">{plan.planName}</span>
                <Badge tone="success">{plan.status}</Badge>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                ₹{plan.amount.toLocaleString("en-IN")} · started {planFmtDate(plan.startDate)} · valid till {planFmtDate(plan.endDate)}
                <span className="ml-1 font-semibold text-accent">({daysLeft} day{daysLeft !== 1 ? "s" : ""} left)</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowTopUp(true)}
                className="rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground"
              >
                Renew / Upgrade
              </button>
              <button
                onClick={() => cancelPlan.mutate({ subscriptionId: plan.id })}
                disabled={cancelPlan.isPending}
                className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {isSeller
                ? "No active plan. Choose a seller plan to publish listings."
                : "No active plan. Buy credits to unlock owner contacts."}
            </p>
            <button
              onClick={viewPlans}
              className="rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground"
            >
              View plans
            </button>
          </div>
        )}
      </Section>

      {/* Plan usage */}
      <Section title="Credit Balance">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="font-semibold text-navy">Available Credits</span>
          <span className="font-mono text-xs text-muted-foreground">{balance} remaining</span>
        </div>
        <div className="h-3 w-full rounded-full bg-secondary">
          <div
            className="h-3 rounded-full bg-accent transition-all"
            style={{
              width: balance === 0 ? "2px" : "100%",
            }}
          />
        </div>
        <div className="mt-4 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {transactions.length > 0
              ? `Last updated ${new Date(transactions[0].createdAt).toLocaleDateString("en-IN")}`
              : "No transactions yet"}
          </span>
          <button
            onClick={viewPlans}
            className="flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground"
          >
            <Plus size={12} /> {isSeller ? "View Seller Plans" : "Top Up Credits"}
          </button>
        </div>
      </Section>

      {/* Top Up Modal */}
      {showTopUp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-lg font-bold text-navy">Top Up Credits</h3>
              <button
                onClick={() => setShowTopUp(false)}
                className="rounded-md p-1 hover:bg-secondary"
              >
                <X size={16} />
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {plansQ.isLoading
                ? Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-24 animate-pulse rounded-xl border border-border bg-secondary" />
                  ))
                : (plansQ.data ?? []).map((plan) => (
                  <button
                    key={plan.id}
                    onClick={() => handleTopUp(plan)}
                    disabled={buyingPlanId !== null}
                    className={`rounded-xl border-2 p-4 text-left transition-colors hover:border-accent disabled:opacity-60 ${buyingPlanId === plan.id ? "border-accent" : "border-border"}`}
                  >
                    <div className="font-display text-lg font-bold text-navy">{plan.priceLabel}</div>
                    <div className="mt-0.5 text-xs font-semibold text-accent">
                      {plan.credits} credit{plan.credits !== 1 ? "s" : ""}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">{plan.name}</div>
                    <div className="mt-0.5 text-[10px] text-muted-foreground">
                      Valid {plan.validity} days
                    </div>
                    {buyingPlanId === plan.id && (
                      <div className="mt-2 text-[10px] font-semibold text-accent">Processing…</div>
                    )}
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Credit Usage Timeline */}
      <Section title="Credit Transaction History">
        <div className="relative pl-5">
          {/* Vertical line */}
          <div className="absolute left-1.5 top-0 h-full w-px bg-border" />
          <div className="space-y-5">
            {transactions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No transactions yet.</p>
            ) : (
            transactions.slice(0, 10).map((entry, i) => (
              <div key={i} className="relative flex items-start gap-3">
                <div
                  className={`absolute -left-[15px] mt-0.5 h-3 w-3 rounded-full border-2 border-white ${entry.type === "credit" ? "bg-emerald-500" : "bg-accent"}`}
                />
                <div>
                  <div className="text-sm font-medium text-navy capitalize">{entry.reason ?? entry.type}</div>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-mono">
                      {new Date(entry.createdAt).toLocaleDateString("en-IN")}
                    </span>
                    <span
                      className={`font-bold ${entry.type === "credit" ? "text-emerald-600" : "text-accent"}`}
                    >
                      {entry.type === "credit" ? "+" : "-"}{entry.amount} credit{entry.amount !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
              </div>
            ))
            )}
          </div>
        </div>
      </Section>

      {/* Token Ledger */}
      <Section title="Token Ledger">
        {myLedger.length === 0 ? (
          <p className="text-sm text-muted-foreground">No ledger entries yet.</p>
        ) : (
          <div className="divide-y divide-border">
            {myLedger.map((entry) => {
              const isCredit = entry.type === "credit";
              const isRefund = entry.type === "refund";
              const badgeClass = isCredit
                ? "bg-emerald-100 text-emerald-700"
                : isRefund
                  ? "bg-blue-100 text-blue-700"
                  : "bg-accent/10 text-accent";
              const badgeLabel = isCredit ? "Credit" : isRefund ? "Refund" : "Debit";
              return (
                <div key={entry.id} className="flex items-center justify-between py-3 gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-navy truncate">
                      {entry.description}
                    </div>
                    <div className="font-mono text-[10px] text-muted-foreground mt-0.5">
                      {entry.date}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${badgeClass}`}
                    >
                      {badgeLabel}
                    </span>
                    <span
                      className={`font-mono text-sm font-bold ${isCredit || isRefund ? "text-emerald-600" : "text-accent"}`}
                    >
                      {isCredit || isRefund ? `+${entry.amount}` : `-${entry.amount}`} token
                      {entry.amount !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      {/* Unlocked Contacts — real backend data (property / designer / decor) */}
      <div id="unlocked-contacts" className="scroll-mt-24">
        <Section title="Unlocked Contacts">
          {unlockedQ.isLoading ? (
            <p className="py-2 text-sm text-muted-foreground">Loading unlocked contacts…</p>
          ) : (unlockedQ.data?.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">
              No contacts unlocked yet. Browse properties and unlock a contact to get started.
            </p>
          ) : (
            <div className="space-y-3">
              {unlockedQ.data!.map((u) => (
                <div key={u.id} className="rounded-xl border border-border p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <Link
                        href={u.href}
                        className="font-semibold text-navy truncate hover:text-accent hover:underline"
                      >
                        {u.name}
                      </Link>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {u.contactName !== u.name && <>{u.contactName} · </>}
                        {u.phone ? (
                          <a href={`tel:${u.phone}`} className="font-medium text-accent hover:underline">
                            {u.phone}
                          </a>
                        ) : (
                          <span className="italic">no number on file</span>
                        )}
                      </div>
                      <div className="mt-1 font-mono text-[10px] text-muted-foreground">
                        Unlocked {planFmtDate(u.unlockedAt as unknown as string)}
                      </div>
                    </div>
                    <Badge tone="cold">{unlockKindLabel[u.kind]}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>
    </>
  );
}
