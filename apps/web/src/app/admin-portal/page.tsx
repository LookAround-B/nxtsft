"use client";
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
  UserCheck,
  Image as ImageIcon,
  Gift,
  Star,
  Sofa,
  UploadCloud,
} from "lucide-react";
import { PortalShell } from "@/components/portal/PortalShell";
import { useActiveHash } from "@/lib/use-active-hash";
import { useAuth } from "@/lib/auth";
import { usePortalGuard } from "@/lib/use-portal-guard";
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
import { SellerApprovalsTab } from "@/components/admin-portal/tabs/SellerApprovalsTab";
import { SiteContentTab } from "@/components/admin-portal/tabs/SiteContentTab";
import { ReferralsTab } from "@/components/admin-portal/tabs/ReferralsTab";
import { ReviewsTab } from "@/components/admin-portal/tabs/ReviewsTab";
import { InteriorsTab } from "@/components/admin-portal/tabs/InteriorsTab";
import { BulkListingsTab } from "@/components/admin-portal/tabs/BulkListingsTab";

// Grouped nav — groups surface in the sidebar as section headings.
// Badge counts are static placeholders; wire to live queries once API endpoints expose them.
const nav = [
  // ── Overview ─────────────────────────────────────────────────────────
  { label: "Command Center", to: "/admin-portal",           icon: <LayoutDashboard size={14} />, group: "Overview" },

  // ── Sales & CRM ──────────────────────────────────────────────────────
  { label: "CRM Pipeline",   to: "/admin-portal#crm",       icon: <Kanban size={14} />,    group: "Sales & CRM" },
  { label: "Lead Management",to: "/admin-portal#leads",     icon: <Target size={14} /> },
  { label: "Commissions",    to: "/admin-portal#commissions",icon: <Wallet size={14} /> },

  // ── Customer Service ─────────────────────────────────────────────────
  { label: "Contact Enquiries",  to: "/admin-portal#enquiries",      icon: <Inbox size={14} />,      group: "Customer Service", badge: 4 },
  { label: "KYC Review",         to: "/admin-portal#kyc",            icon: <ShieldCheck size={14} />, badge: 3 },
  { label: "Seller Approvals",   to: "/admin-portal#seller-approvals",icon: <UserCheck size={14} />,  badge: 1 },
  { label: "Click Alerts",       to: "/admin-portal#alerts",         icon: <BellRing size={14} /> },

  // ── Platform ─────────────────────────────────────────────────────────
  { label: "Listings",       to: "/admin-portal#listings",     icon: <Building2 size={14} />,  group: "Platform", badge: 2 },
  { label: "Reviews",        to: "/admin-portal#reviews",      icon: <Star size={14} /> },
  { label: "Home Interiors", to: "/admin-portal#interiors",    icon: <Sofa size={14} /> },
  { label: "Property Views", to: "/admin-portal#views",        icon: <Eye size={14} /> },
  { label: "Subscriptions",  to: "/admin-portal#subscriptions",icon: <ReceiptText size={14} /> },
  { label: "Buyer Wallets",  to: "/admin-portal#credits",      icon: <Coins size={14} /> },
  { label: "Plans",          to: "/admin-portal#plans",        icon: <PackageOpen size={14} /> },

  // ── Intelligence ─────────────────────────────────────────────────────
  { label: "Reports",    to: "/admin-portal#reports",    icon: <BarChart2 size={14} />, group: "Intelligence" },
  { label: "Referrals",  to: "/admin-portal#referrals",  icon: <Gift size={14} /> },

  // ── Admin ─────────────────────────────────────────────────────────────
  { label: "Team Management",  to: "/admin-portal#team",         icon: <Users size={14} />,      group: "Admin" },
  { label: "Marketing",        to: "/admin-portal#marketing",    icon: <Megaphone size={14} /> },
  { label: "Home Page Content",to: "/admin-portal#site-content", icon: <ImageIcon size={14} /> },
  { label: "Bulk Listings",    to: "/admin-portal#bulk-listings",icon: <UploadCloud size={14} /> },
  { label: "Dev Tools",        to: "/admin-portal#dev",          icon: <Building size={14} /> },
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
    case "seller-approvals": return <SellerApprovalsTab />;
    case "kyc":           return <KYCReviewTab />;
    case "site-content":  return <SiteContentTab />;
    case "referrals":     return <ReferralsTab />;
    case "reviews":       return <ReviewsTab />;
    case "interiors":     return <InteriorsTab />;
    case "bulk-listings": return <BulkListingsTab />;
    default:              return <OperationsTab />;
  }
}

export default function AdminPortal() {
  const { session } = useAuth();
  const hash = useActiveHash();
  const ready = usePortalGuard();

  if (!ready || !session) return null;

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
