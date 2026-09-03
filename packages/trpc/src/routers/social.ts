import prisma from "@nxtsft/db";
import { router, publicProcedure } from "../server";

/**
 * Live follower/post counts for the footer's social hover cards.
 *
 * Two sources, in priority order:
 *   1. Instagram Graph API — used when IG_USER_ID + IG_GRAPH_TOKEN are set.
 *      The only source that works from a datacenter IP; Instagram serves a
 *      login wall to Vercel's egress, so the scrape below returns null there.
 *   2. Public profile scrape — no tokens, works from residential IPs.
 *      Verified 2026-09-02: IG og:description "1,140 Followers, 180
 *      Following, 183 Posts", FB "1,679 likes", LinkedIn "162 followers".
 *
 * Whatever is read gets persisted to SiteSetting["social_stats"], so the last
 * good number survives cold starts, deploys and a blocked platform — the
 * in-process cache this used to rely on did not, which is why the footer sat
 * on its hardcoded fallbacks in production.
 */

const SETTING_KEY = "social_stats";
const TTL_MS = 6 * 60 * 60 * 1000; // refresh at most every 6h
const MEMO_MS = 5 * 60 * 1000; // skip the DB read for 5m per instance
const TIMEOUT_MS = 20_000; // a cold Instagram fetch measured 6.2s; 8s was too tight
const HEAD_LIMIT_BYTES = 512 * 1024; // hard stop if a page never closes its <head>

const HEADERS = {
  // Meta's link-preview crawler UA — the platforms serve public profile
  // metadata to it, where a browser UA gets a login wall.
  "User-Agent": "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uaext.php)",
  "Accept-Language": "en-US,en;q=0.9",
  Accept: "text/html",
};

async function fetchText(url: string, headers: Record<string, string>): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const res = await fetch(url, { headers, signal: controller.signal });
    clearTimeout(timer);
    return res.ok ? await res.text() : null;
  } catch {
    return null;
  }
}

/**
 * Read only as far as `</head>` and stop.
 *
 * Instagram's profile page is ~790KB and a cold fetch measured 6.2s wall —
 * inside an 8s budget it was a coin flip, which is why production kept
 * returning null for Instagram while the smaller FB/LinkedIn pages worked.
 * The counts live in a `<meta>` tag a few KB in, so the body is cancelled as
 * soon as the head closes; that turns a 790KB read into roughly 30KB.
 */
async function fetchHtml(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { headers: HEADERS, signal: controller.signal });
    if (!res.ok || !res.body) {
      console.warn(`[social] ${url} -> HTTP ${res.status}`);
      return null;
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let html = "";
    while (html.length < HEAD_LIMIT_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;
      html += decoder.decode(value, { stream: true });
      if (/<\/head>/i.test(html)) break;
    }
    void reader.cancel().catch(() => {});
    return html;
  } catch (err) {
    console.warn(`[social] ${url} failed:`, err instanceof Error ? err.message : err);
    return null;
  } finally {
    clearTimeout(timer);
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

const EMPTY: SocialStats = {
  instagram: { followers: null, posts: null },
  facebook: { followers: null, posts: null },
  linkedin: { followers: null, posts: null },
};

const COUNT = "([\\d.,]+[KkMm]?)";

// Graph returns plain integers; the scrape returns "1,140". Group both the
// same way so the card doesn't change format when the source flips.
const group = (n: number): string => n.toLocaleString("en-IN");

/** Instagram Business/Creator counts via the Graph API. Null when unconfigured. */
async function instagramGraph(): Promise<SocialCounts | null> {
  const id = process.env.IG_USER_ID;
  const token = process.env.IG_GRAPH_TOKEN;
  if (!id || !token) return null;
  const url =
    `https://graph.facebook.com/v21.0/${encodeURIComponent(id)}` +
    `?fields=followers_count,media_count&access_token=${encodeURIComponent(token)}`;
  const body = await fetchText(url, { Accept: "application/json" });
  if (!body) return null;
  try {
    const json = JSON.parse(body) as { followers_count?: number; media_count?: number };
    const followers = typeof json.followers_count === "number" ? group(json.followers_count) : null;
    const posts = typeof json.media_count === "number" ? group(json.media_count) : null;
    return followers || posts ? { followers, posts } : null;
  } catch {
    return null;
  }
}

async function scrape(): Promise<SocialStats> {
  const [graphIg, igHtml, fbHtml, liHtml] = await Promise.all([
    instagramGraph(),
    fetchHtml("https://www.instagram.com/nxtsft/"),
    fetchHtml("https://www.facebook.com/share/1FCiksdpRP/"),
    fetchHtml("https://www.linkedin.com/company/truenxtsft/"),
  ]);
  const ig = ogDescription(igHtml);
  const fb = ogDescription(fbHtml);
  return {
    instagram: graphIg ?? {
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

type Stored = SocialStats & { refreshedAt?: string };

const asCounts = (v: unknown): SocialCounts => {
  const o = (v ?? {}) as Record<string, unknown>;
  return {
    followers: typeof o.followers === "string" ? o.followers : null,
    posts: typeof o.posts === "string" ? o.posts : null,
  };
};

const parseStored = (value: unknown): Stored => {
  const o = (value ?? {}) as Record<string, unknown>;
  return {
    instagram: asCounts(o.instagram),
    facebook: asCounts(o.facebook),
    linkedin: asCounts(o.linkedin),
    refreshedAt: typeof o.refreshedAt === "string" ? o.refreshedAt : undefined,
  };
};

/** Fresh values win; a field the refresh failed to read keeps its last good value. */
const merge = (fresh: SocialStats, last: SocialStats): SocialStats => ({
  instagram: {
    followers: fresh.instagram.followers ?? last.instagram.followers,
    posts: fresh.instagram.posts ?? last.instagram.posts,
  },
  facebook: { followers: fresh.facebook.followers ?? last.facebook.followers, posts: null },
  linkedin: { followers: fresh.linkedin.followers ?? last.linkedin.followers, posts: null },
});

const strip = ({ instagram, facebook, linkedin }: Stored): SocialStats => ({
  instagram,
  facebook,
  linkedin,
});

// One refresh at a time per instance; concurrent callers share the result.
let inFlight: Promise<SocialStats> | null = null;
// Per-instance memo so a page full of footers doesn't hit the DB each render.
let memo: { data: SocialStats; at: number } | null = null;

async function refresh(last: Stored): Promise<SocialStats> {
  const merged = merge(await scrape(), strip(last));
  const value = { ...merged, refreshedAt: new Date().toISOString() };
  await prisma.siteSetting.upsert({
    where: { key: SETTING_KEY },
    create: { key: SETTING_KEY, value },
    update: { value },
  });
  return merged;
}

export const socialRouter = router({
  stats: publicProcedure.query(async (): Promise<SocialStats> => {
    if (memo && Date.now() - memo.at < MEMO_MS) return memo.data;

    let stored: Stored = { ...EMPTY };
    try {
      const row = await prisma.siteSetting.findUnique({ where: { key: SETTING_KEY } });
      if (row) stored = parseStored(row.value);
    } catch {
      // DB unreachable — fall through to a live scrape rather than 500 the footer.
    }

    const age = stored.refreshedAt ? Date.now() - Date.parse(stored.refreshedAt) : Infinity;
    if (Number.isFinite(age) && age < TTL_MS) {
      memo = { data: strip(stored), at: Date.now() };
      return memo.data;
    }

    // Stale: refresh, but never let a scrape or write failure break the footer.
    inFlight ??= refresh(stored)
      .catch(() => strip(stored))
      .finally(() => {
        inFlight = null;
      });

    // A refresh can take ~20s (Facebook is the slow one). Only the very first
    // request, with nothing stored yet, waits for it; once any value exists we
    // serve it and let the refresh land for the next caller.
    if (stored.refreshedAt) {
      void inFlight;
      return strip(stored);
    }

    const data = await inFlight;
    memo = { data, at: Date.now() };
    return data;
  }),
});
