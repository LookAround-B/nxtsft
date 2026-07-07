import { router, publicProcedure } from "../server";

/**
 * Live follower/post counts scraped server-side from each platform's public
 * profile pages — no API tokens needed. All three platforms serve real
 * numbers to the `facebookexternalhit` crawler UA with an English locale
 * (verified 2026-07-06: IG "79 Followers … 149 Posts", FB "705 likes",
 * LinkedIn "43 followers"):
 *   Instagram — og:description "79 Followers, 178 Following, 149 Posts - …"
 *   Facebook  — og:description "… 705 likes · 26 talking about this. …"
 *   LinkedIn  — "43 followers" appears in the page body
 *
 * Values stay nullable (platforms can change markup or block an IP), and the
 * client keeps a hand-maintained fallback. Cached in-process for 24h; the
 * last good value survives a failed refresh.
 */

const HEADERS = {
  // Meta's link-preview crawler UA — all three platforms serve public
  // profile metadata to it, where a browser UA gets a login wall.
  "User-Agent": "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uaext.php)",
  "Accept-Language": "en-US,en;q=0.9",
  Accept: "text/html",
};

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8_000);
    const res = await fetch(url, { headers: HEADERS, signal: controller.signal });
    clearTimeout(timer);
    return res.ok ? await res.text() : null;
  } catch {
    return null;
  }
}

const pick = (text: string | null, re: RegExp): string | null => text?.match(re)?.[1] ?? null;

// The page's own og:description — parse counts from this, not the full HTML,
// which embeds unrelated counts (suggested profiles, reels, script JSON)
// that would match first.
const ogDescription = (html: string | null): string | null =>
  pick(html, /<meta[^>]+property="og:description"[^>]+content="([^"]*)"/i) ??
  pick(html, /<meta[^>]+content="([^"]*)"[^>]+property="og:description"/i) ??
  pick(html, /<meta[^>]+name="description"[^>]+content="([^"]*)"/i);

export type SocialCounts = { followers: string | null; posts: string | null };
export type SocialStats = {
  instagram: SocialCounts;
  facebook: SocialCounts;
  linkedin: SocialCounts;
};

const COUNT = "([\\d.,]+[KkMm]?)";

async function scrape(): Promise<SocialStats> {
  const [igHtml, fbHtml, liHtml] = await Promise.all([
    fetchHtml("https://www.instagram.com/nxtsft/"),
    fetchHtml("https://www.facebook.com/share/1FCiksdpRP/"),
    fetchHtml("https://www.linkedin.com/company/truenxtsft/"),
  ]);
  const ig = ogDescription(igHtml);
  const fb = ogDescription(fbHtml);
  return {
    instagram: {
      followers: pick(ig, new RegExp(`${COUNT}\\s+Followers`, "i")),
      posts: pick(ig, new RegExp(`${COUNT}\\s+Posts`, "i")),
    },
    facebook: {
      // Page "likes" is FB's public proxy for followers.
      followers: pick(fb, new RegExp(`${COUNT}\\s+(?:followers|likes)`, "i")),
      posts: null,
    },
    linkedin: {
      // LinkedIn's og:description omits the count; it appears in the body.
      followers: pick(liHtml, new RegExp(`${COUNT}\\s+followers`, "i")),
      posts: null,
    },
  };
}

const TTL_MS = 24 * 60 * 60 * 1000;
let cache: { data: SocialStats; at: number } | null = null;

export const socialRouter = router({
  stats: publicProcedure.query(async (): Promise<SocialStats> => {
    if (cache && Date.now() - cache.at < TTL_MS) return cache.data;
    const fresh = await scrape();
    const last = cache?.data;
    // Keep the last good value for any field the refresh failed to read.
    const merged: SocialStats = {
      instagram: {
        followers: fresh.instagram.followers ?? last?.instagram.followers ?? null,
        posts: fresh.instagram.posts ?? last?.instagram.posts ?? null,
      },
      facebook: {
        followers: fresh.facebook.followers ?? last?.facebook.followers ?? null,
        posts: null,
      },
      linkedin: {
        followers: fresh.linkedin.followers ?? last?.linkedin.followers ?? null,
        posts: null,
      },
    };
    cache = { data: merged, at: Date.now() };
    return merged;
  }),
});
