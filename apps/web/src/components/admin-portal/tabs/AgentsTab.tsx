"use client";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Pencil, Ban, CheckCircle2, Star, Award } from "lucide-react";
import { Section, Badge } from "@/components/portal/PortalShell";
import { trpc } from "@/lib/trpc";
import { PageHead } from "./PageHead";

type AgentMeta = {
  initials?: string;
  rating?: number;
  reviews?: number;
  deals?: number;
  since?: number;
  listings?: number;
  featured?: boolean;
  color?: string;
  responseTime?: string;
  portfolioValue?: string;
  specialties?: string[];
  languages?: string[];
  cities?: string[];
};

type AgentRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  city: string;
  avatar: string | null;
  slug: string | null;
  verified: boolean;
  active: boolean;
  joined: string;
  metadata: AgentMeta | null;
};

// Profile fields shared by create + edit (create additionally needs a password).
type AgentProfile = {
  name: string;
  email: string;
  phone: string;
  city: string;
  avatar?: string;
  rating?: number;
  deals?: number;
  since?: number;
  responseTime?: string;
  portfolioValue?: string;
  color?: string;
  featured?: boolean;
  specialties?: string[];
  languages?: string[];
  cities?: string[];
};

// Preset avatar-tile colours (Tailwind bg utilities), matching the seed palette.
const COLORS = [
  "bg-accent",
  "bg-mid-blue",
  "bg-navy",
  "bg-emerald-600",
  "bg-purple-600",
  "bg-amber-600",
  "bg-rose-600",
  "bg-teal-600",
  "bg-indigo-600",
  "bg-fuchsia-600",
  "bg-orange-600",
  "bg-cyan-600",
  "bg-pink-600",
  "bg-lime-600",
  "bg-slate-600",
];

const toList = (s: string) =>
  s
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

const inputCls =
  "mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30";
const labelCls = "text-[10px] font-semibold uppercase tracking-widest text-muted-foreground";

function AgentFormModal({
  agent,
  onClose,
  onSubmit,
  pending,
}: {
  agent: AgentRow | null; // null = create
  onClose: () => void;
  onSubmit: (profile: AgentProfile, password?: string) => void;
  pending: boolean;
}) {
  const m = agent?.metadata ?? {};
  const [name, setName] = useState(agent?.name ?? "");
  const [email, setEmail] = useState(agent?.email ?? "");
  const [phone, setPhone] = useState(agent?.phone ?? "");
  const [password, setPassword] = useState("");
  const [city, setCity] = useState(agent?.city ?? "");
  const [avatar, setAvatar] = useState(agent?.avatar ?? "");
  const [rating, setRating] = useState(String(m.rating ?? 5));
  const [deals, setDeals] = useState(String(m.deals ?? 0));
  const [since, setSince] = useState(String(m.since ?? new Date().getFullYear()));
  const [responseTime, setResponseTime] = useState(m.responseTime ?? "< 24 hrs");
  const [portfolioValue, setPortfolioValue] = useState(m.portfolioValue ?? "");
  const [color, setColor] = useState(m.color ?? "bg-accent");
  const [featured, setFeatured] = useState(m.featured ?? false);
  const [specialties, setSpecialties] = useState((m.specialties ?? []).join(", "));
  const [languages, setLanguages] = useState((m.languages ?? []).join(", "));
  const [cities, setCities] = useState((m.cities ?? []).join(", "));

  const isCreate = agent === null;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) return toast.error("Enter the agent's full name.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return toast.error("Enter a valid email.");
    if (!/^[6-9]\d{9}$/.test(phone)) return toast.error("Enter a valid 10-digit Indian mobile number.");
    if (city.trim().length < 2) return toast.error("Enter the agent's base city.");
    if (isCreate && password.length < 8) return toast.error("Temporary password must be at least 8 characters.");
    if (avatar && !/^https?:\/\//.test(avatar)) return toast.error("Photo URL must start with http(s)://");

    onSubmit(
      {
        name: name.trim(),
        email: email.trim(),
        phone,
        city: city.trim(),
        avatar: avatar.trim() || undefined,
        rating: Number(rating) || 0,
        deals: Number(deals) || 0,
        since: Number(since) || new Date().getFullYear(),
        responseTime: responseTime.trim() || undefined,
        portfolioValue: portfolioValue.trim() || undefined,
        color,
        featured,
        specialties: toList(specialties),
        languages: toList(languages),
        cities: toList(cities),
      },
      isCreate ? password : undefined,
    );
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
      >
        <div className="mb-1 text-[11px] font-bold uppercase tracking-widest text-accent">
          Agent Directory
        </div>
        <h3 className="font-display text-xl font-bold text-navy">
          {isCreate ? "Add a new agent" : `Edit ${agent.name}`}
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          {isCreate
            ? "Creates a verified agent that appears on the public /agents directory."
            : "Updates the public agent directory profile."}
        </p>

        <div className="mt-5 space-y-3">
          <div>
            <label className={labelCls}>Full name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="e.g. Fatima Sheikh" />
          </div>
          <div>
            <label className={labelCls}>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} placeholder="fatima@nxtsft.com" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Phone (10-digit)</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                className={inputCls}
                placeholder="9876543210"
              />
            </div>
            {isCreate ? (
              <div>
                <label className={labelCls}>Temp password</label>
                <input type="text" value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} placeholder="min 8 chars" />
              </div>
            ) : (
              <div>
                <label className={labelCls}>Base city</label>
                <input value={city} onChange={(e) => setCity(e.target.value)} className={inputCls} placeholder="Mumbai" />
              </div>
            )}
          </div>
          {isCreate && (
            <div>
              <label className={labelCls}>Base city</label>
              <input value={city} onChange={(e) => setCity(e.target.value)} className={inputCls} placeholder="Mumbai" />
            </div>
          )}
          <div>
            <label className={labelCls}>Photo URL (optional)</label>
            <input value={avatar} onChange={(e) => setAvatar(e.target.value)} className={inputCls} placeholder="https://…" />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>Rating (0–5)</label>
              <input type="number" step="0.1" min="0" max="5" value={rating} onChange={(e) => setRating(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Deals closed</label>
              <input type="number" min="0" value={deals} onChange={(e) => setDeals(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Partner since</label>
              <input type="number" min="1950" max={new Date().getFullYear()} value={since} onChange={(e) => setSince(e.target.value)} className={inputCls} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Response time</label>
              <input value={responseTime} onChange={(e) => setResponseTime(e.target.value)} className={inputCls} placeholder="< 30 min" />
            </div>
            <div>
              <label className={labelCls}>Portfolio value</label>
              <input value={portfolioValue} onChange={(e) => setPortfolioValue(e.target.value)} className={inputCls} placeholder="₹45 Cr+" />
            </div>
          </div>
          <div>
            <label className={labelCls}>Specialties (comma-separated)</label>
            <input value={specialties} onChange={(e) => setSpecialties(e.target.value)} className={inputCls} placeholder="Residential, Luxury Apartments" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Languages (comma-separated)</label>
              <input value={languages} onChange={(e) => setLanguages(e.target.value)} className={inputCls} placeholder="English, Hindi" />
            </div>
            <div>
              <label className={labelCls}>Cities covered (comma-separated)</label>
              <input value={cities} onChange={(e) => setCities(e.target.value)} className={inputCls} placeholder="Mumbai, Pune" />
            </div>
          </div>
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1">
              <label className={labelCls}>Avatar colour</label>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {COLORS.map((c) => (
                  <button
                    type="button"
                    key={c}
                    onClick={() => setColor(c)}
                    className={`h-6 w-6 rounded-full ${c} ${color === c ? "ring-2 ring-offset-2 ring-navy" : ""}`}
                    title={c}
                  />
                ))}
              </div>
            </div>
            <label className="flex cursor-pointer items-center gap-2 whitespace-nowrap pt-4 text-sm font-semibold text-navy">
              <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} className="h-4 w-4 accent-accent" />
              Featured
            </label>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-md border border-border bg-white px-4 py-2 text-sm font-semibold text-navy hover:bg-secondary">
            Cancel
          </button>
          <button type="submit" disabled={pending} className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground shadow hover:opacity-95 disabled:opacity-50">
            {pending ? "Saving…" : isCreate ? "Add agent" : "Save changes"}
          </button>
        </div>
      </form>
    </div>
  );
}

export function AgentsTab() {
  const [search, setSearch] = useState("");
  const agentsQ = trpc.admin.adminAgents.useQuery({ search: search || undefined });
  const agents = (agentsQ.data ?? []) as unknown as AgentRow[];

  const createAgent = trpc.admin.createAgent.useMutation({
    onSuccess: () => {
      agentsQ.refetch();
      setShowCreate(false);
      toast.success("Agent added");
    },
    onError: (e: { message: string }) => toast.error(e.message),
  });
  const updateAgent = trpc.admin.updateAgent.useMutation({
    onSuccess: () => {
      agentsQ.refetch();
      setEditing(null);
      toast.success("Agent updated");
    },
    onError: (e: { message: string }) => toast.error(e.message),
  });
  const setActive = trpc.admin.setAgentActive.useMutation({
    onSuccess: (_res, vars) => {
      agentsQ.refetch();
      toast.success(vars.active ? "Agent activated" : "Agent deactivated");
    },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<AgentRow | null>(null);

  return (
    <>
      <PageHead title="Agent Directory" subtitle={`${agents.length} agent${agents.length !== 1 ? "s" : ""}`} />
      <Section
        title="Agents"
        action={
          <div className="flex items-center gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name / email…"
              className="rounded-md border border-border bg-white px-3 py-1.5 text-xs outline-none focus:border-accent"
            />
            <button onClick={() => setShowCreate(true)} className="rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground">
              + Add Agent
            </button>
          </div>
        }
      >
        {agentsQ.isLoading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Loading agents…</p>
        ) : agents.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No agents match this search.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="portal-table">
              <thead>
                <tr>
                  <th className="py-2">Name</th>
                  <th>Contact</th>
                  <th>City</th>
                  <th>Rating</th>
                  <th>Deals</th>
                  <th>Featured</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {agents.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <div className="flex items-center gap-2">
                        <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-md text-[11px] font-black text-white ${a.metadata?.color ?? "bg-accent"}`}>
                          {a.metadata?.initials ?? a.name[0]}
                        </span>
                        <span className="font-semibold text-navy">{a.name}</span>
                      </div>
                    </td>
                    <td className="text-xs text-muted-foreground">
                      <div>{a.email}</div>
                      <div className="font-mono">{a.phone ?? "—"}</div>
                    </td>
                    <td className="text-xs">{a.city}</td>
                    <td className="text-xs">
                      <span className="inline-flex items-center gap-1">
                        <Star size={11} className="fill-amber-400 text-amber-400" />
                        {a.metadata?.rating ?? "—"}
                      </span>
                    </td>
                    <td className="text-xs">{a.metadata?.deals ?? 0}</td>
                    <td>{a.metadata?.featured ? <Badge tone="warm"><span className="flex items-center gap-1"><Award size={10} /> Featured</span></Badge> : <span className="text-xs text-muted-foreground">—</span>}</td>
                    <td><Badge tone={a.active ? "success" : "default"}>{a.active ? "Active" : "Inactive"}</Badge></td>
                    <td>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setEditing(a)}
                          title="Edit"
                          className="rounded-md border border-border p-1.5 text-muted-foreground hover:border-accent hover:text-accent"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => {
                            const verb = a.active ? "Deactivate" : "Activate";
                            if (!confirm(`${verb} ${a.name}? Deactivated agents are hidden from the public directory.`)) return;
                            setActive.mutate({ userId: a.id, active: !a.active });
                          }}
                          title={a.active ? "Deactivate" : "Activate"}
                          className={
                            a.active
                              ? "rounded-md border border-border p-1.5 text-muted-foreground hover:border-rose-300 hover:text-rose-600"
                              : "rounded-md border border-border p-1.5 text-muted-foreground hover:border-emerald-300 hover:text-emerald-600"
                          }
                        >
                          {a.active ? <Ban size={13} /> : <CheckCircle2 size={13} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {showCreate && (
        <AgentFormModal
          agent={null}
          pending={createAgent.isPending}
          onClose={() => setShowCreate(false)}
          onSubmit={(profile, password) => createAgent.mutate({ ...profile, password: password ?? "" })}
        />
      )}
      {editing && (
        <AgentFormModal
          agent={editing}
          pending={updateAgent.isPending}
          onClose={() => setEditing(null)}
          onSubmit={(profile) => updateAgent.mutate({ userId: editing.id, ...profile })}
        />
      )}
    </>
  );
}
