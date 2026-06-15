"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Settings2,
  BarChart3,
  ClipboardList,
  Cpu,
  Bell,
  FileText,
  Shield,
  CreditCard,
  Users2,
  PackageOpen,
} from "lucide-react";
import { PortalShell } from "@/components/portal/PortalShell";
import { useActiveHash } from "@/lib/use-active-hash";
import { useAuth } from "@/lib/auth";
import { Dashboard } from "@/components/sa-portal/tabs/Dashboard";
import { UsersTab } from "@/components/sa-portal/tabs/UsersTab";
import { TeamsTab } from "@/components/sa-portal/tabs/TeamsTab";
import { ConfigTab } from "@/components/sa-portal/tabs/ConfigTab";
import { AnalyticsTab } from "@/components/sa-portal/tabs/AnalyticsTab";
import { AuditTab } from "@/components/sa-portal/tabs/AuditTab";
import { AITab } from "@/components/sa-portal/tabs/AITab";
import { NotifyTab } from "@/components/sa-portal/tabs/NotifyTab";
import { CMSTab } from "@/components/sa-portal/tabs/CMSTab";
import { SecurityTab } from "@/components/sa-portal/tabs/SecurityTab";
import { BillingTab } from "@/components/sa-portal/tabs/BillingTab";
import { PermissionsTab } from "@/components/sa-portal/tabs/PermissionsTab";
import { PlansManagerTab } from "@/components/sa-portal/tabs/PlansManagerTab";
import { SupportTicketsTab } from "@/components/sa-portal/tabs/SupportTicketsTab";
import { ReportsTab } from "@/components/sa-portal/tabs/ReportsTab";

const nav = [
  { label: "Command Dashboard", to: "/sa-portal", icon: <LayoutDashboard size={14} /> },
  { label: "User Management", to: "/sa-portal#users", icon: <Users size={14} /> },
  { label: "All Teams", to: "/sa-portal#teams", icon: <Users2 size={14} /> },
  { label: "Platform Config", to: "/sa-portal#config", icon: <Settings2 size={14} /> },
  { label: "Global Analytics", to: "/sa-portal#analytics", icon: <BarChart3 size={14} /> },
  { label: "Audit Trail", to: "/sa-portal#audit", icon: <ClipboardList size={14} /> },
  { label: "AI Model Control", to: "/sa-portal#ai", icon: <Cpu size={14} /> },
  { label: "Notifications", to: "/sa-portal#notify", icon: <Bell size={14} /> },
  { label: "Content CMS", to: "/sa-portal#cms", icon: <FileText size={14} /> },
  { label: "Security Console", to: "/sa-portal#sec", icon: <Shield size={14} /> },
  { label: "Billing & Revenue", to: "/sa-portal#bill", icon: <CreditCard size={14} /> },
  { label: "Role Permissions", to: "/sa-portal#permissions", icon: <Shield size={14} /> },
  { label: "Plans Manager", to: "/sa-portal#plans", icon: <PackageOpen size={14} /> },
  { label: "Support Tickets", to: "/sa-portal#tickets", icon: <FileText size={14} /> },
  { label: "Reports", to: "/sa-portal#reports", icon: <FileText size={14} /> },
];

function renderTab(hash: string) {
  switch (hash) {
    case "users":
      return <UsersTab />;
    case "teams":
      return <TeamsTab />;
    case "config":
      return <ConfigTab />;
    case "analytics":
      return <AnalyticsTab />;
    case "audit":
      return <AuditTab />;
    case "ai":
      return <AITab />;
    case "notify":
      return <NotifyTab />;
    case "cms":
      return <CMSTab />;
    case "sec":
      return <SecurityTab />;
    case "bill":
      return <BillingTab />;
    case "permissions":
      return <PermissionsTab />;
    case "plans":
      return <PlansManagerTab />;
    case "tickets":
      return <SupportTicketsTab />;
    case "reports":
      return <ReportsTab />;
    default:
      return <Dashboard />;
  }
}

export default function SAPortal() {
  const { session } = useAuth();
  const router = useRouter();
  const hash = useActiveHash();

  useEffect(() => {
    if (session !== undefined && !session) router.push("/admin-login");
  }, [session, router]);

  if (!session) return null;
  const user = { name: session.name, initials: session.initials };

  return (
    <PortalShell
      brand="NxtSft.com Command"
      role="Super Admin"
      accent="gold"
      user={user}
      nav={nav}
      basePath="/sa-portal"
    >
      {renderTab(hash)}
    </PortalShell>
  );
}
