"use client";
import { useEffect } from "react";
import {
  LayoutDashboard,
  Users,
  Building2,
  Target,
  Kanban,
  BellRing,
  Megaphone,
  Building,
  BarChart2,
  Wallet,
  ReceiptText,
  Eye,
  PackageOpen,
  Inbox,
  Coins,
  ShieldCheck,
} from "lucide-react";
import { PortalShell } from "@/components/portal/PortalShell";
import { useActiveHash } from "@/lib/use-active-hash";
import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { OperationsTab } from "@/components/admin-portal/tabs/OperationsTab";
import { TeamTab } from "@/components/admin-portal/tabs/TeamTab";
import { ListingsTab } from "@/components/admin-portal/tabs/ListingsTab";
import { LeadsTab } from "@/components/admin-portal/tabs/LeadsTab";
import { CRMTab } from "@/components/admin-portal/tabs/CRMTab";
import { SubscriptionsTab } from "@/components/admin-portal/tabs/SubscriptionsTab";
import { ViewsTab } from "@/components/admin-portal/tabs/ViewsTab";
import { AlertsTab } from "@/components/admin-portal/tabs/AlertsTab";
import { MarketingTab } from "@/components/admin-portal/tabs/MarketingTab";
import { DevTab } from "@/components/admin-portal/tabs/DevTab";
import { ReportsTab } from "@/components/admin-portal/tabs/ReportsTab";
import { AdminPlansTab } from "@/components/admin-portal/tabs/AdminPlansTab";
import { CommissionsTab } from "@/components/admin-portal/tabs/CommissionsTab";
import { EnquiriesTab } from "@/components/admin-portal/tabs/EnquiriesTab";
import { CreditsTab } from "@/components/admin-portal/tabs/CreditsTab";
import { KYCReviewTab } from "@/components/admin-portal/tabs/KYCReviewTab";

const nav = [
  { label: "Operations", to: "/admin-portal", icon: <LayoutDashboard size={14} /> },
  { label: "Contact Enquiries", to: "/admin-portal#enquiries", icon: <Inbox size={14} /> },
  { label: "Team Management", to: "/admin-portal#team", icon: <Users size={14} /> },
  { label: "Listings", to: "/admin-portal#listings", icon: <Building2 size={14} /> },
  { label: "Lead Management", to: "/admin-portal#leads", icon: <Target size={14} /> },
  { label: "CRM Pipeline", to: "/admin-portal#crm", icon: <Kanban size={14} /> },
  { label: "Subscriptions", to: "/admin-portal#subscriptions", icon: <ReceiptText size={14} /> },
  { label: "Property Views", to: "/admin-portal#views", icon: <Eye size={14} /> },
  { label: "Click Alerts", to: "/admin-portal#alerts", icon: <BellRing size={14} /> },
  { label: "Marketing", to: "/admin-portal#marketing", icon: <Megaphone size={14} /> },
  { label: "Developers", to: "/admin-portal#dev", icon: <Building size={14} /> },
  { label: "Reports", to: "/admin-portal#reports", icon: <BarChart2 size={14} /> },
  { label: "Plans", to: "/admin-portal#plans", icon: <PackageOpen size={14} /> },
  { label: "Commissions", to: "/admin-portal#commissions", icon: <Wallet size={14} /> },
  { label: "Buyer Wallets", to: "/admin-portal#credits", icon: <Coins size={14} /> },
  { label: "KYC Review", to: "/admin-portal#kyc", icon: <ShieldCheck size={14} /> },
];

function renderTab(hash: string) {
  switch (hash) {
    case "enquiries":     return <EnquiriesTab />;
    case "team":          return <TeamTab />;
    case "listings":      return <ListingsTab />;
    case "leads":         return <LeadsTab />;
    case "crm":           return <CRMTab />;
    case "subscriptions": return <SubscriptionsTab />;
    case "views":         return <ViewsTab />;
    case "alerts":        return <AlertsTab />;
    case "marketing":     return <MarketingTab />;
    case "dev":           return <DevTab />;
    case "reports":       return <ReportsTab />;
    case "plans":         return <AdminPlansTab />;
    case "commissions":   return <CommissionsTab />;
    case "credits":       return <CreditsTab />;
    case "kyc":           return <KYCReviewTab />;
    default:              return <OperationsTab />;
  }
}

export default function AdminPortal() {
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
      brand="NxtSft.com Control"
      role="Admin"
      accent="red"
      user={user}
      nav={nav}
      basePath="/admin-portal"
    >
      {renderTab(hash)}
    </PortalShell>
  );
}
