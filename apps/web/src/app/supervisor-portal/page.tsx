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
import { PortalShell } from "@/components/portal/PortalShell";
import { useActiveHash } from "@/lib/use-active-hash";
import { useAuth } from "@/lib/auth";
import { usePortalGuard } from "@/lib/use-portal-guard";
import { ReportsDashboard } from "@/components/portal/ReportsDashboard";
import { DashboardTab } from "@/components/supervisor-portal/tabs/DashboardTab";
import { TeamLeadsTab } from "@/components/supervisor-portal/tabs/TeamLeadsTab";
import { ReassignmentTab } from "@/components/supervisor-portal/tabs/ReassignmentTab";
import { ActivityMonitorTab } from "@/components/supervisor-portal/tabs/ActivityMonitorTab";
import { PerformanceTab } from "@/components/supervisor-portal/tabs/PerformanceTab";
import { VisitCalendarTab } from "@/components/supervisor-portal/tabs/VisitCalendarTab";
import { EscalationsTab } from "@/components/supervisor-portal/tabs/EscalationsTab";

const nav = [
  { label: "Team Dashboard", to: "/supervisor-portal", icon: <LayoutDashboard size={14} /> },
  { label: "Team Leads", to: "/supervisor-portal#leads", icon: <Target size={14} /> },
  { label: "Reassignment", to: "/supervisor-portal#reassign", icon: <ArrowLeftRight size={14} /> },
  { label: "Activity Monitor", to: "/supervisor-portal#activity", icon: <ActivityIcon size={14} /> },
  { label: "Performance", to: "/supervisor-portal#performance", icon: <TrendingUp size={14} /> },
  { label: "Visit Calendar", to: "/supervisor-portal#calendar", icon: <CalendarIcon size={14} /> },
  { label: "Escalations", to: "/supervisor-portal#escalations", icon: <AlertTriangle size={14} /> },
  { label: "Reports", to: "/supervisor-portal#reports", icon: <BarChart2 size={14} /> },
];

export default function SupervisorPortal() {
  const { session } = useAuth();
  const hash = useActiveHash();
  const ready = usePortalGuard();

  if (!ready || !session) return null;
  const user = { name: session.name, initials: session.initials };

  return (
    <PortalShell
      brand="NxtSft.com Desk"
      role="Supervisor"
      accent="green"
      user={user}
      nav={nav}
      basePath="/supervisor-portal"
    >
      {renderTab(hash, session.name)}
    </PortalShell>
  );
}

function renderTab(h: string, supervisorName: string) {
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
          defaultSupervisor={supervisorName}
          title="My Team Reports"
          subtitle={`Reports filtered to your team — ${supervisorName}.`}
        />
      );
    default: return <DashboardTab />;
  }
}
