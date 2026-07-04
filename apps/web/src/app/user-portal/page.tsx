"use client";
import {
  Heart,
  Building2,
  Calendar,
  Calculator,
  FileCheck,
  Settings2,
  CreditCard,
  Eye,
  Bell,
  Gift,
  PlusCircle,
  Users,
} from "lucide-react";
import { Home as HomeIcon } from "lucide-react";
import { PortalShell } from "@/components/portal/PortalShell";
import { useActiveHash } from "@/lib/use-active-hash";
import { useAuth } from "@/lib/auth";
import { usePortalGuard } from "@/lib/use-portal-guard";
import { OverviewDashboard } from "@/components/user-portal/tabs/OverviewDashboard";
import { SavedTab } from "@/components/user-portal/tabs/SavedTab";
import { MyListingsTab } from "@/components/user-portal/tabs/MyListingsTab";
import { RecentlyViewedTab } from "@/components/user-portal/tabs/RecentlyViewedTab";
import { CreditsTab } from "@/components/user-portal/tabs/CreditsTab";
import { ProfileTab } from "@/components/user-portal/tabs/ProfileTab";
import { SearchAlertsTab } from "@/components/user-portal/tabs/SearchAlertsTab";
import { SiteVisitsTab } from "@/components/user-portal/tabs/SiteVisitsTab";
import { EMICalcTab } from "@/components/user-portal/tabs/EMICalcTab";
import { KYCTab } from "@/components/user-portal/tabs/KYCTab";
import { ReferTab } from "@/components/user-portal/tabs/ReferTab";
import { SellerLeadsTab } from "@/components/user-portal/tabs/SellerLeadsTab";
import { SellerVisitsTab } from "@/components/user-portal/tabs/SellerVisitsTab";

export default function UserPortal() {
  const { session } = useAuth();
  const h = useActiveHash();
  const ready = usePortalGuard();

  if (!ready || !session) return null;

  // Agents list & manage properties like Home Sellers, so they get the same
  // seller-only tabs (Leads / Visits).
  const isSeller = session.role === "home-seller" || session.role === "agent";
  const nav = [
    { label: "Overview",         to: "/user-portal",          icon: <HomeIcon size={14} /> },
    { label: "Saved",            to: "/user-portal#saved",    icon: <Heart size={14} /> },
    { label: "Recently Viewed",  to: "/user-portal#viewed",   icon: <Eye size={14} /> },
    { label: "My Credits",       to: "/user-portal#credits",  icon: <CreditCard size={14} /> },
    { label: "Profile",          to: "/user-portal#profile",  icon: <Settings2 size={14} /> },
    { label: "Search Alerts",    to: "/user-portal#alerts",   icon: <Bell size={14} /> },
    { label: "My Listings",      to: "/user-portal#mylist",   icon: <Building2 size={14} /> },
    // Seller-only: buyers who enquired on / booked visits to their listings.
    ...(isSeller
      ? [
          { label: "Leads",  to: "/user-portal#leads",     icon: <Users size={14} /> },
          { label: "Visits", to: "/user-portal#propvisits", icon: <Calendar size={14} /> },
        ]
      : []),
    { label: "List a Property",  to: "/list",                 icon: <PlusCircle size={14} /> },
    { label: "Scheduled Tours",  to: "/user-portal#visits",   icon: <Calendar size={14} /> },
    { label: "EMI Calculator",   to: "/user-portal#emi",      icon: <Calculator size={14} /> },
    { label: "Documents (KYC)", to: "/user-portal#kyc",      icon: <FileCheck size={14} /> },
    { label: "Refer & Earn",     to: "/user-portal#refer",    icon: <Gift size={14} /> },
  ];

  const displayUser = { name: session.name, initials: session.initials };
  return (
    <PortalShell
      brand="NxtSft.com Home"
      role="End User"
      accent="red"
      user={displayUser}
      nav={nav}
      basePath="/user-portal"
    >
      {renderTab(h, session.email)}
    </PortalShell>
  );
}

function renderTab(h: string, userEmail: string) {
  switch (h) {
    case "saved":   return <SavedTab />;
    case "mylist":  return <MyListingsTab />;
    case "leads":   return <SellerLeadsTab />;
    case "propvisits": return <SellerVisitsTab />;
    case "credits": return <CreditsTab />;
    case "viewed":  return <RecentlyViewedTab />;
    case "visits":  return <SiteVisitsTab />;
    case "emi":     return <EMICalcTab />;
    case "kyc":     return <KYCTab />;
    case "profile": return <ProfileTab />;
    case "alerts":  return <SearchAlertsTab />;
    case "refer":   return <ReferTab />;
    default:        return <OverviewDashboard userEmail={userEmail} />;
  }
}
