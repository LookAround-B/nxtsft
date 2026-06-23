"use client";
import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, UserCheck, Search, MapPin, Phone, Mail, Clock } from "lucide-react";
import { Section, Badge } from "@/components/portal/PortalShell";
import { trpc } from "@/lib/trpc";
import { PageHead } from "./PageHead";

function timeAgo(iso: string | Date): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function SellerApprovalsTab() {
  const [search, setSearch] = useState("");
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const sellersQ = trpc.admin.users.list.useQuery(
    { role: "home-seller", search: search.trim() || undefined, limit: 100, cursor: undefined },
    { staleTime: 0 },
  );

  const approveMutation = trpc.admin.users.verify.useMutation({
    onSuccess: (user) => {
      toast.success(`${user.name} has been approved and notified.`);
      setApprovingId(null);
      sellersQ.refetch();
    },
    onError: (err: { message: string }) => {
      toast.error(err.message);
      setApprovingId(null);
    },
  });

  const pending = (sellersQ.data?.items ?? []).filter((u) => !u.verified);
  const approved = (sellersQ.data?.items ?? []).filter((u) => u.verified);

  return (
    <>
      <PageHead
        title="Seller Approvals"
        subtitle="Review and approve Home Seller accounts before they can list properties."
      />

      <div className="relative mb-6 max-w-md">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email or phone…"
          className="w-full rounded-xl border border-input bg-background py-2.5 pl-9 pr-4 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
        />
      </div>

      <Section title={`Pending Approval${pending.length > 0 ? ` (${pending.length})` : ""}`}>
        {sellersQ.isLoading && (
          <p className="text-sm text-muted-foreground">Loading…</p>
        )}

        {!sellersQ.isLoading && pending.length === 0 && (
          <div className="rounded-xl border border-dashed border-border py-12 text-center">
            <CheckCircle2 size={28} className="mx-auto mb-3 text-emerald-400" />
            <p className="text-sm font-semibold text-navy">All caught up!</p>
            <p className="mt-1 text-xs text-muted-foreground">No pending seller registrations.</p>
          </div>
        )}

        {pending.length > 0 && (
          <div className="divide-y divide-border rounded-xl border border-border">
            {pending.map((u) => (
              <div key={u.id} className="px-4 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-navy">{u.name}</span>
                      <Badge tone="warm">Pending</Badge>
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Mail size={11} /> {u.email}
                      </span>
                      {u.phone && (
                        <span className="flex items-center gap-1">
                          <Phone size={11} /> {u.phone}
                        </span>
                      )}
                      {u.city && (
                        <span className="flex items-center gap-1">
                          <MapPin size={11} /> {u.city}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock size={11} /> Registered {timeAgo(u.joined)}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setApprovingId(u.id);
                      approveMutation.mutate({ userId: u.id });
                    }}
                    disabled={approveMutation.isPending && approvingId === u.id}
                    className="flex shrink-0 items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                  >
                    <UserCheck size={14} />
                    {approveMutation.isPending && approvingId === u.id ? "Approving…" : "Approve"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {approved.length > 0 && (
        <Section title={`Recently Approved (${approved.length})`}>
          <div className="divide-y divide-border rounded-xl border border-border">
            {approved.map((u) => (
              <div key={u.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-navy">{u.name}</span>
                    <Badge tone="success">Approved</Badge>
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{u.email}</div>
                </div>
                <span className="text-xs text-muted-foreground">{timeAgo(u.joined)}</span>
              </div>
            ))}
          </div>
        </Section>
      )}
    </>
  );
}
