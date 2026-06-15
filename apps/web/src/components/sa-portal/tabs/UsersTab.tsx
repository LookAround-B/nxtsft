"use client";
import { useState } from "react";
import { toast } from "sonner";
import { StatCard, Section, Badge } from "@/components/portal/PortalShell";
import { trpc } from "@/lib/trpc";
import { downloadCSV } from "@/lib/download-csv";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { TabHeader } from "./shared";

type AdminUser = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  city: string;
  verified: boolean;
  credits: number;
  joined: string;
  lastActive: string;
};

const SA_ROLES = ["super-admin", "admin", "supervisor", "sales", "support-admin", "user", "customer"] as const;
const SA_ROLE_LABEL: Record<string, string> = {
  "super-admin": "Super Admin",
  admin: "Admin",
  supervisor: "Supervisor",
  sales: "Sales Rep",
  "support-admin": "Support Admin",
  user: "Home Buyer",
  customer: "Customer",
};

export function UsersTab() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const usersQ = trpc.admin.users.list.useQuery({
    search: search || undefined,
    role: roleFilter ? (roleFilter as (typeof SA_ROLES)[number]) : undefined,
    limit: 100,
  });
  const users = (usersQ.data?.items ?? []) as unknown as AdminUser[];

  const updateRole = trpc.admin.users.updateRole.useMutation({
    onSuccess: () => { usersQ.refetch(); toast.success("Role updated"); },
    onError: (e: { message: string }) => toast.error(e.message),
  });
  const verifyUser = trpc.admin.users.verify.useMutation({
    onSuccess: () => { usersQ.refetch(); toast.success("User verified"); },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  const adminCount = users.filter((u) => u.role === "admin" || u.role === "super-admin").length;
  const salesCount = users.filter((u) => u.role === "sales").length;
  const consumerCount = users.filter((u) => u.role === "user" || u.role === "customer").length;

  const fmtJoined = (iso: string) =>
    new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  return (
    <>
      <TabHeader
        title="User Management"
        subtitle="Roles, verification and lifecycle for the whole platform."
        action={
          <button
            onClick={() =>
              downloadCSV(
                "users.csv",
                ["ID", "Name", "Email", "Role", "City", "Verified"],
                users.map((u) => [u.id, u.name, u.email, SA_ROLE_LABEL[u.role] ?? u.role, u.city, u.verified ? "Yes" : "No"]),
              )
            }
            className="text-xs font-semibold text-accent hover:underline"
          >
            Export CSV →
          </button>
        }
      />
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Total Users" value={String(users.length)} sub="in directory" />
        <StatCard label="Admins" value={String(adminCount)} />
        <StatCard label="Sales Reps" value={String(salesCount)} />
        <StatCard label="Consumers" value={String(consumerCount)} />
      </div>

      <Section
        title="Directory"
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
                {SA_ROLES.map((r) => <SelectItem key={r} value={r}>{SA_ROLE_LABEL[r]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        }
      >
        {usersQ.isLoading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Loading users…</p>
        ) : users.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No users match this filter.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="portal-table">
              <thead>
                <tr>
                  <th className="py-2">Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>City</th>
                  <th>Joined</th>
                  <th>Status</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td className="font-semibold text-navy">{u.name}</td>
                    <td className="text-xs text-muted-foreground">{u.email}</td>
                    <td>
                      <Select
                        value={u.role}
                        onValueChange={(v) => updateRole.mutate({ userId: u.id, role: v as (typeof SA_ROLES)[number] })}
                        disabled={updateRole.isPending}
                      >
                        <SelectTrigger size="sm" className="min-w-[7.5rem]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SA_ROLES.map((r) => <SelectItem key={r} value={r}>{SA_ROLE_LABEL[r]}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="text-xs">{u.city}</td>
                    <td className="text-xs text-muted-foreground">{fmtJoined(u.joined)}</td>
                    <td><Badge tone={u.verified ? "success" : "warm"}>{u.verified ? "Verified" : "Unverified"}</Badge></td>
                    <td className="text-right">
                      {u.verified ? (
                        <span className="text-xs text-muted-foreground">—</span>
                      ) : (
                        <button
                          onClick={() => verifyUser.mutate({ userId: u.id })}
                          disabled={verifyUser.isPending}
                          className="text-xs font-semibold text-accent hover:underline disabled:opacity-50"
                        >
                          Verify
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </>
  );
}
