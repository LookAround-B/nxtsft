"use client";
import { useState } from "react";
import { keepPreviousData } from "@tanstack/react-query";
import { toast } from "sonner";
import { StatCard, Section, Badge } from "@/components/portal/PortalShell";
import { trpc } from "@/lib/trpc";
import { downloadCSV } from "@/lib/download-csv";
import { Pagination } from "@/components/ui/pagination";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { TabHeader } from "./shared";

type TeamMember = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  city: string;
  verified: boolean;
  joined: string;
};

const STAFF_ROLES = ["admin", "supervisor", "sales", "support-admin"] as const;
type StaffRole = (typeof STAFF_ROLES)[number];

const ROLE_LABEL: Record<string, string> = {
  "super-admin": "Super Admin",
  admin: "Admin",
  supervisor: "Supervisor",
  sales: "Sales Rep",
  "support-admin": "Support Admin",
};

const ROLE_PORTAL: Record<string, string> = {
  "super-admin": "Command",
  admin: "Admin Portal",
  supervisor: "Supervisor",
  sales: "Sales Portal",
  "support-admin": "Support",
};

const fmtJoined = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

const PAGE_SIZE = 20;

const emptyForm = { name: "", email: "", phone: "", password: "", role: "sales" as StaffRole, city: "" };

export function TeamsTab() {
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const [page, setPage] = useState(1);
  const membersQ = trpc.admin.teamMembers.useQuery(
    { search: search || undefined, page, limit: PAGE_SIZE },
    { placeholderData: keepPreviousData },
  );
  const members = (membersQ.data?.items ?? []) as unknown as TeamMember[];

  const utils = trpc.useUtils();

  // The roster is paged now, so the export walks every page rather than dumping
  // the 20 rows on screen. limitSchema caps a page at 100.
  async function exportCsv() {
    const rows: TeamMember[] = [];
    for (let p = 1; ; p++) {
      const res = await utils.admin.teamMembers.fetch({ search: search || undefined, page: p, limit: 100 });
      rows.push(...(res.items as unknown as TeamMember[]));
      if (p >= res.totalPages) break;
    }
    downloadCSV(
      "team-directory.csv",
      ["ID", "Name", "Email", "Phone", "Role", "Portal", "City", "Joined", "Status"],
      rows.map((m) => [
        m.id,
        m.name,
        m.email,
        m.phone ?? "",
        ROLE_LABEL[m.role] ?? m.role,
        ROLE_PORTAL[m.role] ?? "—",
        m.city,
        fmtJoined(m.joined),
        m.verified ? "Active" : "Pending",
      ]),
    );
  }

  const createMember = trpc.admin.createTeamMember.useMutation({
    onSuccess: () => {
      membersQ.refetch();
      setShowAdd(false);
      setForm(emptyForm);
      toast.success("Member added and account created!");
    },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  const { total, active, pending, admins } = membersQ.data?.counts ?? {
    total: 0, active: 0, pending: 0, admins: 0,
  };

  return (
    <>
      <TabHeader
        title="All Teams"
        subtitle="Comprehensive staff directory across all portals."
        action={
          <button
            onClick={() => setShowAdd(true)}
            className="rounded-md bg-gold px-3 py-2 text-xs font-bold text-navy-deep hover:opacity-90 transition"
          >
            + Add Member
          </button>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Total Staff" value={String(total)} sub="across all portals" />
        <StatCard label="Active" value={String(active)} sub="verified accounts" />
        <StatCard label="Pending" value={String(pending)} sub="awaiting verification" accent={pending > 0 ? "text-amber-600" : undefined} />
        <StatCard label="Admins" value={String(admins)} />
      </div>

      <Section
        title="Staff Directory"
        action={
          <div className="flex items-center gap-3">
            <input
              placeholder="Search name, email or phone…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="rounded-lg border border-input bg-background px-3 py-1.5 text-xs focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
            <button
              onClick={() => void exportCsv()}
              className="text-xs font-semibold text-accent hover:underline"
            >
              Export CSV →
            </button>
          </div>
        }
      >
        {membersQ.isLoading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Loading staff…</p>
        ) : members.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No staff match this search.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="portal-table">
              <thead>
                <tr>
                  <th className="py-2">Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Portal</th>
                  <th>City</th>
                  <th>Joined</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.id}>
                    <td className="font-semibold text-navy">{m.name}</td>
                    <td className="text-xs text-muted-foreground">{m.email}</td>
                    <td className="text-xs">{ROLE_LABEL[m.role] ?? m.role}</td>
                    <td className="text-xs text-muted-foreground">{ROLE_PORTAL[m.role] ?? "—"}</td>
                    <td className="text-xs">{m.city}</td>
                    <td className="text-xs text-muted-foreground">{fmtJoined(m.joined)}</td>
                    <td>
                      <Badge tone={m.verified ? "success" : "warm"}>
                        {m.verified ? "Active" : "Pending"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          page={page}
          totalPages={membersQ.data?.totalPages ?? 1}
          onPageChange={setPage}
          shown={members.length}
          total={total}
          noun="staff members"
        />
      </Section>

      {showAdd && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4"
          onClick={() => setShowAdd(false)}
        >
          <div
            className="animate-scale-in w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-1 text-[11px] font-bold uppercase tracking-widest text-accent">
              NxtSft.com Command
            </div>
            <h3 className="font-display text-xl font-bold text-navy">Add Team Member</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Creates a verified staff account with portal access for the chosen role.
            </p>
            <div className="mt-5 space-y-3">
              <input
                placeholder="Full name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
              <input
                type="email"
                placeholder="Work email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
              <input
                placeholder="Phone (10-digit mobile)"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
              <input
                type="password"
                placeholder="Temporary password (min 8 chars)"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as StaffRole })}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STAFF_ROLES.map((r) => (
                    <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input
                placeholder="City"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setShowAdd(false)}
                className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-navy hover:bg-secondary"
              >
                Cancel
              </button>
              <button
                onClick={() => createMember.mutate(form)}
                disabled={createMember.isPending}
                className="rounded-xl bg-gold px-4 py-2 text-sm font-bold text-navy-deep hover:opacity-90 disabled:opacity-50"
              >
                {createMember.isPending ? "Adding…" : "Add Member →"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
