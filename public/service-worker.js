/**
 * RT2RP Service Worker — App Shell Cache v4.0.1
 * 
 * Caches static app-shell assets (JS, CSS, HTML) so the React app
 * can boot offline and hydrate trip data from IndexedDB.
 * 
 * Does NOT intercept Supabase API requests or dynamic data.
 */

const CACHE_NAME = 'rt2rp-shell-v1';

// Assets to pre-cache on install (the HTML shell + icons)
const PRECACHE_URLS = [
  '/',
  '/favicon.png',
  '/favicon.ico',
  '/rt2rp-logo.png',
];

// Patterns that should NEVER be cached
const BYPASS_PATTERNS = [
  /^https?:\/\/.*supabase/,       // Supabase API
  /\/rest\/v1\//,                   // Supabase REST
  /\/auth\/v1\//,                   // Supabase Auth
  /\/storage\/v1\//,                // Supabase Storage
  /\/functions\/v1\//,              // Edge Functions
  /\/realtime\//,                   // Supabase Realtime
  /^https?:\/\/api\./,             // External APIs
  /^https?:\/\/maps\./,            // Maps
  /^https?:\/\/.*openweather/,     // Weather
  /^https?:\/\/.*googleapis/,      // Google APIs
  /\.hot-update\./,                 // HMR
];

/**
 * Returns true if the request is for a static app-shell asset.
 */
function isShellAsset(url) {
  const { pathname } = new URL(url);
  // JS/CSS bundles produced by Vite
  if (pathname.startsWith('/assets/') && /\.(js|css|woff2?|ttf|eot|svg|png|jpg|webp|ico)$/.test(pathname)) {
    return true;
  }
  // Root HTML or precached statics
  if (pathname === '/' || pathname === '/index.html') return true;
  if (PRECACHE_URLS.some(p => pathname === p)) return true;
  return false;
}

/**
 * Returns true if the request should bypass the cache entirely.
 */
function shouldBypass(url) {
  return BYPASS_PATTERNS.some(pattern => pattern.test(url));
}

// ── Install: precache core shell ──
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// ── Activate: clean old caches ──
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key.startsWith('rt2rp-shell-') && key !== CACHE_NAME)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

// ── Fetch: cache-first for shell, passthrough for everything else ──
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle GET requests
  if (request.method !== 'GET') return;

  // Never intercept API / dynamic requests
  if (shouldBypass(request.url)) return;

  // Navigation requests → serve cached HTML shell as fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Cache the fresh HTML shell
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put('/', clone));
          return response;
        })
        .catch(() => caches.match('/'))
        .then(response => response || fetch(request))
    );
    return;
  }

  // Static shell assets → cache-first
  if (isShellAsset(request.url)) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request).then(response => {
          // Cache new build assets as they're discovered
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // Everything else: network passthrough (no interception)
});
