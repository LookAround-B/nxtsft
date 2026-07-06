"use client";
import {
  LayoutDashboard,
  Users,
  Settings2,
  BarChart3,
  BarChart2,
  ClipboardList,
  Cpu,
  Bell,
  FileText,
  Shield,
  CreditCard,
  Users2,
  PackageOpen,
  Inbox,
  LayoutGrid,
  Target,
  Kanban,
  Building2,
  ReceiptText,
  Eye,
  BellRing,
  Megaphone,
  Building,
  Wallet,
  Coins,
  UserCheck,
  ShieldCheck,
  Image as ImageIcon,
  Sofa,
  Lamp,
  Star,
  Gift,
  Contact,
  UploadCloud,
} from "lucide-react";
import { PortalShell } from "@/components/portal/PortalShell";
import { trpc } from "@/lib/trpc";
import { useActiveHash } from "@/lib/use-active-hash";
import type { BadgeCounts } from "@/components/admin-portal/tabs/shared";
import { useAuth } from "@/lib/auth";
import { usePortalGuard } from "@/lib/use-portal-guard";
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
// Operational tabs surfaced from the admin portal so super-admin gets the full superset.
import { OperationsTab } from "@/components/admin-portal/tabs/OperationsTab";
import { EnquiriesTab } from "@/components/admin-portal/tabs/EnquiriesTab";
import { LeadsTab } from "@/components/admin-portal/tabs/LeadsTab";
import { CRMTab } from "@/components/admin-portal/tabs/CRMTab";
import { ListingsTab } from "@/components/admin-portal/tabs/ListingsTab";
import { SubscriptionsTab } from "@/components/admin-portal/tabs/SubscriptionsTab";
import { ViewsTab } from "@/components/admin-portal/tabs/ViewsTab";
import { AlertsTab } from "@/components/admin-portal/tabs/AlertsTab";
import { MarketingTab } from "@/components/admin-portal/tabs/MarketingTab";
import { DevTab } from "@/components/admin-portal/tabs/DevTab";
import { CommissionsTab } from "@/components/admin-portal/tabs/CommissionsTab";
import { CreditsTab } from "@/components/admin-portal/tabs/CreditsTab";
import { SellerApprovalsTab } from "@/components/admin-portal/tabs/SellerApprovalsTab";
import { KYCReviewTab } from "@/components/admin-portal/tabs/KYCReviewTab";
import { SiteContentTab } from "@/components/admin-portal/tabs/SiteContentTab";
import { InteriorsTab } from "@/components/admin-portal/tabs/InteriorsTab";
import { TeamTab } from "@/components/admin-portal/tabs/TeamTab";
import { AgentsTab } from "@/components/admin-portal/tabs/AgentsTab";
import { ReviewsTab } from "@/components/admin-portal/tabs/ReviewsTab";
import { DecorTab } from "@/components/admin-portal/tabs/DecorTab";
import { ReferralsTab } from "@/components/admin-portal/tabs/ReferralsTab";
import { BulkListingsTab } from "@/components/admin-portal/tabs/BulkListingsTab";

// ─────────────────────────────────────────────────────────────────────────
// Grouped nav — mirrors the admin portal's section structure (source of
// truth for relative tab order). Super-admin gets the full superset: every
// admin-portal tab plus the super-admin-only tabs slotted into the same
// groups, with "Super Admin" holding platform-level controls.
// Badges come from admin.badgeCounts (hidden while loading or when 0).
// ─────────────────────────────────────────────────────────────────────────
const makeNav = (b?: BadgeCounts) => [
  // ── Overview ─────────────────────────────────────────────────────────
  { label: "Command Dashboard", to: "/sa-portal",           icon: <LayoutDashboard size={14} />, group: "Overview" },
  { label: "Global Analytics",  to: "/sa-portal#analytics", icon: <BarChart3 size={14} /> },
  { label: "Operations",        to: "/sa-portal#operations",icon: <LayoutGrid size={14} /> },

  // ── Sales & CRM ──────────────────────────────────────────────────────
  { label: "CRM Pipeline",    to: "/sa-portal#crm",         icon: <Kanban size={14} />, group: "Sales & CRM" },
  { label: "Lead Management", to: "/sa-portal#leads",       icon: <Target size={14} /> },
  { label: "Commissions",     to: "/sa-portal#commissions", icon: <Wallet size={14} /> },

  // ── Customer Service ─────────────────────────────────────────────────
  { label: "Contact Enquiries", to: "/sa-portal#enquiries",       icon: <Inbox size={14} />, group: "Customer Service", badge: b?.enquiries },
  { label: "KYC Review",        to: "/sa-portal#kyc",             icon: <ShieldCheck size={14} />, badge: b?.kyc },
  { label: "Seller Approvals",  to: "/sa-portal#seller-approvals",icon: <UserCheck size={14} />, badge: b?.sellerApprovals },
  { label: "Support Tickets",   to: "/sa-portal#tickets",         icon: <FileText size={14} /> },
  { label: "Click Alerts",      to: "/sa-portal#alerts",          icon: <BellRing size={14} /> },

  // ── Platform ─────────────────────────────────────────────────────────
  { label: "Listings",        to: "/sa-portal#listings",     icon: <Building2 size={14} />, group: "Platform", badge: b?.listings },
  { label: "Agents",          to: "/sa-portal#agents",       icon: <Contact size={14} /> },
  { label: "Reviews",         to: "/sa-portal#reviews",      icon: <Star size={14} />, badge: b?.reviews },
  { label: "Home Interiors",  to: "/sa-portal#interiors",    icon: <Sofa size={14} />, badge: b?.interiors },
  { label: "Decors",          to: "/sa-portal#decor",        icon: <Lamp size={14} />, badge: b?.decor },
  { label: "Property Views",  to: "/sa-portal#views",        icon: <Eye size={14} /> },
  { label: "Subscriptions",   to: "/sa-portal#subscriptions",icon: <ReceiptText size={14} /> },
  { label: "Buyer Wallets",   to: "/sa-portal#credits",      icon: <Coins size={14} /> },
  { label: "Plans Manager",   to: "/sa-portal#plans",        icon: <PackageOpen size={14} /> },
  { label: "Billing & Revenue", to: "/sa-portal#bill",       icon: <CreditCard size={14} /> },

  // ── Intelligence ─────────────────────────────────────────────────────
  { label: "Reports",     to: "/sa-portal#reports",   icon: <BarChart2 size={14} />, group: "Intelligence" },
  { label: "Referrals",   to: "/sa-portal#referrals", icon: <Gift size={14} /> },
  { label: "Audit Trail", to: "/sa-portal#audit",     icon: <ClipboardList size={14} /> },

  // ── Admin ─────────────────────────────────────────────────────────────
  { label: "Team Management",   to: "/sa-portal#team",         icon: <Users size={14} />, group: "Admin" },
  { label: "Marketing",         to: "/sa-portal#marketing",    icon: <Megaphone size={14} /> },
  { label: "Home Page Content", to: "/sa-portal#site-content", icon: <ImageIcon size={14} /> },
  { label: "Bulk Listings",     to: "/sa-portal#bulk-listings",icon: <UploadCloud size={14} /> },
  { label: "Dev Tools",         to: "/sa-portal#developers",   icon: <Building size={14} /> },

  // ── Super Admin ──────────────────────────────────────────────────────
  { label: "User Management",  to: "/sa-portal#users",       icon: <Users2 size={14} />, group: "Super Admin" },
  { label: "All Teams",        to: "/sa-portal#teams",       icon: <Users2 size={14} /> },
  { label: "Role Permissions", to: "/sa-portal#permissions", icon: <Shield size={14} /> },
  { label: "Notifications",    to: "/sa-portal#notify",      icon: <Bell size={14} /> },
  { label: "Content CMS",      to: "/sa-portal#cms",         icon: <FileText size={14} /> },
  { label: "AI Model Control", to: "/sa-portal#ai",          icon: <Cpu size={14} /> },
  { label: "Security Console", to: "/sa-portal#sec",         icon: <Shield size={14} /> },
  { label: "Platform Config",  to: "/sa-portal#config",      icon: <Settings2 size={14} /> },
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
    // Operations superset (shared with the admin portal)
    case "operations":
      return <OperationsTab />;
    case "enquiries":
      return <EnquiriesTab />;
    case "leads":
      return <LeadsTab />;
    case "crm":
      return <CRMTab />;
    case "listings":
      return <ListingsTab />;
    case "agents":
      return <AgentsTab />;
    case "reviews":
      return <ReviewsTab />;
    case "interiors":
      return <InteriorsTab />;
    case "decor":
      return <DecorTab />;
    case "referrals":
      return <ReferralsTab />;
    case "team":
      return <TeamTab />;
    case "bulk-listings":
      return <BulkListingsTab />;
    case "subscriptions":
      return <SubscriptionsTab />;
    case "views":
      return <ViewsTab />;
    case "alerts":
      return <AlertsTab />;
    case "marketing":
      return <MarketingTab />;
    case "developers":
      return <DevTab />;
    case "commissions":
      return <CommissionsTab />;
    case "credits":
      return <CreditsTab />;
    case "seller-approvals":
      return <SellerApprovalsTab />;
    case "kyc":
      return <KYCReviewTab />;
    case "site-content":
      return <SiteContentTab />;
    default:
      return <Dashboard />;
  }
}

export default function SAPortal() {
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
      brand="NxtSft.com Command"
      role="Super Admin"
      accent="gold"
      user={user}
      nav={makeNav(badgesQ.data)}
      basePath="/sa-portal"
    >
      {renderTab(hash)}
    </PortalShell>
  );
}
