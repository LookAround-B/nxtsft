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
  Lamp,
  UploadCloud,
  Contact,
  Flame,
  Layers,
} from "lucide-react";
import { PortalShell } from "@/components/portal/PortalShell";
import { trpc } from "@/lib/trpc";
import { useActiveHash } from "@/lib/use-active-hash";
import type { BadgeCounts } from "@/components/admin-portal/tabs/shared";
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
import { TransactionsTab } from "@/components/admin-portal/tabs/TransactionsTab";
import { PropertyTypesTab } from "@/components/admin-portal/tabs/PropertyTypesTab";
import { PushNotificationsTab } from "@/components/admin-portal/tabs/PushNotificationsTab";
import { KYCReviewTab } from "@/components/admin-portal/tabs/KYCReviewTab";
import { SellerApprovalsTab } from "@/components/admin-portal/tabs/SellerApprovalsTab";
import { SiteContentTab } from "@/components/admin-portal/tabs/SiteContentTab";
import { ReferralsTab } from "@/components/admin-portal/tabs/ReferralsTab";
import { ReviewsTab } from "@/components/admin-portal/tabs/ReviewsTab";
import { InteriorsTab } from "@/components/admin-portal/tabs/InteriorsTab";
import { DecorTab } from "@/components/admin-portal/tabs/DecorTab";
import { BulkListingsTab } from "@/components/admin-portal/tabs/BulkListingsTab";
import { AgentsTab } from "@/components/admin-portal/tabs/AgentsTab";
import { EscalationsTab } from "@/components/admin-portal/tabs/EscalationsTab";

// Grouped nav — groups surface in the sidebar as section headings.
// Badges come from admin.badgeCounts (hidden while loading or when 0).
const makeNav = (b?: BadgeCounts) => [
  // ── Overview ─────────────────────────────────────────────────────────
  { label: "Command Center", to: "/admin-portal",           icon: <LayoutDashboard size={14} />, group: "Overview" },

  // ── Sales & CRM ──────────────────────────────────────────────────────
  { label: "CRM Pipeline",   to: "/admin-portal#crm",       icon: <Kanban size={14} />,    group: "Sales & CRM" },
  { label: "Lead Management",to: "/admin-portal#leads",     icon: <Target size={14} /> },
  { label: "Commissions",    to: "/admin-portal#commissions",icon: <Wallet size={14} /> },

  // ── Customer Service ─────────────────────────────────────────────────
  { label: "Contact Enquiries",  to: "/admin-portal#enquiries",      icon: <Inbox size={14} />,      group: "Customer Service", badge: b?.enquiries },
  { label: "KYC Review",         to: "/admin-portal#kyc",            icon: <ShieldCheck size={14} />, badge: b?.kyc },
  { label: "Seller Approvals",   to: "/admin-portal#seller-approvals",icon: <UserCheck size={14} />,  badge: b?.sellerApprovals },
  { label: "Escalations",        to: "/admin-portal#escalations",    icon: <Flame size={14} />, badge: b?.escalations },
  { label: "Click Alerts",       to: "/admin-portal#alerts",         icon: <BellRing size={14} /> },

  // ── Platform ─────────────────────────────────────────────────────────
  { label: "Listings",       to: "/admin-portal#listings",     icon: <Building2 size={14} />,  group: "Platform", badge: b?.listings },
  { label: "Property Types", to: "/admin-portal#property-types",icon: <Layers size={14} /> },
  { label: "Agents",         to: "/admin-portal#agents",       icon: <Contact size={14} /> },
  { label: "Reviews",        to: "/admin-portal#reviews",      icon: <Star size={14} />, badge: b?.reviews },
  { label: "Home Interiors", to: "/admin-portal#interiors",    icon: <Sofa size={14} />, badge: b?.interiors },
  { label: "Decors",         to: "/admin-portal#decor",        icon: <Lamp size={14} />, badge: b?.decor },
  { label: "Property Views", to: "/admin-portal#views",        icon: <Eye size={14} /> },
  { label: "Subscriptions",  to: "/admin-portal#subscriptions",icon: <ReceiptText size={14} /> },
  { label: "Transactions",   to: "/admin-portal#transactions", icon: <ReceiptText size={14} /> },
  { label: "Buyer Wallets",  to: "/admin-portal#credits",      icon: <Coins size={14} /> },
  { label: "Plans",          to: "/admin-portal#plans",        icon: <PackageOpen size={14} /> },

  // ── Intelligence ─────────────────────────────────────────────────────
  { label: "Reports",    to: "/admin-portal#reports",    icon: <BarChart2 size={14} />, group: "Intelligence" },
  { label: "Referrals",  to: "/admin-portal#referrals",  icon: <Gift size={14} /> },

  // ── Admin ─────────────────────────────────────────────────────────────
  { label: "Team Management",  to: "/admin-portal#team",         icon: <Users size={14} />,      group: "Admin" },
  { label: "Marketing",        to: "/admin-portal#marketing",    icon: <Megaphone size={14} /> },
  { label: "Push Notifications",to: "/admin-portal#push",        icon: <BellRing size={14} /> },
  { label: "Home Page Content",to: "/admin-portal#site-content", icon: <ImageIcon size={14} /> },
  { label: "Bulk Listings",    to: "/admin-portal#bulk-listings",icon: <UploadCloud size={14} /> },
  { label: "Dev Tools",        to: "/admin-portal#dev",          icon: <Building size={14} /> },
];

function renderTab(hash: string) {
  switch (hash) {
    case "enquiries":     return <EnquiriesTab />;
    case "team":          return <TeamTab />;
    case "listings":      return <ListingsTab />;
    case "agents":        return <AgentsTab />;
    case "leads":         return <LeadsTab />;
    case "crm":           return <CRMTab />;
    case "subscriptions": return <SubscriptionsTab />;
    case "views":         return <ViewsTab />;
    case "alerts":        return <AlertsTab />;
    case "escalations":   return <EscalationsTab />;
    case "marketing":     return <MarketingTab />;
    case "dev":           return <DevTab />;
    case "reports":       return <ReportsTab />;
    case "plans":         return <AdminPlansTab />;
    case "commissions":   return <CommissionsTab />;
    case "credits":       return <CreditsTab />;
    case "transactions":  return <TransactionsTab />;
    case "property-types": return <PropertyTypesTab />;
    case "push":          return <PushNotificationsTab />;
    case "seller-approvals": return <SellerApprovalsTab />;
    case "kyc":           return <KYCReviewTab />;
    case "site-content":  return <SiteContentTab />;
    case "referrals":     return <ReferralsTab />;
    case "reviews":       return <ReviewsTab />;
    case "interiors":     return <InteriorsTab />;
    case "decor":         return <DecorTab />;
    case "bulk-listings": return <BulkListingsTab />;
    default:              return <OperationsTab />;
  }
}

export default function AdminPortal() {
  const { session } = useAuth();
  const hash = useActiveHash();
  const ready = usePortalGuard();

  const badgesQ = trpc.admin.badgeCounts.useQuery(undefined, {
    enabled: ready && !!session,
    refetchInterval: 60_000,
  });

  if (!ready || !session) return null;

  const user = { name: session.name, initials: session.initials };

  return (
    <PortalShell
      brand="NxtSft.com Control"
      role="Admin"
      accent="red"
      user={user}
      nav={makeNav(badgesQ.data)}
      basePath="/admin-portal"
    >
      {renderTab(hash)}
    </PortalShell>
  );
}
