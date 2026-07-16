"use client";
import { useState } from "react";
import { toast } from "sonner";
import { keepPreviousData } from "@tanstack/react-query";
import { Coins, Search, Building2, ArrowDownCircle } from "lucide-react";
import { Section, Badge } from "@/components/portal/PortalShell";
import { Pagination } from "@/components/ui/pagination";
import { trpc } from "@/lib/trpc";
import { ListSkeleton } from "@/components/ui/skeleton";
import { PageHead } from "./PageHead";

const REASON_OPTIONS = [
  { label: "Promotional bonus", value: "promotional_bonus" },
  { label: "Referral reward", value: "referral_reward" },
  { label: "Support correction", value: "support_correction" },
  { label: "Welcome gift", value: "welcome_gift" },
  { label: "Other", value: "other" },
];

type GrantingFor = { id: string; name: string; currentCredits: number } | null;

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function UsageSection() {
  const [usageSearch, setUsageSearch] = useState("");
  const [page, setPage] = useState(1);

  const usageQ = trpc.admin.creditUsage.useQuery(
    {
      search: usageSearch.trim() || undefined,
      page,
      limit: 20,
    },
    { placeholderData: keepPreviousData },
  );

  const items = usageQ.data?.items ?? [];
  const totalPages = usageQ.data?.totalPages ?? 1;

  return (
    <Section title="Credit Usage History">
      <p className="mb-3 text-xs text-muted-foreground">
        Every time a Home Buyer spends 1 credit to unlock a property's contact details.
      </p>

      <div className="relative mb-4 max-w-md">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={usageSearch}
          onChange={(e) => { setUsageSearch(e.target.value); setPage(1); }}
          placeholder="Filter by buyer name or email…"
          className="w-full rounded-xl border border-input bg-background py-2.5 pl-9 pr-4 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
        />
      </div>

      {usageQ.isLoading && <ListSkeleton rows={5} />}

      {!usageQ.isLoading && items.length === 0 && (
        <div className="rounded-xl border border-dashed border-border py-10 text-center">
          <Coins size={24} className="mx-auto mb-2 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No credit usage records found.</p>
        </div>
      )}

      {items.length > 0 && (
        <div className="divide-y divide-border rounded-xl border border-border">
          {items.map((item) => (
            <div key={item.id} className="flex items-start gap-3 px-4 py-3">
              <div className="mt-0.5 shrink-0">
                <ArrowDownCircle size={16} className="text-red-400" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span className="text-sm font-semibold text-navy">
                    {item.buyer?.name ?? "Unknown buyer"}
                  </span>
                  <Badge tone="new">Buyer</Badge>
                  <span className="text-xs text-muted-foreground">
                    {item.buyer?.email}
                  </span>
                  {item.buyer?.phone && (
                    <span className="text-xs text-muted-foreground">
                      {item.buyer.phone}
                    </span>
                  )}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Coins size={11} className="text-amber-500" />
                    <span className="font-semibold text-navy">−1 credit</span>
                  </span>
                  <span>·</span>
                  <span>viewed contact details of</span>
                  {item.property ? (
                    <a
                      href={`/properties/${item.property.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 font-semibold text-accent hover:underline"
                    >
                      <Building2 size={11} />
                      {item.property.title}
                    </a>
                  ) : (
                    <span className="italic">deleted property</span>
                  )}
                </div>
                <div className="mt-0.5 text-[11px] text-muted-foreground/70">
                  {timeAgo(item.createdAt)}
                  {item.buyer && (
                    <span className="ml-2">
                      · Current balance:{" "}
                      <span className="font-semibold text-navy">{item.buyer.credits} credits</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </Section>
  );
}

export function CreditsTab() {
  const [search, setSearch] = useState("");
  const [grantingFor, setGrantingFor] = useState<GrantingFor>(null);
  const [amount, setAmount] = useState("1");
  const [reason, setReason] = useState(REASON_OPTIONS[0]!.value);

  const usersQ = trpc.admin.users.list.useQuery(
    { search: search.trim() || undefined, limit: 20, cursor: undefined },
    { enabled: search.trim().length > 1 },
  );

  const grantMutation = trpc.admin.users.grantCredits.useMutation({
    onSuccess: (updated) => {
      toast.success(`${updated.name} now has ${updated.credits} credits`);
      setGrantingFor(null);
      setAmount("1");
      setReason(REASON_OPTIONS[0]!.value);
      usersQ.refetch();
    },
    onError: (err: { message: string }) => toast.error(err.message),
  });

  const users = (usersQ.data?.items ?? []).filter(
    (u) => u.role === "user" || u.role === "home-seller",
  );

  const handleGrant = () => {
    if (!grantingFor) return;
    const n = parseInt(amount, 10);
    if (!n || n < 1 || n > 1000) {
      toast.error("Amount must be between 1 and 1000");
      return;
    }
    grantMutation.mutate({ userId: grantingFor.id, amount: n, reason });
  };

  return (
    <>
      <PageHead
        title="Buyer Wallets & Credits"
        subtitle="Grant credits to buyers and track how each credit is spent."
      />

      <Section title="Grant Credits">
        <div className="relative max-w-md">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setGrantingFor(null); }}
            placeholder="Search by name, email or phone…"
            className="w-full rounded-xl border border-input bg-background py-2.5 pl-9 pr-4 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
          />
        </div>

        {search.trim().length > 1 && (
          <div className="mt-4">
            {usersQ.isLoading && (
              <p className="text-sm text-muted-foreground">Searching…</p>
            )}
            {!usersQ.isLoading && users.length === 0 && (
              <p className="text-sm text-muted-foreground">No Home Buyers or Home Sellers found.</p>
            )}
            {users.length > 0 && (
              <div className="divide-y divide-border rounded-xl border border-border">
                {users.map((u) => (
                  <div key={u.id}>
                    <div className="flex items-center justify-between gap-4 px-4 py-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-semibold text-navy">{u.name}</span>
                          <Badge tone={u.role === "home-seller" ? "warm" : "new"}>
                            {u.role === "home-seller" ? "Seller" : "Buyer"}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">{u.email}</div>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <span className="flex items-center gap-1 text-sm font-bold text-navy">
                          <Coins size={14} className="text-amber-500" />
                          {u.credits}
                        </span>
                        <button
                          onClick={() =>
                            setGrantingFor(
                              grantingFor?.id === u.id
                                ? null
                                : { id: u.id, name: u.name, currentCredits: u.credits },
                            )
                          }
                          className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                            grantingFor?.id === u.id
                              ? "border-accent bg-accent text-white"
                              : "border-border bg-white text-navy hover:border-accent hover:text-accent"
                          }`}
                        >
                          {grantingFor?.id === u.id ? "Cancel" : "Add Credits"}
                        </button>
                      </div>
                    </div>

                    {grantingFor?.id === u.id && (
                      <div className="border-t border-border bg-secondary/30 px-4 py-4">
                        <p className="mb-3 text-xs font-semibold text-navy">
                          Grant credits to {u.name} · current balance: {u.credits}
                        </p>
                        <div className="flex flex-wrap items-end gap-3">
                          <div>
                            <label className="block text-xs font-semibold text-muted-foreground">
                              Amount (1–1000)
                            </label>
                            <input
                              type="number"
                              min={1}
                              max={1000}
                              value={amount}
                              onChange={(e) => setAmount(e.target.value)}
                              className="mt-1 w-28 rounded-lg border border-input bg-white px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-muted-foreground">
                              Reason
                            </label>
                            <select
                              value={reason}
                              onChange={(e) => setReason(e.target.value)}
                              className="mt-1 rounded-lg border border-input bg-white px-3 py-2 text-sm focus:border-accent focus:outline-none"
                            >
                              {REASON_OPTIONS.map((o) => (
                                <option key={o.value} value={o.value}>
                                  {o.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          <button
                            onClick={handleGrant}
                            disabled={grantMutation.isPending}
                            className="rounded-lg bg-accent px-4 py-2 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-60"
                          >
                            {grantMutation.isPending ? "Granting…" : "Grant Credits"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Section>

      <UsageSection />
    </>
  );
}
