"use client";
import {
  LayoutDashboard,
  Ticket,
  AlertTriangle,
  UserCheck,
  BarChart2,
  BookOpen,
} from "lucide-react";
import { PortalShell } from "@/components/portal/PortalShell";
import { useActiveHash } from "@/lib/use-active-hash";
import { useAuth } from "@/lib/auth";
import { usePortalGuard } from "@/lib/use-portal-guard";
import { DashboardTab } from "@/components/support-portal/tabs/DashboardTab";
import { QueueTab } from "@/components/support-portal/tabs/QueueTab";
import { EscalationsTab } from "@/components/support-portal/tabs/EscalationsTab";
import { MyAssignmentsTab } from "@/components/support-portal/tabs/MyAssignmentsTab";
import { TATReportTab } from "@/components/support-portal/tabs/TATReportTab";
import { KnowledgeBaseTab } from "@/components/support-portal/tabs/KnowledgeBaseTab";

const nav = [
  { label: "Dashboard", to: "/support-portal", icon: <LayoutDashboard size={14} /> },
  { label: "Ticket Queue", to: "/support-portal#queue", icon: <Ticket size={14} /> },
  { label: "Escalations", to: "/support-portal#escalations", icon: <AlertTriangle size={14} /> },
  { label: "My Assignments", to: "/support-portal#mine", icon: <UserCheck size={14} /> },
  { label: "TAT Report", to: "/support-portal#tat", icon: <BarChart2 size={14} /> },
  { label: "Knowledge Base", to: "/support-portal#kb", icon: <BookOpen size={14} /> },
];

export default function SupportPortal() {
  const { session } = useAuth();
  const hash = useActiveHash();
  const ready = usePortalGuard();

  if (!ready || !session) return null;
  const user = { name: session.name, initials: session.initials };

  return (
    <PortalShell
      brand="NxtSft.com Support"
      role="Support Admin"
      accent="blue"
      user={user}
      nav={nav}
      basePath="/support-portal"
    >
      {renderTab(hash)}
    </PortalShell>
  );
}

function renderTab(h: string) {
  switch (h) {
    case "queue":        return <QueueTab />;
    case "escalations":  return <EscalationsTab />;
    case "mine":         return <MyAssignmentsTab />;
    case "tat":          return <TATReportTab />;
    case "kb":           return <KnowledgeBaseTab />;
    default:             return <DashboardTab />;
  }
}
