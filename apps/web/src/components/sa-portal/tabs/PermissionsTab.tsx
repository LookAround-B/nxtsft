"use client";
import { Fragment, useState } from "react";
import { Section } from "@/components/portal/PortalShell";
import { TabHeader } from "./shared";

/*
 * Role & Permission Matrix (boss list #17, 09-28).
 *
 * READ-ONLY and TRUE: it documents how access actually works in the code —
 * which portal each role can enter (apps/web/src/lib/routes.ts PORTAL_ACCESS)
 * and what the server lets that role do (tRPC procedure tiers + scoping).
 * The previous editable grid was saved but never enforced anywhere, and it
 * defaulted every role (even Home Buyer) to full access, which was misleading.
 * Changing a cell here means a code change; update this table with it.
 */

type Access = "full" | "team" | "own" | "view" | "none";

const ACCESS: Record<Access, { label: string; cls: string; note: string }> = {
  full: { label: "Full", cls: "bg-emerald-100 text-emerald-800 border-emerald-200", note: "All records, can change them" },
  team: { label: "Team", cls: "bg-sky-100 text-sky-800 border-sky-200", note: "Only their team's records" },
  own: { label: "Own", cls: "bg-amber-100 text-amber-800 border-amber-200", note: "Only their own / assigned records" },
  view: { label: "View", cls: "bg-violet-100 text-violet-800 border-violet-200", note: "Can see, can't change" },
  none: { label: "—", cls: "bg-secondary/60 text-muted-foreground border-border", note: "No access" },
};

const ROLES = [
  { key: "sa", label: "Super Admin" },
  { key: "admin", label: "Admin" },
  { key: "sup", label: "Supervisor" },
  { key: "sales", label: "Sales Rep" },
  { key: "vc", label: "Virtual Consultant" },
  { key: "support", label: "Support" },
  { key: "agent", label: "Agent" },
  { key: "seller", label: "Home Seller" },
  { key: "buyer", label: "Home Buyer" },
] as const;
type RoleKey = (typeof ROLES)[number]["key"];

type Row = { feature: string; detail?: string } & Record<RoleKey, Access>;

const R = (
  feature: string,
  a: [Access, Access, Access, Access, Access, Access, Access, Access, Access],
  detail?: string,
): Row => ({
  feature,
  detail,
  sa: a[0], admin: a[1], sup: a[2], sales: a[3], vc: a[4], support: a[5], agent: a[6], seller: a[7], buyer: a[8],
});

const GROUPS: { group: string; rows: Row[] }[] = [
  {
    group: "Listings",
    rows: [
      R("Post a property", ["full", "full", "none", "own", "own", "none", "own", "own", "none"],
        "Reps list on a customer's behalf (listing is on the customer's account). Agents/sellers list their own: free plan 1 listing, paid plans their plan's number. Buyers must switch to a seller account."),
      R("Edit a listing", ["full", "full", "none", "own", "own", "none", "own", "own", "none"],
        "Admin edits go live at once. Rep and seller edits to live listings wait for admin approval. Owner contact details can't be changed by reps."),
      R("Approve / publish / reject listings", ["full", "full", "none", "none", "none", "none", "none", "none", "none"]),
      R("Home Interiors listings", ["full", "full", "own", "own", "own", "own", "own", "own", "own"],
        "Anyone can list their own business. Staff can add one for a business owner. Only admins approve."),
      R("Reviews: approve / reject / delete", ["full", "full", "none", "none", "none", "none", "none", "none", "none"],
        "Signed-in users can write reviews; they wait for approval."),
    ],
  },
  {
    group: "Leads & Sales",
    rows: [
      R("Leads", ["full", "full", "team", "own", "own", "none", "own", "own", "own"],
        "Reps see leads on their name. Supervisors see their team's. Sellers/agents see buyers interested in their listings. Buyers see their own enquiries."),
      R("Assign / reassign leads", ["full", "full", "team", "none", "none", "none", "none", "none", "none"]),
      R("Payment links & plan sales", ["full", "full", "none", "own", "own", "none", "none", "none", "none"]),
      R("Commission", ["full", "full", "none", "own", "own", "none", "none", "none", "none"],
        "Fresh sales only: Sales Rep 10%, Virtual Consultant 30%. Agents earn no commission."),
      R("Site visits", ["full", "full", "team", "own", "own", "none", "own", "own", "own"]),
      R("Escalations", ["full", "full", "team", "none", "none", "full", "none", "none", "none"],
        "Supervisors raise escalations on at-risk leads; admins resolve. Support handles ticket escalations."),
      R("Click Alerts (buyer activity)", ["full", "full", "none", "none", "none", "none", "none", "none", "none"]),
    ],
  },
  {
    group: "Telecalling Contacts",
    rows: [
      R("Contact books (call, tag, notes)", ["full", "full", "team", "own", "own", "none", "none", "none", "none"],
        "Reps work their own book. Supervisors see and open their team's contacts. Admins see every rep's."),
      R("Import own contacts (CSV)", ["full", "full", "none", "own", "own", "none", "none", "none", "none"],
        "Numbers already in another rep's book are left out, unless the admin switch \"Reps can import numbers another rep already has\" is on (Admin › Rep Contacts › Rep permissions)."),
      R("Upload a contact list for a rep", ["full", "full", "team", "none", "none", "none", "none", "none", "none"],
        "The uploader picks one rep per upload; the rep is notified. Every upload shows in Upload history."),
      R("Reassign contacts", ["full", "full", "team", "none", "none", "none", "none", "none", "none"]),
      R("Delete assigned contacts", ["full", "full", "team", "none", "none", "none", "none", "none", "none"],
        "Reps can always delete contacts they added themselves. Contacts given to them by an admin or supervisor can only be deleted if the admin switch \"Reps can delete contacts assigned to them\" is on."),
      R("Rep permission switches", ["full", "full", "none", "none", "none", "none", "none", "none", "none"]),
    ],
  },
  {
    group: "Money",
    rows: [
      R("Buy plans / credits", ["none", "none", "none", "none", "none", "none", "own", "own", "own"]),
      R("Grant a plan (manual payment)", ["full", "full", "none", "none", "none", "none", "none", "none", "none"]),
      R("Subscriptions, transactions, wallets", ["full", "full", "none", "none", "none", "none", "own", "own", "own"]),
      R("Billing & revenue page", ["full", "view", "none", "none", "none", "none", "none", "none", "none"],
        "Revenue totals on the Admin dashboard; the Billing page itself is Super Admin only."),
      R("Plans Manager (prices, limits)", ["full", "full", "none", "none", "none", "none", "none", "none", "none"]),
      R("Referral rewards & payouts", ["full", "full", "none", "none", "none", "none", "own", "own", "own"],
        "Users refer and add a UPI ID; admins approve, export for Razorpay, mark paid."),
    ],
  },
  {
    group: "People & Support",
    rows: [
      R("Team Management (staff roster)", ["full", "full", "none", "none", "none", "none", "none", "none", "none"]),
      R("User Management (change role, disable)", ["full", "none", "none", "none", "none", "none", "none", "none", "none"],
        "Only Super Admin can change a user's role."),
      R("Onboard Virtual Property Consultants / approve Agents", ["full", "full", "none", "none", "none", "none", "none", "none", "none"],
        "Admins onboard Virtual Property Consultants as staff. Agents self-register and appear in the directory after admin approval."),
      R("KYC review & seller approvals", ["full", "full", "none", "none", "none", "none", "own", "own", "own"],
        "Users upload their own KYC documents."),
      R("Support tickets", ["full", "none", "none", "none", "none", "full", "own", "own", "own"],
        "Handled in the Support portal (and Super Admin). Users raise and track their own tickets."),
      R("Contact enquiries", ["full", "full", "none", "none", "none", "none", "none", "none", "none"],
        "Admin portals only. Admins can update status and delete."),
    ],
  },
  {
    group: "Reports & Marketing",
    rows: [
      R("Reports", ["full", "full", "team", "own", "own", "none", "none", "none", "none"]),
      R("Property views & buyer activity", ["full", "full", "none", "none", "none", "none", "own", "own", "own"],
        "Sellers see views on their own listings; buyers see their recently viewed."),
      R("Marketing, WhatsApp broadcast, push", ["full", "full", "none", "none", "none", "none", "none", "none", "none"],
        "Broadcasts go to real users only; marketing templates only to opted-in users."),
      R("Home page content, careers, bulk uploads", ["full", "full", "none", "none", "none", "none", "none", "none", "none"]),
    ],
  },
  {
    group: "Platform",
    rows: [
      R("Audit trail, security, platform config", ["full", "none", "none", "none", "none", "none", "none", "none", "none"]),
      R("Property types on/off, RERA rules", ["full", "full", "none", "none", "none", "none", "none", "none", "none"]),
      R("Dev tools", ["full", "full", "none", "none", "none", "none", "none", "none", "none"]),
    ],
  },
];

const PORTALS: { role: string; portal: string }[] = [
  { role: "Super Admin", portal: "Super Admin portal + every staff portal" },
  { role: "Admin", portal: "Admin portal" },
  { role: "Supervisor", portal: "Supervisor portal" },
  { role: "Sales Rep / Virtual Consultant", portal: "Sales portal" },
  { role: "Support", portal: "Support portal" },
  { role: "Agent / Home Seller / Home Buyer", portal: "User portal (features shown depend on the role)" },
];

export function PermissionsTab() {
  const [openDetail, setOpenDetail] = useState<string | null>(null);

  return (
    <>
      <TabHeader
        title="Role & Permission Matrix"
        subtitle="What each role can actually do today. Read-only: it reflects the live system, so changing access is a development request."
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {(Object.keys(ACCESS) as Access[]).map((k) => (
          <span key={k} className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${ACCESS[k].cls}`}>
            {ACCESS[k].label}
            <span className="font-normal opacity-80">{ACCESS[k].note}</span>
          </span>
        ))}
      </div>

      <Section title="Who can do what">
        <p className="mb-3 text-[11px] text-muted-foreground">Tap a feature to see how it works. Scroll sideways on mobile.</p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-separate border-spacing-0 text-xs">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-white py-2 pr-3 text-left font-semibold text-navy">Feature</th>
                {ROLES.map((r) => (
                  <th key={r.key} className="px-1.5 py-2 text-center font-semibold text-navy">{r.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {GROUPS.map((g) => (
                <Fragment key={g.group}>
                  <tr>
                    <td colSpan={ROLES.length + 1} className="bg-secondary/40 px-2 py-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      {g.group}
                    </td>
                  </tr>
                  {g.rows.map((row) => (
                    <Fragment key={row.feature}>
                      <tr className="border-b border-border">
                        <td className="sticky left-0 z-10 border-b border-border bg-white py-2 pr-3">
                          <button
                            type="button"
                            onClick={() => setOpenDetail(openDetail === row.feature ? null : row.feature)}
                            className="text-left font-semibold text-navy hover:text-accent"
                          >
                            {row.feature}
                            {row.detail && <span className="ml-1 text-[10px] text-accent">ⓘ</span>}
                          </button>
                        </td>
                        {ROLES.map((r) => {
                          const a = row[r.key];
                          return (
                            <td key={r.key} className="border-b border-border px-1.5 py-2 text-center">
                              <span className={`inline-block min-w-[3.25rem] rounded-md border px-1.5 py-0.5 text-[10px] font-bold ${ACCESS[a].cls}`}>
                                {ACCESS[a].label}
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                      {openDetail === row.feature && row.detail && (
                        <tr>
                          <td colSpan={ROLES.length + 1} className="bg-accent/5 px-3 py-2 text-[11px] text-navy">
                            {row.detail}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Which portal each role uses">
        <div className="divide-y divide-border rounded-xl border border-border">
          {PORTALS.map((p) => (
            <div key={p.role} className="flex flex-col gap-0.5 px-3 py-2 text-sm sm:flex-row sm:justify-between">
              <span className="font-semibold text-navy">{p.role}</span>
              <span className="text-muted-foreground">{p.portal}</span>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}
