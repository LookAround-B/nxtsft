import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { PortalShell, StatCard, Section, Badge } from "@/components/portal/PortalShell";
import { leads, teamMembers, properties, pipeline } from "@/data/static";

export const Route = createFileRoute("/admin-portal")({
  head: () => ({ meta: [{ title: "NestIQ Control — Admin" }] }),
  component: Admin,
});

const nav = [
  { label: "Operations", to: "/admin-portal", icon: "◆" },
  { label: "Team Management", to: "/admin-portal#team", icon: "♟" },
  { label: "Listings", to: "/admin-portal#list", icon: "▤" },
  { label: "Lead Management", to: "/admin-portal#leads", icon: "✦" },
  { label: "CRM Pipeline", to: "/admin-portal#crm", icon: "▰" },
  { label: "Click Alerts", to: "/admin-portal#alerts", icon: "◉" },
  { label: "Marketing", to: "/admin-portal#mkt", icon: "✺" },
  { label: "Developers", to: "/admin-portal#dev", icon: "▣" },
  { label: "Reports", to: "/admin-portal#rep", icon: "≡" },
  { label: "Commissions", to: "/admin-portal#comm", icon: "₹" },
];

function Admin() {
  return (
    <PortalShell brand="NestIQ Control" role="Admin" accent="red" user={{ name: "Meera Iyer", initials: "MI" }} nav={nav} basePath="/admin-portal">
      <AdminBody />
    </PortalShell>
  );
}

type Member = { id: string; name: string; email: string; role: string; city: string; status: "Active" | "Invited" };

const seedRoster: Member[] = teamMembers.map((m) => ({
  id: m.id, name: m.name, email: `${m.name.split(" ")[0].toLowerCase()}@nestiq.in`, role: m.role, city: m.city, status: "Active",
}));

function AdminBody() {
  const [roster, setRoster] = useState<Member[]>(seedRoster);
  const [showInvite, setShowInvite] = useState(false);
  return (
    <>
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Pipeline Value" value="₹84.2 Cr" sub="+9.1% wk" />
        <StatCard label="Open Leads" value="412" sub="+18 today" />
        <StatCard label="Pending Approvals" value="27" sub="6 urgent" accent="text-amber-600" />
        <StatCard label="Click Alerts (24h)" value="14" sub="3 thresholds hit" accent="text-accent" />
      </div>

      <Section title="Team Management" action={<button onClick={() => setShowInvite(true)} className="rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground">+ Invite Member</button>}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr><th className="py-2">ID</th><th>Name</th><th>Email</th><th>Role</th><th>City</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {roster.map((m) => (
                <tr key={m.id} className="border-t border-border">
                  <td className="py-3 font-mono text-xs">{m.id}</td>
                  <td className="font-semibold text-navy">{m.name}</td>
                  <td className="text-xs text-muted-foreground">{m.email}</td>
                  <td className="text-xs">{m.role}</td>
                  <td className="text-xs">{m.city}</td>
                  <td><Badge tone={m.status === "Active" ? "success" : "new"}>{m.status}</Badge></td>
                  <td className="text-right">
                    <button onClick={() => setRoster((r) => r.filter((x) => x.id !== m.id))} className="text-xs font-semibold text-accent">Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {showInvite && <InviteModal onClose={() => setShowInvite(false)} onInvite={(m) => { setRoster((r) => [m, ...r]); setShowInvite(false); }} />}

      <Section title="CRM Pipeline — Kanban" action={<Badge tone="new">All Teams</Badge>}>
        <div className="grid gap-3 md:grid-cols-6">
          {Object.entries(pipeline).map(([col, items]) => (
            <div key={col} className="rounded-lg bg-secondary/60 p-3">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-navy">{col}</span>
                <span className="rounded-full bg-white px-1.5 text-[10px] font-bold text-mid-blue">{items.length}</span>
              </div>
              <div className="space-y-2">
                {items.map((id) => (
                  <div key={id} className="rounded-md bg-white p-2.5 text-xs shadow-sm">
                    <div className="font-mono text-[10px] text-muted-foreground">{id}</div>
                    <div className="mt-0.5 font-semibold text-navy">Lead #{id.slice(-2)}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Section title="All Leads" action={<button className="rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground">+ Create Lead</button>}>
            <div className="overflow-x-auto"><table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr><th className="py-2">ID</th><th>Lead</th><th>Interest</th><th>Owner</th><th>Status</th><th>Value</th></tr>
              </thead>
              <tbody>
                {leads.map((l) => (
                  <tr key={l.id} className="border-t border-border">
                    <td className="py-3 font-mono text-xs">{l.id}</td>
                    <td><div className="font-semibold text-navy">{l.name}</div><div className="text-xs text-muted-foreground">{l.phone}</div></td>
                    <td className="text-xs">{l.interest}</td>
                    <td className="text-xs">{l.owner}</td>
                    <td><Badge tone={l.status.toLowerCase() as "hot" | "warm" | "cold" | "new"}>{l.status}</Badge></td>
                    <td className="font-mono text-xs">₹{(l.value / 100000).toFixed(1)}L</td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          </Section>
        </div>
        <Section title="Pending Listing Approvals">
          {properties.slice(0, 4).map((p) => (
            <div key={p.id} className="border-b border-border py-3 last:border-0">
              <div className="flex items-center gap-3">
                <img src={p.image} alt="" className="h-12 w-16 rounded object-cover" />
                <div className="flex-1">
                  <div className="text-sm font-semibold text-navy">{p.title}</div>
                  <div className="text-xs text-muted-foreground">{p.builder}</div>
                </div>
              </div>
              <div className="mt-2 flex gap-2">
                <button className="flex-1 rounded-md bg-emerald-500 py-1.5 text-xs font-semibold text-white">Approve</button>
                <button className="flex-1 rounded-md border border-border py-1.5 text-xs font-semibold text-foreground">Reject</button>
              </div>
            </div>
          ))}
        </Section>
      </div>

      <Section title="Team Performance — MTD">
        <div className="overflow-x-auto"><table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr><th className="py-2">Sales Rep</th><th>City</th><th>Open</th><th>Closed</th><th>Conv.</th><th>Target Achievement</th></tr>
          </thead>
          <tbody>
            {teamMembers.map((m) => (
              <tr key={m.id} className="border-t border-border">
                <td className="py-3 font-semibold text-navy">{m.name}</td>
                <td className="text-xs">{m.city}</td>
                <td>{m.leadsOpen}</td>
                <td>{m.closedMTD}</td>
                <td>{m.conversion}%</td>
                <td>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-32 rounded-full bg-secondary">
                      <div className="h-2 rounded-full bg-accent" style={{ width: `${m.achieved}%` }} />
                    </div>
                    <span className="font-mono text-xs">{m.achieved}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table></div>
      </Section>
    </>
  );
}

function InviteModal({ onClose, onInvite }: { onClose: () => void; onInvite: (m: Member) => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("Sales Rep");
  const [city, setCity] = useState("Mumbai");
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    onInvite({ id: `U-${Math.floor(Math.random() * 900 + 100)}`, name: name.trim(), email: email.trim(), role, city, status: "Invited" });
  };
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={onClose}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={submit} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-1 text-[11px] font-bold uppercase tracking-widest text-accent">Invite to NestIQ</div>
        <h3 className="font-display text-xl font-bold text-navy">Add a new team member</h3>
        <p className="mt-1 text-xs text-muted-foreground">They'll receive an email invite with a one-time sign-in link.</p>
        <div className="mt-5 space-y-3">
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Full name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30" placeholder="e.g. Aisha Khan" />
          </div>
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Work email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30" placeholder="aisha@nestiq.in" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Role</label>
              <select value={role} onChange={(e) => setRole(e.target.value)} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option>Admin</option>
                <option>Supervisor</option>
                <option>Sales Rep</option>
                <option>Marketing</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">City</label>
              <select value={city} onChange={(e) => setCity(e.target.value)} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option>Mumbai</option><option>Bengaluru</option><option>Pune</option><option>Delhi</option><option>Hyderabad</option><option>Chennai</option>
              </select>
            </div>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-md border border-border bg-white px-4 py-2 text-sm font-semibold text-navy hover:bg-secondary">Cancel</button>
          <button type="submit" className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground shadow hover:opacity-95">Send invite →</button>
        </div>
      </form>
    </div>
  );
}