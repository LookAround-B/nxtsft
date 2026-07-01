/**
 * Canonical absolute base URL for the site — the single source of truth for
 * sitemap, robots, canonical tags, Open Graph, and JSON-LD.
 *
 * The apex (nxtsft.com) 308-redirects to www in the hosting config, so www is
 * the canonical host. Keeping every SEO surface on this exact origin avoids
 * per-URL redirects in the sitemap and mixed canonical signals. Override via
 * NEXT_PUBLIC_SITE_URL if the canonical host ever changes.
 */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.nxtsft.com";
