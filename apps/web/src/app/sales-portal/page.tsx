"use client";
import {
  Target,
  FileText,
  ClipboardList,
  Phone,
  Building,
  Wallet,
  LayoutGrid,
  BarChart2,
} from "lucide-react";
import { PortalShell, type PortalNav } from "@/components/portal/PortalShell";
import { useActiveHash } from "@/lib/use-active-hash";
import { useAuth } from "@/lib/auth";
import { usePortalGuard } from "@/lib/use-portal-guard";
import { trpc } from "@/lib/trpc";
import { ReportsDashboard } from "@/components/portal/ReportsDashboard";
import { MyLeadsTab } from "@/components/sales-portal/tabs/MyLeadsTab";
import { DetailTab } from "@/components/sales-portal/tabs/DetailTab";
import { LogTab } from "@/components/sales-portal/tabs/LogTab";
import { CallTab } from "@/components/sales-portal/tabs/CallTab";
import { VisitsTab } from "@/components/sales-portal/tabs/VisitsTab";
import { CommissionTab } from "@/components/sales-portal/tabs/CommissionTab";
import { ListingsTab } from "@/components/sales-portal/tabs/ListingsTab";

// Follows the canonical tab order (see sa-portal/page.tsx) for the shared tabs;
// the rep's lead-working tabs (not in the canonical list) keep their flow.
// Grouped nav — badges come from leads.badgeCounts (hidden while loading or 0).
type Badges = { openLeads: number; hotLeads: number; visitsUpcoming: number };
const makeNav = (b?: Badges): PortalNav[] => [
  { label: "My Leads", to: "/sales-portal", icon: <Target size={14} />, group: "Sales & CRM", badge: b?.openLeads },
  { label: "Lead Details", to: "/sales-portal#detail", icon: <FileText size={14} /> },
  { label: "Click-to-Call", to: "/sales-portal#call", icon: <Phone size={14} />, badge: b?.hotLeads },
  { label: "Site Visits", to: "/sales-portal#visits", icon: <Building size={14} />, badge: b?.visitsUpcoming },

  { label: "Activity Log", to: "/sales-portal#log", icon: <ClipboardList size={14} />, group: "Monitoring" },

  { label: "Listings", to: "/sales-portal#listings", icon: <LayoutGrid size={14} />, group: "Platform" },
  { label: "My Earnings", to: "/sales-portal#commission", icon: <Wallet size={14} /> },

  { label: "Reports", to: "/sales-portal#reports", icon: <BarChart2 size={14} />, group: "Intelligence" },
];

export default function SalesPortal() {
  const { session } = useAuth();
  const h = useActiveHash();
  const ready = usePortalGuard();

  const badgesQ = trpc.leads.badgeCounts.useQuery(undefined, {
    enabled: ready && !!session,
    refetchInterval: 60_000,
  });

  if (!ready || !session) return null;
  const user = { name: session.name, initials: session.initials };

  return (
    <PortalShell
      brand="NxtSft.com Field"
      role="Sales Rep"
      accent="amber"
      user={user}
      nav={makeNav(badgesQ.data)}
      basePath="/sales-portal"
    >
      {renderTab(h)}
    </PortalShell>
  );
}

function renderTab(h: string) {
  switch (h) {
    case "detail":     return <DetailTab />;
    case "log":        return <LogTab />;
    case "call":       return <CallTab />;
    case "visits":     return <VisitsTab />;
    case "commission": return <CommissionTab />;
    case "listings":   return <ListingsTab />;
    case "reports":
      return (
        <ReportsDashboard
          title="My Reports"
          subtitle="Your buyers, their subscriptions, and your site visits."
          showAgentsAndTickets={false}
        />
      );
    default: return <MyLeadsTab />;
  }
}
