"use client";
import { useState, type FormEvent } from "react";
import { keepPreviousData } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pencil, Ban, CheckCircle2, Eye, X } from "lucide-react";
import { Section, Badge } from "@/components/portal/PortalShell";
import { trpc } from "@/lib/trpc";
import { TableSkeleton } from "@/components/ui/skeleton";
import { Pagination } from "@/components/ui/pagination";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { PageHead } from "./PageHead";
import { type NewMemberInput, type TeamMember, ROLE_LABEL } from "./shared";

const INVITE_ROLES: { label: string; value: NewMemberInput["role"] }[] = [
  { label: "Admin", value: "admin" },
  { label: "Supervisor", value: "supervisor" },
  { label: "Sales Rep", value: "sales" },
  { label: "Virtual Property Consultant", value: "virtual-rep" },
  { label: "Support Admin", value: "support-admin" },
];

function InviteModal({
  onClose,
  onCreate,
  pending,
  fixedRole,
}: {
  onClose: () => void;
  onCreate: (m: NewMemberInput) => void;
  pending: boolean;
  fixedRole?: NewMemberInput["role"];
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<NewMemberInput["role"]>(fixedRole ?? "sales");
  const [city, setCity] = useState("Mumbai");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) return toast.error("Enter the member's full name.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return toast.error("Enter a valid email.");
    if (!/^[6-9]\d{9}$/.test(phone)) return toast.error("Enter a valid 10-digit Indian mobile number.");
    if (password.length < 8) return toast.error("Temporary password must be at least 8 characters.");
    onCreate({ name: name.trim(), email: email.trim(), phone, password, role, city });
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
      >
        <div className="mb-1 text-[11px] font-bold uppercase tracking-widest text-accent">
          Add to NxtSft.com
        </div>
        <h3 className="font-display text-xl font-bold text-navy">Add a new team member</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Creates a verified staff account they can sign in with immediately.
        </p>
        <div className="mt-5 space-y-3">
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Full name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
              placeholder="e.g. Aisha Khan"
            />
          </div>
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Work email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
              placeholder="aisha@nxtsft.com"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Phone (10-digit)</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
                placeholder="9876543210"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Temp password</label>
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
                placeholder="min 8 chars"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Role</label>
              {fixedRole ? (
                <div className="mt-1 rounded-md border border-input bg-secondary/40 px-3 py-2 text-sm font-semibold text-navy">
                  {INVITE_ROLES.find((r) => r.value === fixedRole)?.label ?? fixedRole}
                </div>
              ) : (
              <Select value={role} onValueChange={(v) => setRole(v as NewMemberInput["role"])}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INVITE_ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
              )}
            </div>
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">City</label>
              <Select value={city} onValueChange={setCity}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["Mumbai", "Bengaluru", "Pune", "Delhi", "Hyderabad", "Chennai"].map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-border bg-white px-4 py-2 text-sm font-semibold text-navy hover:bg-secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground shadow hover:opacity-95 disabled:opacity-50"
          >
            {pending ? "Adding…" : "Add member"}
          </button>
        </div>
      </form>
    </div>
  );
}

function EditModal({
  member,
  onClose,
  onSave,
  pending,
}: {
  member: TeamMember;
  onClose: () => void;
  onSave: (data: { name: string; email: string; phone: string; city: string }) => void;
  pending: boolean;
}) {
  const [name, setName] = useState(member.name);
  const [email, setEmail] = useState(member.email);
  const [phone, setPhone] = useState(member.phone);
  const [city, setCity] = useState(member.city);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) return toast.error("Enter the member's full name.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return toast.error("Enter a valid email.");
    if (!/^[6-9]\d{9}$/.test(phone)) return toast.error("Enter a valid 10-digit Indian mobile number.");
    onSave({ name: name.trim(), email: email.trim(), phone, city });
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
      >
        <h3 className="font-display text-xl font-bold text-navy">Edit team member</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Role changes are handled by a super-admin. This edits profile details only.
        </p>
        <div className="mt-5 space-y-3">
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Full name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
          </div>
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Work email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Phone (10-digit)</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">City</label>
              <Select value={city} onValueChange={setCity}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["Mumbai", "Bengaluru", "Pune", "Delhi", "Hyderabad", "Chennai"].map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-border bg-white px-4 py-2 text-sm font-semibold text-navy hover:bg-secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground shadow hover:opacity-95 disabled:opacity-50"
          >
            {pending ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </div>
  );
}

const PAGE_SIZE = 20;

const fmtINR = (n: number) => `₹${n.toLocaleString("en-IN")}`;

/** Everything a current or former team member has done (by id, never hidden). */
function ActivityPanel({ userId, onClose }: { userId: string; onClose: () => void }) {
  const q = trpc.admin.teamMemberActivity.useQuery({ userId });
  const d = q.data;
  const box = "rounded-xl border border-border bg-white p-3";
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="h-full w-full max-w-xl overflow-y-auto bg-background p-5 shadow-2xl sm:p-6"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-widest text-accent">Team member activity</div>
            <h3 className="font-display text-xl font-bold text-navy">{d?.member.name ?? "…"}</h3>
            {d && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                {ROLE_LABEL[d.member.role] ?? d.member.role}
                {d.member.formerStaffRole ? ` · was ${ROLE_LABEL[d.member.formerStaffRole] ?? d.member.formerStaffRole}` : ""}
                {" · "}
                {d.member.active ? "Active account" : "Inactive account"} · {d.member.phone ?? "—"}
              </p>
            )}
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary">
            <X size={18} />
          </button>
        </div>

        {q.isLoading || !d ? (
          <div className="mt-6"><TableSkeleton rows={6} cols={3} /></div>
        ) : (
          <div className="mt-5 space-y-4">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                ["Listings", String(d.summary.listings)],
                ["Leads", String(d.summary.leads)],
                ["Paid", `${d.summary.paid} · ${fmtINR(d.summary.paidAmount)}`],
                ["Pending", String(d.summary.pending)],
                ["Commission", fmtINR(d.summary.commissionTotal)],
                ["To pay", fmtINR(d.summary.commissionPending)],
                ["Open escalations", String(d.summary.escalationsOpen)],
                ["Site visits", String(d.summary.siteVisits)],
              ].map(([label, value]) => (
                <div key={label} className={box}>
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
                  <div className="mt-0.5 text-sm font-bold text-navy">{value}</div>
                </div>
              ))}
            </div>

            {d.summary.leadsByStatus.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {d.summary.leadsByStatus.map((g) => (
                  <span key={g.status} className="rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-semibold text-navy">
                    {g.status}: {g.count}
                  </span>
                ))}
              </div>
            )}

            <ActivityList
              title="Listings"
              empty="No listings created."
              rows={d.listings.map((p) => ({
                key: p.id,
                main: <a href={`/properties/${p.slug}`} target="_blank" rel="noopener noreferrer" className="font-semibold text-accent hover:underline">{p.title}</a>,
                sub: `${p.code} · ${p.status} · ${new Date(p.createdAt).toLocaleDateString("en-IN")}`,
              }))}
            />
            <ActivityList
              title="Payments"
              empty="No paid leads."
              rows={d.payments.map((l) => ({
                key: l.id,
                main: <span className="font-semibold text-navy">{l.name} · {l.phone}</span>,
                sub: `${l.plan ?? "Plan"} · ${l.amount ? fmtINR(l.amount) : "—"} · ${new Date(l.updatedAt).toLocaleDateString("en-IN")}`,
              }))}
            />
            <ActivityList
              title="Pending"
              empty="Nothing pending."
              rows={d.pendingItems.map((l) => ({
                key: l.id,
                main: <span className="font-semibold text-navy">{l.name} · {l.phone}</span>,
                sub: `${l.status} · ${l.plan ?? "—"}${l.amount ? " · " + fmtINR(l.amount) : ""}`,
              }))}
            />
            <ActivityList
              title="Escalations"
              empty="No escalations."
              rows={d.escalations.map((e) => ({
                key: e.id,
                main: <span className="font-semibold text-navy">{e.lead?.name ?? "Lead"} · {e.level}</span>,
                sub: `${e.status} · ${e.note.slice(0, 80)}`,
              }))}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function ActivityList({
  title,
  empty,
  rows,
}: {
  title: string;
  empty: string;
  rows: { key: string; main: React.ReactNode; sub: string }[];
}) {
  return (
    <div>
      <div className="mb-1.5 text-xs font-bold uppercase tracking-widest text-muted-foreground">
        {title} {rows.length > 0 && <span className="text-navy">({rows.length}{rows.length === 20 ? "+" : ""})</span>}
      </div>
      {rows.length === 0 ? (
        <p className="text-xs text-muted-foreground">{empty}</p>
      ) : (
        <div className="divide-y divide-border rounded-xl border border-border bg-white">
          {rows.map((r) => (
            <div key={r.key} className="px-3 py-2 text-sm">
              <div className="truncate">{r.main}</div>
              <div className="text-[11px] text-muted-foreground">{r.sub}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function TeamTab({
  fixedRole,
  title = "Team Management",
  addLabel = "+ Add Member",
  note,
}: {
  /** Lock the page to one role (e.g. the Virtual Property Consultants page). */
  fixedRole?: "virtual-rep";
  title?: string;
  addLabel?: string;
  note?: string;
} = {}) {
  const [roleFilter, setRoleFilter] = useState<string>(fixedRole ?? "");
  const [roster, setRoster] = useState<"active" | "inactive">("active");
  const [viewing, setViewing] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  // Any filter change invalidates the current page number.
  const reset = (fn: () => void) => { fn(); setPage(1); };

  const teamQ = trpc.admin.teamMembers.useQuery(
    {
      role: roleFilter ? (roleFilter as NewMemberInput["role"]) : undefined,
      search: search || undefined,
      roster,
      page,
      limit: PAGE_SIZE,
    },
    { placeholderData: keepPreviousData },
  );
  const members = (teamQ.data?.items ?? []) as unknown as TeamMember[];
  const total = teamQ.data?.total ?? 0;

  const createMember = trpc.admin.createTeamMember.useMutation({
    onSuccess: () => {
      teamQ.refetch();
      setShowInvite(false);
      toast.success("Team member added");
    },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  const assignSup = trpc.admin.assignSupervisor.useMutation({
    onSuccess: () => {
      teamQ.refetch();
      toast.success("Supervisor updated");
    },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  const updateMember = trpc.admin.updateTeamMember.useMutation({
    onSuccess: () => {
      teamQ.refetch();
      setEditing(null);
      toast.success("Team member updated");
    },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  const setActive = trpc.admin.setTeamMemberActive.useMutation({
    onSuccess: (_res, vars) => {
      teamQ.refetch();
      toast.success(vars.active ? "Member activated" : "Member deactivated");
    },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  // Roster rows are paged, so the supervisor options come from their own query
  // — otherwise a supervisor on page 2 would be missing from page 1's dropdown.
  const supervisors = trpc.leads.supervisors.useQuery().data ?? [];

  const [showInvite, setShowInvite] = useState(false);
  const [editing, setEditing] = useState<TeamMember | null>(null);

  return (
    <>
      <PageHead title={title} subtitle={note ?? `${total} staff member${total !== 1 ? "s" : ""}`} />
      <Section
        title={roster === "active" ? "Active Roster" : "Inactive Roster"}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Select value={roster} onValueChange={(v) => reset(() => setRoster(v as "active" | "inactive"))}>
              <SelectTrigger size="sm" className="min-w-[9rem]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Roster: Active</SelectItem>
                <SelectItem value="inactive">Roster: Inactive</SelectItem>
              </SelectContent>
            </Select>
            <input
              value={search}
              onChange={(e) => reset(() => setSearch(e.target.value))}
              placeholder="Search name / email…"
              className="rounded-md border border-border bg-white px-3 py-1.5 text-xs outline-none focus:border-accent"
            />
            {!fixedRole && (
            <Select value={roleFilter || "__all"} onValueChange={(v) => reset(() => setRoleFilter(v === "__all" ? "" : v))}>
              <SelectTrigger size="sm" className="min-w-[8.5rem]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">All roles</SelectItem>
                {["admin", "supervisor", "sales", "virtual-rep", "support-admin"].map((r) => (
                  <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            )}
            <button
              onClick={() => setShowInvite(true)}
              className="rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground"
            >
              {addLabel}
            </button>
          </div>
        }
      >
        {teamQ.isLoading ? (
          <TableSkeleton rows={6} cols={7} />
        ) : members.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {roster === "inactive" ? "No inactive or former team members." : "No team members match this filter."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="portal-table">
              <thead>
                <tr>
                  <th className="py-2">Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Role</th>
                  <th>City</th>
                  <th>Supervisor</th>
                  <th>Joined</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.id}>
                    <td className="font-semibold text-navy">{m.name}</td>
                    <td className="text-xs text-muted-foreground">{m.email}</td>
                    <td className="font-mono text-xs text-muted-foreground">{m.phone}</td>
                    <td className="text-xs">
                      {ROLE_LABEL[m.role] ?? m.role}
                      {m.formerStaffRole && (
                        <div className="text-[10px] font-semibold text-amber-700">
                          was {m.formerStaffRole === "staff" ? "staff" : ROLE_LABEL[m.formerStaffRole] ?? m.formerStaffRole}
                        </div>
                      )}
                    </td>
                    <td className="text-xs">{m.city}</td>
                    <td className="text-xs">
                      {["sales", "virtual-rep"].includes(m.role) ? (
                        <Select
                          value={m.supervisorId ?? "__none"}
                          onValueChange={(v) =>
                            assignSup.mutate({
                              userId: m.id,
                              supervisorId: v === "__none" ? null : v,
                            })
                          }
                        >
                          <SelectTrigger size="sm" className="min-w-[8.5rem]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none">— Unassigned</SelectItem>
                            {supervisors.map((s) => (
                              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="text-xs text-muted-foreground">{new Date(m.joined).toLocaleDateString("en-IN")}</td>
                    <td><Badge tone={m.active ? "success" : "default"}>{m.active ? "Active" : "Inactive"}</Badge></td>
                    <td>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setViewing(m.id)}
                          title="View activity"
                          className="rounded-md border border-border p-1.5 text-muted-foreground hover:border-accent hover:text-accent"
                        >
                          <Eye size={13} />
                        </button>
                        {!m.formerStaffRole && (<>
                        <button
                          onClick={() => setEditing(m)}
                          title="Edit"
                          className="rounded-md border border-border p-1.5 text-muted-foreground hover:border-accent hover:text-accent"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => {
                            const verb = m.active ? "Deactivate" : "Activate";
                            if (!confirm(`${verb} ${m.name}?`)) return;
                            setActive.mutate({ userId: m.id, active: !m.active });
                          }}
                          title={m.active ? "Deactivate" : "Activate"}
                          className={
                            m.active
                              ? "rounded-md border border-border p-1.5 text-muted-foreground hover:border-rose-300 hover:text-rose-600"
                              : "rounded-md border border-border p-1.5 text-muted-foreground hover:border-emerald-300 hover:text-emerald-600"
                          }
                        >
                          {m.active ? <Ban size={13} /> : <CheckCircle2 size={13} />}
                        </button>
                        </>)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          page={page}
          totalPages={teamQ.data?.totalPages ?? 1}
          onPageChange={setPage}
          shown={members.length}
          total={total}
          noun="staff members"
        />
      </Section>
      {showInvite && (
        <InviteModal
          fixedRole={fixedRole}
          pending={createMember.isPending}
          onClose={() => setShowInvite(false)}
          onCreate={(m) => createMember.mutate(m)}
        />
      )}
      {viewing && <ActivityPanel userId={viewing} onClose={() => setViewing(null)} />}
      {editing && (
        <EditModal
          member={editing}
          pending={updateMember.isPending}
          onClose={() => setEditing(null)}
          onSave={(data) => updateMember.mutate({ userId: editing.id, ...data })}
        />
      )}
    </>
  );
}
