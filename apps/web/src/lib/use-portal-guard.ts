"use client";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { HOME_FOR_ROLE, canAccess, isStaffRoute } from "@/lib/routes";

/**
 * Client-side portal guard — the in-app mirror of the Edge middleware
 * (`src/middleware.ts`). The middleware is the real gate, but it can't see
 * client-only session state, so this prevents a wrong-role flash and bounces
 * the user even if the cookie/session ever drift apart.
 *
 *  - Still loading the session?      → render nothing (return false).
 *  - No session?                     → bounce to the right login.
 *  - Signed in but role not allowed? → bounce to that role's own home.
 *  - Otherwise                       → allowed (return true).
 */
export function usePortalGuard(): boolean {
  const { session, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    if (!session) {
      router.replace(isStaffRoute(pathname) ? "/admin-login" : "/login");
      return;
    }
    if (!canAccess(session.role, pathname)) {
      router.replace(HOME_FOR_ROLE[session.role]);
    }
  }, [loading, session, pathname, router]);

  return !loading && !!session && canAccess(session.role, pathname);
}
