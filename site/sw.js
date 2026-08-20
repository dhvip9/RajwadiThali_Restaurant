/* ==========================================================================
   Rajwadi Thali — service worker

   This exists so the site can be INSTALLED as an app. A manifest alone is not
   enough: Chrome and Edge only offer the install prompt once a service worker
   with a fetch handler is controlling the page. It also means an installed
   copy opens instantly and still shows something useful with no signal, which
   is the difference between an app and a bookmark that fails.

   CACHING STRATEGY — deliberately conservative for a static site:

     navigations   network first, then the SAME page from cache, then the
                   offline page. A menu or a price must never be served stale
                   from a week-old cache just because the network was slow --
                   and the cached copy must be the same document, not merely
                   one with a matching path (see the navigation handler).
     assets        cache first on an EXACT url match, network otherwise.

   The exactness matters. Every asset is linked with a content-hash query
   (styles.css?v=235f53ea), so the query is the cache key: a new hash misses
   and fetches fresh, an unchanged one hits instantly. Matching with
   `ignoreSearch` here would let the precached "styles.css" answer a request
   for "styles.css?v=<new>" and serve the OLD file after every deploy -- the
   exact staleness the content hashes exist to prevent.

   `ignoreSearch` is therefore used in one place only: the OFFLINE fallback,
   where the precached unhashed copy is what makes the shell useful with no
   network, and a slightly stale stylesheet beats an unstyled page.

   BUMP CACHE_VERSION when the shell list changes. Old caches are deleted on
   activate, so a bump is the clean way to evict everything at once.
   ========================================================================== */

const CACHE_VERSION = 'v16';
const SHELL_CACHE = 'rajwadi-shell-' + CACHE_VERSION;
const RUNTIME_CACHE = 'rajwadi-runtime-' + CACHE_VERSION;
const OFFLINE_URL = 'offline.html';

/* Listed WITHOUT the ?v= query on purpose -- see ignoreSearch above. */
const SHELL = [
  './',
  'index.html',
  'accessibility.html',
  'allergens.html',
  'privacy.html',
  'terms.html',
  'offline.html',
  'assets/css/styles.css',
  'assets/js/main.js',
  'assets/img/logo.webp',
  /* The menu page itself, but deliberately NOT its sixteen photos. It links
     them by path rather than embedding, and every one of them also appears on
     the home page — so anyone who has browsed the site already has them in the
     runtime cache, and precaching them here would add ~500KB to the install
     for a second copy. The trade is that a visitor whose very first action is
     to open the menu with no signal gets the text and prices without the
     pictures, which is the right way round for a menu. */
  'menu.html',
  'assets/img/icon-192.png',
  'assets/img/icon-512.png',
  'favicon.ico',
  'site.webmanifest'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL_CACHE);
    /* addAll() is atomic -- one 404 and the whole install fails, which would
       leave the site permanently uninstallable. Add them individually and let
       a missing optional file be survivable. */
    await Promise.all(SHELL.map((url) =>
      cache.add(new Request(url, { cache: 'reload' })).catch(() => {})
    ));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keep = [SHELL_CACHE, RUNTIME_CACHE];
    const names = await caches.keys();
    await Promise.all(names.map((n) => keep.includes(n) ? null : caches.delete(n)));
    /* Navigation preload lets the browser start the network request in
       parallel with booting this worker, so network-first costs nothing. */
    if (self.registration.navigationPreload) {
      await self.registration.navigationPreload.enable();
    }
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  /* Never touch anything but same-origin GETs: cross-origin is the Google
     Fonts CSS and the order-online links, which must go straight to network. */
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      /* Cached under the PATH, never under the full URL. A page reached as
         ?utm_source=..., ?fbclid=..., or any other tracking query is the same
         document, and storing one entry per query turns the cache into a pile
         of near-identical copies of the same page -- which is what made the
         fallback below dangerous. */
      const canonical = new Request(new URL(req.url).pathname, { credentials: 'same-origin' });
      try {
        const preload = await event.preloadResponse;
        if (preload) {
          putSafe(RUNTIME_CACHE, canonical, preload.clone());
          return preload;
        }
        const fresh = await fetch(req);
        putSafe(RUNTIME_CACHE, canonical, fresh.clone());
        return fresh;
      } catch (e) {
        /* THE FALLBACK MUST BE THE SAME PAGE, NOT A SIMILAR ONE.

           This matched with ignoreSearch, which does not mean "ignore the
           cache-buster" -- it means any cached entry whose path matches will
           do. One flaky request for /index.html?x=2 was answered with a copy
           of /index.html?x=1 saved at some arbitrary earlier point, and since
           that HTML names its stylesheet and script by content hash, and those
           old hashed files were still sitting in the runtime cache, the whole
           stale set got served together. The page came up looking fine and was
           weeks out of date.

           Exact path only, then the offline shell. A page that is honestly
           offline is recoverable; a page silently running last month's code is
           not. */
        return (await caches.match(canonical))
            || (await caches.match(OFFLINE_URL, { ignoreSearch: true }))
            || Response.error();
      }
    })());
    return;
  }

  /* ---- assets ----
     EXACT match, never ignoreSearch. Every asset is linked with a content
     hash (styles.css?v=235f53ea), so the query IS the cache key: a new hash
     misses and fetches fresh, an unchanged one hits and is instant. Matching
     loosely here would let the precached "styles.css" answer a request for
     "styles.css?v=<new>" and serve the OLD file after every deploy -- the
     exact staleness the hashes exist to prevent.

     ignoreSearch survives only as the OFFLINE fallback, where a stale version
     of a stylesheet is plainly better than an unstyled page. */
  event.respondWith((async () => {
    const exact = await caches.match(req);
    if (exact) {
      /* unhashed files (images, the manifest) have no version in their URL, so
         refresh them in the background -- hashed ones can never go stale */
      if (!new URL(req.url).searchParams.has('v')) {
        fetch(req).then((res) => putSafe(RUNTIME_CACHE, req, res)).catch(() => {});
      }
      return exact;
    }
    try {
      const res = await fetch(req);
      putSafe(RUNTIME_CACHE, req, res.clone());
      /* A new hash for a file supersedes every older hash of that same file.
         Without this the runtime cache keeps one copy per version FOREVER --
         it had eleven stylesheets and nine scripts in it during development --
         and every one of them stays available for something to serve by
         mistake. Evicting the moment a newer one lands means there is only
         ever one answer to "what is main.js". */
      evictOlder(RUNTIME_CACHE, req);
      return res;
    } catch (e) {
      /* Deliberately NOT ignoreSearch: see the navigation handler. A hashed
         asset that is missing has to fail rather than be answered with a
         different version of itself. */
      return Response.error();
    }
  })());
});

/* Drop other cached versions of the same path, keeping the one just stored. */
async function evictOlder(cacheName, req) {
  try {
    const url = new URL(req.url);
    if (!url.searchParams.has('v')) return;
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    await Promise.all(keys.map((k) => {
      const ku = new URL(k.url);
      if (ku.pathname !== url.pathname) return null;
      if (ku.search === url.search) return null;
      return cache.delete(k);
    }));
  } catch (e) { /* eviction is housekeeping; never let it break a response */ }
}

/* Opaque and error responses are not worth storing, and a failed put must
   never reject the response the page is waiting on. */
function putSafe(cacheName, req, res) {
  if (!res || !res.ok || res.type === 'opaque') return;
  caches.open(cacheName).then((c) => c.put(req, res)).catch(() => {});
}

/* Lets the page tell a waiting worker to take over immediately. */
self.addEventListener('message', (event) => {
  if (event.data === 'skip-waiting') self.skipWaiting();
});
