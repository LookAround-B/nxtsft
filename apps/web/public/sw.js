/* NxtSft Service Worker — network-first with offline fallback */

const CACHE = 'nxtsft-v1';

// Shell pages to precache so portals are available offline
const PRECACHE = [
  '/',
  '/user-portal',
  '/admin-portal',
  '/sa-portal',
  '/supervisor-portal',
  '/sales-portal',
  '/properties',
  '/refer',
  '/manifest.json',
];

// ── Install: precache portal shells ──────────────────────────────
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((cache) =>
      // addAll ignores failures — if a portal page 404s during build that's OK
      Promise.allSettled(PRECACHE.map((url) => cache.add(url)))
    )
  );
  self.skipWaiting();
});

// ── Activate: wipe old cache versions ────────────────────────────
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ── Fetch: network first, fall back to cache ──────────────────────
self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);

  // Only handle same-origin GET requests
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;

  // Never intercept tRPC / API calls — always go to network
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/trpc/')) return;

  // Next.js HMR websocket (dev only)
  if (url.pathname.startsWith('/_next/webpack-hmr')) return;

  // Static assets (_next/static, images, fonts): cache first
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/fonts/') ||
    /\.(png|jpg|jpeg|webp|gif|svg|ico|woff2?|ttf|eot)$/.test(url.pathname)
  ) {
    e.respondWith(
      caches.match(req).then(
        (cached) =>
          cached ||
          fetch(req).then((res) => {
            if (res.ok) {
              const clone = res.clone();
              caches.open(CACHE).then((c) => c.put(req, clone));
            }
            return res;
          })
      )
    );
    return;
  }

  // Everything else (HTML pages): network first, cache fallback
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(req, clone));
        }
        return res;
      })
      .catch(() => caches.match(req))
  );
});

// ── Push notifications ────────────────────────────────────────────
self.addEventListener('push', (e) => {
  if (!e.data) return;
  let data;
  try { data = e.data.json(); } catch { return; }

  e.waitUntil(
    self.registration.showNotification(data.title || 'NxtSft', {
      body: data.body || '',
      icon: '/logo.png',
      badge: '/logo.png',
      image: data.image || undefined,
      tag: data.tag || 'nxtsft',
      data: { url: data.url || '/' },
    })
  );
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window' }).then((windowClients) => {
      const url = e.notification.data?.url || '/';
      for (const client of windowClients) {
        if (client.url === url && 'focus' in client) return client.focus();
      }
      return clients.openWindow(url);
    })
  );
});
