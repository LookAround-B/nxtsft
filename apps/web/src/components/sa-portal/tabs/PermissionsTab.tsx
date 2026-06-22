"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { RotateCcw, Save, UserCheck } from "lucide-react";
import { Section } from "@/components/portal/PortalShell";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { TabHeader } from "./shared";

/* ── Access levels (ascending privilege) ─────────────────────────────────── */
type Level = "none" | "read" | "write" | "admin";
const LEVELS: Level[] = ["none", "read", "write", "admin"];

const levelMeta: Record<Level, { label: string; cell: string; dot: string; can: string }> = {
  none: { label: "None", cell: "bg-secondary/50 text-muted-foreground border-border", dot: "bg-muted-foreground/40", can: "No access" },
  read: { label: "Read", cell: "bg-sky-100 text-sky-700 border-sky-200", dot: "bg-sky-500", can: "View only" },
  write: { label: "Write", cell: "bg-amber-100 text-amber-700 border-amber-200", dot: "bg-amber-500", can: "Create & edit" },
  admin: { label: "Admin", cell: "bg-emerald-100 text-emerald-700 border-emerald-200", dot: "bg-emerald-500", can: "Full control" },
};

/* ── Canonical roles (columns) — super-admin is implicit full access ──────── */
const ROLES: { key: string; label: string }[] = [
  { key: "admin", label: "Admin" },
  { key: "supervisor", label: "Supervisor" },
  { key: "sales", label: "Sales Rep" },
  { key: "support-admin", label: "Support" },
  { key: "user", label: "Home Buyer" },
  { key: "home-seller", label: "Home Seller" },
];

/* ── Canonical features (rows), grouped ───────────────────────────────────── */
const FEATURES: { key: string; label: string; group: string }[] = [
  { key: "listings", label: "Listings & Approvals", group: "Operations" },
  { key: "leads", label: "Leads", group: "Operations" },
  { key: "crm", label: "CRM Pipeline", group: "Operations" },
  { key: "siteVisits", label: "Site Visits", group: "Operations" },
  { key: "subscriptions", label: "Subscriptions & Billing", group: "Growth" },
  { key: "marketing", label: "Marketing", group: "Growth" },
  { key: "reports", label: "Reports & Analytics", group: "Growth" },
  { key: "teams", label: "Team Management", group: "People" },
  { key: "users", label: "User Management", group: "People" },
  { key: "support", label: "Support Tickets", group: "People" },
  { key: "config", label: "Platform Config", group: "Platform" },
  { key: "security", label: "Audit & Security", group: "Platform" },
];

const FEATURE_GROUPS = [...new Set(FEATURES.map((f) => f.group))];

type Matrix = Record<string, Record<string, Level>>;

/* Sensible starting permissions per role. */
function defaultMatrix(): Matrix {
  const D: Record<string, Record<string, Level>> = {
    admin: { listings: "admin", leads: "admin", crm: "admin", siteVisits: "write", subscriptions: "admin", marketing: "admin", reports: "admin", teams: "admin", users: "write", support: "write", config: "read", security: "read" },
    supervisor: { listings: "read", leads: "write", crm: "write", siteVisits: "write", subscriptions: "read", marketing: "read", reports: "write", teams: "read", users: "none", support: "read", config: "none", security: "none" },
    sales: { listings: "read", leads: "write", crm: "read", siteVisits: "write", subscriptions: "none", marketing: "none", reports: "read", teams: "none", users: "none", support: "none", config: "none", security: "none" },
    "support-admin": { listings: "read", leads: "read", crm: "none", siteVisits: "none", subscriptions: "read", marketing: "none", reports: "read", teams: "none", users: "read", support: "admin", config: "none", security: "none" },
    user: { listings: "read", leads: "none", crm: "none", siteVisits: "write", subscriptions: "read", marketing: "none", reports: "none", teams: "none", users: "none", support: "read", config: "none", security: "none" },
    "home-seller": { listings: "read", leads: "none", crm: "none", siteVisits: "write", subscriptions: "read", marketing: "none", reports: "none", teams: "none", users: "none", support: "read", config: "none", security: "none" },
  };
  return D;
}

/* Overlay a saved matrix onto the defaults so newly added roles/features still
   get a value (and stale saved keys are ignored). */
function mergeMatrix(saved: Matrix): Matrix {
  const base = defaultMatrix();
  for (const { key: role } of ROLES) {
    for (const { key: feat } of FEATURES) {
      const v = saved?.[role]?.[feat];
      if (v && LEVELS.includes(v)) base[role]![feat] = v;
    }
  }
  return base;
}

function nextLevel(l: Level): Level {
  return LEVELS[(LEVELS.indexOf(l) + 1) % LEVELS.length]!;
}

export function PermissionsTab() {
  const matrixQ = trpc.superAdmin.getPermissionMatrix.useQuery();
  const update = trpc.superAdmin.updatePermissionMatrix.useMutation({
    onSuccess: () => {
      setDirty(false);
      matrixQ.refetch();
      toast.success("Permission matrix saved");
    },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  const [matrix, setMatrix] = useState<Matrix>(defaultMatrix);
  const [dirty, setDirty] = useState(false);
  const [simRole, setSimRole] = useState<string>("sales");
  const seeded = useRef(false);

  // Seed from the saved snapshot once it loads (don't clobber in-progress edits).
  useEffect(() => {
    if (matrixQ.data === undefined || seeded.current) return;
    seeded.current = true;
    if (matrixQ.data.matrix) setMatrix(mergeMatrix(matrixQ.data.matrix as Matrix));
  }, [matrixQ.data]);

  const cycle = (role: string, feat: string) => {
    setMatrix((prev) => ({ ...prev, [role]: { ...prev[role], [feat]: nextLevel(prev[role]![feat]!) } }));
    setDirty(true);
  };

  const resetDefaults = () => {
    setMatrix(defaultMatrix());
    setDirty(true);
    toast.info("Reset to defaults — Save to apply");
  };

  const updatedAt = matrixQ.data?.updatedAt
    ? new Date(matrixQ.data.updatedAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
    : null;

  /* Simulator: effective access for the selected role. */
  const sim = useMemo(() => {
    const role: Record<string, Level> = matrix[simRole] ?? {};
    const counts: Record<Level, number> = { none: 0, read: 0, write: 0, admin: 0 };
    for (const { key } of FEATURES) counts[role[key] ?? "none"]++;
    return { role, counts };
  }, [matrix, simRole]);

  return (
    <>
      <TabHeader
        title="Role & Permission Matrix"
        subtitle="Set each role's access per feature. Super Admin always has full control."
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={resetDefaults}
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-xs font-semibold text-navy transition hover:bg-secondary"
            >
              <RotateCcw size={13} /> Reset
            </button>
            <button
              onClick={() => update.mutate({ matrix })}
              disabled={!dirty || update.isPending}
              className="inline-flex items-center gap-1.5 rounded-md bg-gold px-3 py-2 text-xs font-bold text-navy-deep transition hover:opacity-90 disabled:opacity-50"
            >
              <Save size={13} /> {update.isPending ? "Saving…" : dirty ? "Save Changes" : "Saved"}
            </button>
          </div>
        }
      />

      {/* Legend */}
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-border bg-secondary/30 px-4 py-2.5">
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Levels</span>
        {LEVELS.map((l) => (
          <span key={l} className="flex items-center gap-1.5 text-xs font-medium text-navy">
            <span className={`h-2.5 w-2.5 rounded-full ${levelMeta[l].dot}`} />
            {levelMeta[l].label} <span className="text-muted-foreground">· {levelMeta[l].can}</span>
          </span>
        ))}
        <span className="ml-auto text-[11px] text-muted-foreground">Click a cell to cycle access</span>
      </div>

      <Section
        title="Access Matrix"
        action={updatedAt ? <span className="text-[11px] text-muted-foreground">Last saved {updatedAt}</span> : undefined}
      >
        {matrixQ.isLoading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Loading matrix…</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-separate border-spacing-0">
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 bg-white py-2 pr-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Feature
                  </th>
                  {ROLES.map((r) => (
                    <th key={r.key} className="px-2 py-2 text-center text-xs font-bold text-navy">
                      {r.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {FEATURE_GROUPS.map((group) => (
                  <FeatureGroup key={group} group={group} matrix={matrix} onCycle={cycle} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* Simulator */}
      <Section title="Simulate as Role">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-navy">
            <UserCheck size={15} className="text-accent" />
            <span className="font-semibold">View effective access for</span>
          </div>
          <div className="w-48">
            <Select value={simRole} onValueChange={setSimRole}>
              <SelectTrigger size="sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r.key} value={r.key}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Summary chips */}
        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {LEVELS.slice().reverse().map((l) => (
            <div key={l} className={`rounded-xl border px-4 py-3 ${levelMeta[l].cell}`}>
              <div className="font-display text-2xl font-black">{sim.counts[l]}</div>
              <div className="text-[11px] font-bold uppercase tracking-wider">{levelMeta[l].label}</div>
            </div>
          ))}
        </div>

        {/* Effective access list */}
        <div className="grid gap-2 sm:grid-cols-2">
          {FEATURES.map((f) => {
            const level = sim.role[f.key] ?? "none";
            return (
              <div key={f.key} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-navy">{f.label}</div>
                  <div className="text-[11px] text-muted-foreground">{f.group}</div>
                </div>
                <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold ${levelMeta[level].cell}`}>
                  <span className={`h-2 w-2 rounded-full ${levelMeta[level].dot}`} />
                  {levelMeta[level].can}
                </span>
              </div>
            );
          })}
        </div>
      </Section>
    </>
  );
}

/* ── Feature-group block: a group header row + its feature rows ───────────── */
function FeatureGroup({
  group,
  matrix,
  onCycle,
}: {
  group: string;
  matrix: Matrix;
  onCycle: (role: string, feat: string) => void;
}) {
  const rows = FEATURES.filter((f) => f.group === group);
  return (
    <>
      <tr>
        <td
          colSpan={ROLES.length + 1}
          className="sticky left-0 bg-secondary/40 px-1 py-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground"
        >
          {group}
        </td>
      </tr>
      {rows.map((f) => (
        <tr key={f.key} className="group">
          <td className="sticky left-0 z-10 bg-white py-1.5 pr-3 text-sm font-semibold text-navy group-hover:bg-secondary/20">
            {f.label}
          </td>
          {ROLES.map((r) => {
            const level = matrix[r.key]?.[f.key] ?? "none";
            return (
              <td key={r.key} className="px-1.5 py-1.5 text-center">
                <button
                  onClick={() => onCycle(r.key, f.key)}
                  title={`${r.label} · ${f.label}: ${levelMeta[level].label}`}
                  className={`w-full rounded-md border px-2 py-1.5 text-[11px] font-bold transition hover:brightness-95 ${levelMeta[level].cell}`}
                >
                  {levelMeta[level].label}
                </button>
              </td>
            );
          })}
        </tr>
      ))}
    </>
  );
}
