// Service Worker — Kelassi PWA
// Cache strategy: network-first pour navigation, cache-first pour assets statiques
const VERSION = 'v2'
const CACHE_STATIC  = `kelassi-static-${VERSION}`
const CACHE_PAGES   = `kelassi-pages-${VERSION}`
const CACHE_IMAGES  = `kelassi-images-${VERSION}`

const ALL_CACHES = [CACHE_STATIC, CACHE_PAGES, CACHE_IMAGES]

// Shell applicatif à pré-cacher
const APP_SHELL = [
  '/offline',
  '/manifest.webmanifest',
]

// ─── INSTALL ────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_PAGES)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  )
})

// ─── ACTIVATE ───────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => !ALL_CACHES.includes(k))
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  )
})

// ─── FETCH ──────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Ignore les non-GET et les requêtes cross-origin (Supabase, API)
  if (request.method !== 'GET') return
  if (url.origin !== self.location.origin) return

  // 1. Assets Next.js immutables → cache-first avec TTL illimité
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(CACHE_STATIC, request))
    return
  }

  // 2. Images → cache-first (Supabase CDN déjà filtré ci-dessus)
  if (
    url.pathname.startsWith('/_next/image') ||
    /\.(png|jpg|jpeg|webp|svg|gif|ico)$/i.test(url.pathname)
  ) {
    event.respondWith(cacheFirst(CACHE_IMAGES, request))
    return
  }

  // 3. Navigation HTML → network-first, fallback offline
  if (request.mode === 'navigate') {
    event.respondWith(networkFirstWithOfflineFallback(request))
    return
  }

  // 4. Tout le reste → network only (API calls, etc.)
})

// ─── HELPERS ────────────────────────────────────────────────────────────────

async function cacheFirst(cacheName, request) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)
  if (cached) return cached

  const response = await fetch(request)
  if (response.ok) {
    cache.put(request, response.clone())
  }
  return response
}

async function networkFirstWithOfflineFallback(request) {
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(CACHE_PAGES)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    const cache = await caches.open(CACHE_PAGES)
    const cached = await cache.match(request)
    if (cached) return cached

    // Fallback vers la page offline
    const offline = await cache.match('/offline')
    return offline ?? new Response('Hors-ligne', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  }
}
