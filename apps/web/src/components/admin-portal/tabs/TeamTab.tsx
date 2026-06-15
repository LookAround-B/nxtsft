"use client";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Section, Badge } from "@/components/portal/PortalShell";
import { trpc } from "@/lib/trpc";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { PageHead } from "./PageHead";
import { type NewMemberInput, type TeamMember, ROLE_LABEL } from "./shared";

const INVITE_ROLES: { label: string; value: NewMemberInput["role"] }[] = [
  { label: "Admin", value: "admin" },
  { label: "Supervisor", value: "supervisor" },
  { label: "Sales Rep", value: "sales" },
  { label: "Support Admin", value: "support-admin" },
];

function InviteModal({
  onClose,
  onCreate,
  pending,
}: {
  onClose: () => void;
  onCreate: (m: NewMemberInput) => void;
  pending: boolean;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<NewMemberInput["role"]>("sales");
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
              <Select value={role} onValueChange={(v) => setRole(v as NewMemberInput["role"])}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INVITE_ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
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

export function TeamTab() {
  const [roleFilter, setRoleFilter] = useState("");
  const [search, setSearch] = useState("");
  const teamQ = trpc.admin.teamMembers.useQuery({
    role: roleFilter ? (roleFilter as NewMemberInput["role"]) : undefined,
    search: search || undefined,
  });
  const members = (teamQ.data ?? []) as unknown as TeamMember[];

  const createMember = trpc.admin.createTeamMember.useMutation({
    onSuccess: () => {
      teamQ.refetch();
      setShowInvite(false);
      toast.success("Team member added");
    },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  const [showInvite, setShowInvite] = useState(false);

  return (
    <>
      <PageHead title="Team Management" subtitle={`${members.length} staff member${members.length !== 1 ? "s" : ""}`} />
      <Section
        title="Active Roster"
        action={
          <div className="flex items-center gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name / email…"
              className="rounded-md border border-border bg-white px-3 py-1.5 text-xs outline-none focus:border-accent"
            />
            <Select value={roleFilter || "__all"} onValueChange={(v) => setRoleFilter(v === "__all" ? "" : v)}>
              <SelectTrigger size="sm" className="min-w-[8.5rem]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">All roles</SelectItem>
                {["admin", "supervisor", "sales", "support-admin"].map((r) => (
                  <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <button
              onClick={() => setShowInvite(true)}
              className="rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground"
            >
              + Add Member
            </button>
          </div>
        }
      >
        {teamQ.isLoading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Loading team…</p>
        ) : members.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No team members match this filter.</p>
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
                  <th>Joined</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.id}>
                    <td className="font-semibold text-navy">{m.name}</td>
                    <td className="text-xs text-muted-foreground">{m.email}</td>
                    <td className="font-mono text-xs text-muted-foreground">{m.phone}</td>
                    <td className="text-xs">{ROLE_LABEL[m.role] ?? m.role}</td>
                    <td className="text-xs">{m.city}</td>
                    <td className="text-xs text-muted-foreground">{new Date(m.joined).toLocaleDateString("en-IN")}</td>
                    <td><Badge tone={m.verified ? "success" : "new"}>{m.verified ? "Active" : "Invited"}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
      {showInvite && (
        <InviteModal
          pending={createMember.isPending}
          onClose={() => setShowInvite(false)}
          onCreate={(m) => createMember.mutate(m)}
        />
      )}
    </>
  );
}
