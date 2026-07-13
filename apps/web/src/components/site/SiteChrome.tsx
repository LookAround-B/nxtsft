"use client";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { InstallBanner } from "@/components/site/InstallBanner";
import { VerifyPhoneBanner } from "@/components/site/VerifyPhoneBanner";

// Routes that render their own shell (PortalShell / bare auth) — no public chrome.
const NO_CHROME_PREFIXES = [
  "/sa-portal",
  "/admin-portal",
  "/supervisor-portal",
  "/sales-portal",
  "/support-portal",
  "/user-portal",
  "/admin-login",
  "/boneyard",
];

export function SiteChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const bare = NO_CHROME_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (bare) return <>{children}</>;

  return (
    <>
      <InstallBanner />
      <VerifyPhoneBanner />
      <SiteHeader />
      {children}
      <SiteFooter />
    </>
  );
}
