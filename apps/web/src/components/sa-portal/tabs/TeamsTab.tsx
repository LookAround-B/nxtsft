"use client";
import { useState } from "react";
import { toast } from "sonner";
import { StatCard, Section, Badge } from "@/components/portal/PortalShell";
import { teamMembers } from "@/data/static";
import { downloadCSV } from "@/lib/download-csv";
import { TabHeader } from "./shared";

const allUsers: Array<{
  id: string;
  name: string;
  email: string;
  role: string;
  portal: string;
  city: string;
  status: "Active" | "Invited" | "Suspended";
  last: string;
}> = [
  ...teamMembers.map((m) => ({
    id: m.id,
    name: m.name,
    email: `${m.name.toLowerCase().replace(/\s+/, ".")}@nxtsft.com`,
    role: m.role,
    portal: "Sales Portal",
    city: m.city,
    status: "Active" as const,
    last: "2h ago",
  })),
  {
    id: "U-25",
    name: "Aarav Khanna",
    email: "aarav.khanna@nxtsft.com",
    role: "Super Admin",
    portal: "Command",
    city: "Mumbai",
    status: "Active",
    last: "now",
  },
  {
    id: "U-26",
    name: "Meera Iyer",
    email: "meera.iyer@nxtsft.com",
    role: "Admin",
    portal: "Admin Portal",
    city: "Bengaluru",
    status: "Active",
    last: "12m ago",
  },
  {
    id: "U-27",
    name: "Rohit Nair",
    email: "rohit.nair@nxtsft.com",
    role: "Supervisor",
    portal: "Supervisor",
    city: "Hyderabad",
    status: "Suspended",
    last: "4d ago",
  },
  {
    id: "U-28",
    name: "Sneha Pillai",
    email: "sneha.pillai@nxtsft.com",
    role: "Sales Rep",
    portal: "Sales Portal",
    city: "Chennai",
    status: "Invited",
    last: "—",
  },
  {
    id: "U-29",
    name: "Rahul Verma",
    email: "rahul.verma@nxtsft.com",
    role: "Admin",
    portal: "Admin Portal",
    city: "Delhi",
    status: "Active",
    last: "1h ago",
  },
  {
    id: "U-30",
    name: "Pooja Desai",
    email: "pooja.desai@nxtsft.com",
    role: "Sales Rep",
    portal: "Sales Portal",
    city: "Pune",
    status: "Active",
    last: "3h ago",
  },
  {
    id: "U-31",
    name: "Arjun Shah",
    email: "arjun.shah@nxtsft.com",
    role: "Supervisor",
    portal: "Supervisor",
    city: "Mumbai",
    status: "Active",
    last: "45m ago",
  },
  {
    id: "U-32",
    name: "Nisha Kapoor",
    email: "nisha.kapoor@nxtsft.com",
    role: "Sales Rep",
    portal: "Sales Portal",
    city: "Bengaluru",
    status: "Active",
    last: "6h ago",
  },
  {
    id: "U-33",
    name: "Vivek Malhotra",
    email: "vivek.malhotra@nxtsft.com",
    role: "Sales Rep",
    portal: "Sales Portal",
    city: "Hyderabad",
    status: "Invited",
    last: "—",
  },
  {
    id: "U-34",
    name: "Preeti Singh",
    email: "preeti.singh@nxtsft.com",
    role: "Admin",
    portal: "Admin Portal",
    city: "Chennai",
    status: "Active",
    last: "2d ago",
  },
  {
    id: "U-35",
    name: "Manish Tiwari",
    email: "manish.tiwari@nxtsft.com",
    role: "Supervisor",
    portal: "Supervisor",
    city: "Pune",
    status: "Suspended",
    last: "1w ago",
  },
];

export function TeamsTab() {
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  const filtered = allUsers.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.role.toLowerCase().includes(search.toLowerCase()),
  );

  const total = allUsers.length;
  const active = allUsers.filter((u) => u.status === "Active").length;
  const invited = allUsers.filter((u) => u.status === "Invited").length;
  const suspended = allUsers.filter((u) => u.status === "Suspended").length;

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
        <StatCard label="Active" value={String(active)} sub="↑ currently online" />
        <StatCard label="Invited" value={String(invited)} sub="pending acceptance" />
        <StatCard label="Suspended" value={String(suspended)} accent="text-amber-600" />
      </div>

      <Section
        title="Staff Directory"
        action={
          <div className="flex items-center gap-3">
            <input
              placeholder="Search name or role…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="rounded-lg border border-input bg-background px-3 py-1.5 text-xs focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
            <button
              onClick={() =>
                downloadCSV(
                  "team-directory.csv",
                  ["ID", "Name", "Email", "Role", "Portal", "City", "Last Active", "Status"],
                  allUsers.map((u) => [
                    u.id,
                    u.name,
                    u.email,
                    u.role,
                    u.portal,
                    u.city,
                    u.last,
                    u.status,
                  ]),
                )
              }
              className="text-xs font-semibold text-accent hover:underline"
            >
              Export CSV →
            </button>
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="portal-table">
            <thead>
              <tr>
                <th className="py-2">ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Portal</th>
                <th>City</th>
                <th>Last Active</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id}>
                  <td className="font-mono text-xs">{u.id}</td>
                  <td className="font-semibold text-navy">{u.name}</td>
                  <td className="text-xs text-muted-foreground">{u.email}</td>
                  <td className="text-xs">{u.role}</td>
                  <td className="text-xs text-muted-foreground">{u.portal}</td>
                  <td className="text-xs">{u.city}</td>
                  <td className="text-xs text-muted-foreground">{u.last}</td>
                  <td>
                    <Badge
                      tone={
                        u.status === "Active"
                          ? "success"
                          : u.status === "Suspended"
                            ? "warm"
                            : "new"
                      }
                    >
                      {u.status}
                    </Badge>
                  </td>
                  <td className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => toast(`Editing ${u.name}…`)}
                        className="text-xs font-semibold text-accent hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => toast.success(`${u.name} suspended`)}
                        className="text-xs font-semibold text-amber-600 hover:underline"
                      >
                        Suspend
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
              Assign portal access and role for the new member.
            </p>
            <div className="mt-5 space-y-3">
              <input
                placeholder="Full name"
                className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
              <input
                type="email"
                placeholder="Work email"
                className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
              <select className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm">
                <option>Sales Rep</option>
                <option>Supervisor</option>
                <option>Admin</option>
              </select>
              <select className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm">
                <option>Sales Portal</option>
                <option>Supervisor Portal</option>
                <option>Admin Portal</option>
              </select>
              <input
                placeholder="City"
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
                onClick={() => {
                  setShowAdd(false);
                  toast.success("Member added and invite sent!");
                }}
                className="rounded-xl bg-gold px-4 py-2 text-sm font-bold text-navy-deep hover:opacity-90"
              >
                Add Member →
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
