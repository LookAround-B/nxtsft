import type { MetadataRoute } from "next";
import { PORTAL_ACCESS, LOGIN_ROUTES } from "@/lib/routes";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  // Keep private, auth-gated, and transactional routes out of the index. Portal
  // prefixes and login routes come from the routing source of truth (routes.ts)
  // so this can't drift as portals are added. /api and Next internals are
  // non-content and never worth crawling.
  const disallow = [
    "/api/",
    "/_next/",
    ...Object.keys(PORTAL_ACCESS), // /sa-portal, /admin-portal, /supervisor-portal, /sales-portal, /support-portal, /user-portal
    ...LOGIN_ROUTES, // /login, /admin-login, /register
    "/profile",
    "/list", // listing wizard sits behind a home-seller login
    "/payment",
  ];

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow,
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
