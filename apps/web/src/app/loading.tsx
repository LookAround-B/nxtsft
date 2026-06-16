"use client";
import { usePathname } from "next/navigation";
import {
  HomePageLoadingPreset,
  MarketingPageLoadingPreset,
  ContactPageLoadingPreset,
  DocumentPageLoadingPreset,
  AuthPageLoadingPreset,
  DetailPageLoadingPreset,
  AgentsPageLoadingPreset,
  PricingPageLoadingPreset,
  ListPageLoadingPreset,
  ProfilePageLoadingPreset,
  PropertiesPageLoadingPreset,
  PropertyDetailPageLoadingPreset,
} from "@/components/ui/page-loading-presets";
import { PortalLoadingPreset } from "@/components/ui/portal-loading-preset";

/**
 * Single Suspense fallback for the whole app. Next.js uses this root
 * loading.tsx for every route that has no closer loading file, and we pick
 * the matching skeleton from the in-flight pathname. One file replaces the
 * 25 per-route loaders; each preset renders its own markup as the skeleton.
 *
 * Order matters: dynamic detail routes (`/properties/<slug>`) must be tested
 * before their listing parent (`/properties`).
 */
export default function Loading() {
  const pathname = usePathname() ?? "/";
  const is = (p: string) => pathname === p || pathname.startsWith(`${p}/`);

  // Portals
  if (is("/admin-portal")) return <PortalLoadingPreset navCount={13} statCount={4} />;
  if (is("/sa-portal")) return <PortalLoadingPreset navCount={15} statCount={4} />;
  if (is("/supervisor-portal")) return <PortalLoadingPreset navCount={8} statCount={4} />;
  if (is("/sales-portal")) return <PortalLoadingPreset navCount={8} statCount={4} />;
  if (is("/support-portal")) return <PortalLoadingPreset navCount={6} statCount={3} statCols={3} />;
  if (is("/user-portal")) return <PortalLoadingPreset navCount={11} statCount={3} statCols={3} />;

  // Auth
  if (is("/admin-login")) return <AuthPageLoadingPreset sidePanel={false} />;
  if (is("/login")) return <AuthPageLoadingPreset />;
  if (is("/register")) return <AuthPageLoadingPreset />;

  // Detail before listing
  if (pathname.startsWith("/properties/")) return <PropertyDetailPageLoadingPreset />;
  if (is("/properties")) return <PropertiesPageLoadingPreset />;
  if (pathname.startsWith("/agents/")) return <DetailPageLoadingPreset />;
  if (is("/agents")) return <AgentsPageLoadingPreset />;
  if (pathname.startsWith("/owners/")) return <DetailPageLoadingPreset />;

  // Documents
  if (is("/terms")) return <DocumentPageLoadingPreset />;
  if (is("/privacy")) return <DocumentPageLoadingPreset />;
  if (is("/cookie-policy")) return <DocumentPageLoadingPreset />;

  // Marketing
  if (is("/about")) return <MarketingPageLoadingPreset />;
  if (is("/refer")) return <MarketingPageLoadingPreset />;
  if (is("/fraud-advisory")) return <MarketingPageLoadingPreset />;

  // Standalone
  if (is("/contact")) return <ContactPageLoadingPreset />;
  if (is("/pricing")) return <PricingPageLoadingPreset />;
  if (is("/list")) return <ListPageLoadingPreset />;
  if (is("/profile")) return <ProfilePageLoadingPreset />;

  return <HomePageLoadingPreset />;
}
