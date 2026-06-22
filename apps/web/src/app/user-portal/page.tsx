"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
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
} from "lucide-react";
import { Home as HomeIcon } from "lucide-react";
import { PortalShell } from "@/components/portal/PortalShell";
import { useActiveHash } from "@/lib/use-active-hash";
import { useAuth } from "@/lib/auth";
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

export default function UserPortal() {
  const { session } = useAuth();
  const router = useRouter();
  const h = useActiveHash();

  useEffect(() => {
    if (!session) router.push("/login");
  }, [session, router]);

  if (!session) return null;

  const isSeller = session.role === "home-seller";
  const nav = [
    { label: "Overview",         to: "/user-portal",          icon: <HomeIcon size={14} /> },
    { label: "Saved",            to: "/user-portal#saved",    icon: <Heart size={14} /> },
    { label: "Recently Viewed",  to: "/user-portal#viewed",   icon: <Eye size={14} /> },
    { label: "My Credits",       to: "/user-portal#credits",  icon: <CreditCard size={14} /> },
    { label: "Profile",          to: "/user-portal#profile",  icon: <Settings2 size={14} /> },
    { label: "Search Alerts",    to: "/user-portal#alerts",   icon: <Bell size={14} /> },
    ...(isSeller ? [{ label: "My Listings", to: "/user-portal#mylist", icon: <Building2 size={14} /> }] : []),
    { label: "Site Visits",      to: "/user-portal#visits",   icon: <Calendar size={14} /> },
    { label: "EMI Calculator",   to: "/user-portal#emi",      icon: <Calculator size={14} /> },
    { label: "Documents (KYC)",  to: "/user-portal#kyc",      icon: <FileCheck size={14} /> },
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
    case "credits": return <CreditsTab />;
    case "viewed":  return <RecentlyViewedTab />;
    case "visits":  return <SiteVisitsTab />;
    case "emi":     return <EMICalcTab />;
    case "kyc":     return <KYCTab />;
    case "profile": return <ProfileTab />;
    case "alerts":  return <SearchAlertsTab />;
    default:        return <OverviewDashboard userEmail={userEmail} />;
  }
}
