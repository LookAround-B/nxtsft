"use client";
import {
  LayoutDashboard,
  Target,
  ArrowLeftRight,
  TrendingUp,
  AlertTriangle,
  BarChart2,
} from "lucide-react";
import { Activity as ActivityIcon, Calendar as CalendarIcon } from "lucide-react";
import { PortalShell, type PortalNav } from "@/components/portal/PortalShell";
import { useActiveHash } from "@/lib/use-active-hash";
import { useAuth } from "@/lib/auth";
import { usePortalGuard } from "@/lib/use-portal-guard";
import { trpc } from "@/lib/trpc";
import { ReportsDashboard } from "@/components/portal/ReportsDashboard";
import { DashboardTab } from "@/components/supervisor-portal/tabs/DashboardTab";
import { TeamLeadsTab } from "@/components/supervisor-portal/tabs/TeamLeadsTab";
import { ReassignmentTab } from "@/components/supervisor-portal/tabs/ReassignmentTab";
import { ActivityMonitorTab } from "@/components/supervisor-portal/tabs/ActivityMonitorTab";
import { PerformanceTab } from "@/components/supervisor-portal/tabs/PerformanceTab";
import { VisitCalendarTab } from "@/components/supervisor-portal/tabs/VisitCalendarTab";
import { EscalationsTab } from "@/components/supervisor-portal/tabs/EscalationsTab";

// Grouped nav — groups surface in the sidebar as section headings.
// Badges come from supervisor.badgeCounts (hidden while loading or when 0).
type Badges = { hotLeads: number; unassigned: number; escalations: number; visitsToday: number };
const makeNav = (b?: Badges): PortalNav[] => [
  { label: "Team Dashboard", to: "/supervisor-portal", icon: <LayoutDashboard size={14} />, group: "Overview" },

  { label: "Team Leads", to: "/supervisor-portal#leads", icon: <Target size={14} />, group: "Sales & CRM", badge: b?.hotLeads },
  { label: "Reassignment", to: "/supervisor-portal#reassign", icon: <ArrowLeftRight size={14} />, badge: b?.unassigned },
  { label: "Escalations", to: "/supervisor-portal#escalations", icon: <AlertTriangle size={14} />, badge: b?.escalations },

  { label: "Activity Monitor", to: "/supervisor-portal#activity", icon: <ActivityIcon size={14} />, group: "Monitoring" },
  { label: "Performance", to: "/supervisor-portal#performance", icon: <TrendingUp size={14} /> },
  { label: "Visit Calendar", to: "/supervisor-portal#calendar", icon: <CalendarIcon size={14} />, badge: b?.visitsToday },

  { label: "Reports", to: "/supervisor-portal#reports", icon: <BarChart2 size={14} />, group: "Intelligence" },
];

export default function SupervisorPortal() {
  const { session } = useAuth();
  const hash = useActiveHash();
  const ready = usePortalGuard();

  const badgesQ = trpc.supervisor.badgeCounts.useQuery(undefined, {
    enabled: ready && !!session,
    refetchInterval: 60_000,
  });

  if (!ready || !session) return null;
  const user = { name: session.name, initials: session.initials };

  return (
    <PortalShell
      brand="NxtSft.com Desk"
      role="Supervisor"
      accent="green"
      user={user}
      nav={makeNav(badgesQ.data)}
      basePath="/supervisor-portal"
    >
      {renderTab(hash)}
    </PortalShell>
  );
}

function renderTab(h: string) {
  switch (h) {
    case "leads":       return <TeamLeadsTab />;
    case "reassign":    return <ReassignmentTab />;
    case "activity":    return <ActivityMonitorTab />;
    case "performance": return <PerformanceTab />;
    case "calendar":    return <VisitCalendarTab />;
    case "escalations": return <EscalationsTab />;
    case "reports":
      return (
        <ReportsDashboard
          title="Team Reports"
          subtitle="Platform-wide reports across all reps — users, subscriptions, visits, agents and tickets."
        />
      );
    default: return <DashboardTab />;
  }
}
