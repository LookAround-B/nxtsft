"use client";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { StatCard, Section } from "@/components/portal/PortalShell";
import { trpc } from "@/lib/trpc";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { TabHeader } from "./shared";

export function SecurityTab() {
  const saStatsQ = trpc.superAdmin.stats.useQuery();
  const failedQ = trpc.superAdmin.failedLogins.useQuery({ limit: 20 });
  const logQ = trpc.superAdmin.securityLog.useQuery({ limit: 20 });
  const ipQ = trpc.superAdmin.getIpRules.useQuery();
  const policyQ = trpc.superAdmin.getPolicyConfig.useQuery();

  const updateIp = trpc.superAdmin.updateIpRules.useMutation({
    onSuccess: () => { ipQ.refetch(); toast.success("IP rules updated"); },
    onError: (e: { message: string }) => toast.error(e.message),
  });
  const updatePolicy = trpc.superAdmin.updatePolicyConfig.useMutation({
    onSuccess: () => { policyQ.refetch(); toast.success("Security policy saved"); },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  const failed = (failedQ.data ?? []) as unknown as Array<{ id: string; entityId: string; ipAddress: string | null; createdAt: string }>;
  const logs = (logQ.data?.items ?? []) as unknown as Array<{ id: string; action: string; entity: string; ipAddress: string | null; createdAt: string }>;
  const activeSessions = saStatsQ.data?.activeSessionsCount ?? 0;

  const [whitelist, setWhitelist] = useState<string[]>([]);
  const [blacklist, setBlacklist] = useState<string[]>([]);
  const [newWhite, setNewWhite] = useState("");
  const [newBlack, setNewBlack] = useState("");
  useEffect(() => {
    if (ipQ.data) {
      setWhitelist(ipQ.data.whitelistedIps ?? []);
      setBlacklist(ipQ.data.blacklistedIps ?? []);
    }
  }, [ipQ.data]);

  type Role = "super-admin" | "admin" | "supervisor" | "sales" | "support-admin" | "user" | "home-seller";
  const [policy, setPolicy] = useState({
    passwordMinLength: 8,
    passwordComplexity: "medium" as "low" | "medium" | "high",
    passwordExpiryDays: 90,
    enforce2faRoles: [] as Role[],
  });
  useEffect(() => {
    if (policyQ.data) setPolicy(policyQ.data as typeof policy);
  }, [policyQ.data]);

  const isValidIp = (ip: string) => /^(\d{1,3}\.){3}\d{1,3}$/.test(ip);
  const addIp = (list: "w" | "b") => {
    const v = (list === "w" ? newWhite : newBlack).trim();
    if (!isValidIp(v)) return toast.error("Enter a valid IPv4 address.");
    if (list === "w") { setWhitelist((p) => [...new Set([...p, v])]); setNewWhite(""); }
    else { setBlacklist((p) => [...new Set([...p, v])]); setNewBlack(""); }
  };
  const removeIp = (list: "w" | "b", ip: string) =>
    list === "w" ? setWhitelist((p) => p.filter((x) => x !== ip)) : setBlacklist((p) => p.filter((x) => x !== ip));

  const ROLES_FOR_2FA: Role[] = ["super-admin", "admin", "supervisor", "sales", "support-admin"];
  const toggle2faRole = (role: Role) =>
    setPolicy((p) => ({
      ...p,
      enforce2faRoles: p.enforce2faRoles.includes(role)
        ? p.enforce2faRoles.filter((r) => r !== role)
        : [...p.enforce2faRoles, role],
    }));

  const fmt = (iso: string) => new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });

  return (
    <>
      <TabHeader title="Security Console" subtitle="Failed logins, IP access rules, sessions and policy." />
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Active Sessions" value={String(activeSessions)} sub="logged in now" />
        <StatCard label="Failed Logins" value={String(failed.length)} sub="recent attempts" accent={failed.length ? "text-amber-600" : undefined} />
        <StatCard label="Whitelisted IPs" value={String(whitelist.length)} />
        <StatCard label="Blacklisted IPs" value={String(blacklist.length)} accent={blacklist.length ? "text-amber-600" : undefined} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Section title="Failed Login Attempts">
          {failedQ.isLoading ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Loading…</p>
          ) : failed.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No failed login attempts recorded.</p>
          ) : (
            failed.map((f) => (
              <div key={f.id} className="flex items-center justify-between border-b border-border py-3 last:border-0">
                <div>
                  <div className="text-sm font-semibold text-navy">{f.entityId}</div>
                  <div className="font-mono text-xs text-muted-foreground">{f.ipAddress ?? "—"}</div>
                </div>
                <span className="font-mono text-xs text-muted-foreground">{fmt(f.createdAt)}</span>
              </div>
            ))
          )}
        </Section>

        <Section title="Security Log">
          {logQ.isLoading ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Loading…</p>
          ) : logs.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No security events yet.</p>
          ) : (
            logs.map((l) => (
              <div key={l.id} className="flex items-center justify-between border-b border-border py-3 last:border-0">
                <div>
                  <div className="text-sm font-semibold text-navy">{l.action}</div>
                  <div className="text-xs text-muted-foreground">{l.entity}</div>
                </div>
                <span className="font-mono text-xs text-muted-foreground">{fmt(l.createdAt)}</span>
              </div>
            ))
          )}
        </Section>
      </div>

      <Section
        title="IP Access Rules"
        action={
          <button
            onClick={() => updateIp.mutate({ whitelistedIps: whitelist, blacklistedIps: blacklist })}
            disabled={updateIp.isPending}
            className="rounded-md bg-gold px-3 py-1.5 text-xs font-bold text-navy-deep hover:opacity-90 disabled:opacity-50"
          >
            {updateIp.isPending ? "Saving…" : "Save IP Rules"}
          </button>
        }
      >
        <div className="grid gap-6 md:grid-cols-2">
          {([
            ["Whitelist", whitelist, "w", newWhite, setNewWhite] as const,
            ["Blacklist", blacklist, "b", newBlack, setNewBlack] as const,
          ]).map(([label, list, key, val, setVal]) => (
            <div key={label}>
              <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">{label}</div>
              <div className="flex gap-2">
                <input
                  value={val}
                  onChange={(e) => setVal(e.target.value)}
                  placeholder="e.g. 203.0.113.10"
                  className="flex-1 rounded-md border border-border bg-white px-3 py-1.5 text-xs outline-none focus:border-accent"
                />
                <button onClick={() => addIp(key)} className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold hover:border-accent">
                  Add
                </button>
              </div>
              <div className="mt-2 space-y-1">
                {list.length === 0 ? (
                  <p className="text-xs text-muted-foreground">None configured.</p>
                ) : (
                  list.map((ip) => (
                    <div key={ip} className="flex items-center justify-between rounded-md bg-secondary/40 px-3 py-1.5">
                      <span className="font-mono text-xs text-navy">{ip}</span>
                      <button onClick={() => removeIp(key, ip)} className="text-xs font-semibold text-rose-600 hover:underline">Remove</button>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section
        title="Password & 2FA Policy"
        action={
          <button
            onClick={() => updatePolicy.mutate(policy)}
            disabled={updatePolicy.isPending}
            className="rounded-md bg-gold px-3 py-1.5 text-xs font-bold text-navy-deep hover:opacity-90 disabled:opacity-50"
          >
            {updatePolicy.isPending ? "Saving…" : "Save Policy"}
          </button>
        }
      >
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Min password length</label>
            <input
              type="number"
              min={6}
              max={32}
              value={policy.passwordMinLength}
              onChange={(e) => setPolicy((p) => ({ ...p, passwordMinLength: Number(e.target.value) }))}
              className="mt-1 w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Complexity</label>
            <Select
              value={policy.passwordComplexity}
              onValueChange={(v) => setPolicy((p) => ({ ...p, passwordComplexity: v as typeof p.passwordComplexity }))}
            >
              <SelectTrigger className="mt-1 capitalize">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["low", "medium", "high"].map((c) => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Expiry (days, 0 = never)</label>
            <input
              type="number"
              min={0}
              value={policy.passwordExpiryDays}
              onChange={(e) => setPolicy((p) => ({ ...p, passwordExpiryDays: Number(e.target.value) }))}
              className="mt-1 w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </div>
        </div>
        <div className="mt-4">
          <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Enforce 2FA for roles</div>
          <div className="flex flex-wrap gap-2">
            {ROLES_FOR_2FA.map((role) => {
              const on = policy.enforce2faRoles.includes(role as Role);
              return (
                <button
                  key={role}
                  onClick={() => toggle2faRole(role)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${on ? "border-accent bg-accent text-white" : "border-border bg-white text-muted-foreground hover:border-accent/50"}`}
                >
                  {role}
                </button>
              );
            })}
          </div>
        </div>
      </Section>
    </>
  );
}
