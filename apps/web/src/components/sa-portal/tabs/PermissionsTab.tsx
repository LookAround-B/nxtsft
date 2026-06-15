"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Section } from "@/components/portal/PortalShell";
import { TabHeader, Toggle } from "./shared";

type PermRole = "Admin" | "Supervisor" | "Sales Rep" | "User";
type PermGroup = { group: string; tabs: string[] };

const PERM_ROLES: PermRole[] = ["Admin", "Supervisor", "Sales Rep", "User"];
const PERM_GROUPS: PermGroup[] = [
  {
    group: "Admin Portal",
    tabs: ["Operations", "Team Mgmt", "Listings", "Leads", "CRM", "Marketing", "Reports"],
  },
  { group: "Supervisor Portal", tabs: ["Dashboard", "Team Leads", "Activity", "Performance"] },
  { group: "Sales Portal", tabs: ["My Leads", "Lead Details", "Commissions", "Site Visits"] },
  { group: "User Portal", tabs: ["My Properties", "Recently Viewed", "My Credits", "Profile"] },
];

function buildDefaultPerms(): Record<PermRole, Record<string, boolean>> {
  const obj = {} as Record<PermRole, Record<string, boolean>>;
  for (const role of PERM_ROLES) {
    obj[role] = {};
    for (const g of PERM_GROUPS) {
      for (const tab of g.tabs) {
        obj[role][tab] = true;
      }
    }
  }
  return obj;
}

export function PermissionsTab() {
  const [perms, setPerms] = useState<Record<PermRole, Record<string, boolean>>>(buildDefaultPerms);

  const toggle = (role: PermRole, tab: string) =>
    setPerms((prev) => ({
      ...prev,
      [role]: { ...prev[role], [tab]: !prev[role][tab] },
    }));

  return (
    <>
      <TabHeader
        title="Role Permissions"
        subtitle="Control which roles can access which tabs across all portals."
        action={
          <button
            onClick={() => toast.success("Permissions saved successfully")}
            className="rounded-md bg-gold px-3 py-2 text-xs font-bold text-navy-deep hover:opacity-90 transition"
          >
            Save Permissions
          </button>
        }
      />

      {PERM_GROUPS.map(({ group, tabs }) => (
        <Section key={group} title={group}>
          <div className="overflow-x-auto">
            <table className="portal-table">
              <thead>
                <tr>
                  <th className="py-2 text-left">Tab</th>
                  {PERM_ROLES.map((r) => (
                    <th key={r} className="text-center">
                      {r}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tabs.map((tab) => (
                  <tr key={tab}>
                    <td className="text-sm font-semibold text-navy">{tab}</td>
                    {PERM_ROLES.map((role) => (
                      <td key={role} className="text-center">
                        <Toggle on={perms[role][tab]} onToggle={() => toggle(role, tab)} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      ))}
    </>
  );
}
