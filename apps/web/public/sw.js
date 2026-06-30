// Service Worker — Kelassi PWA
// Cache strategy: network-first pour navigation, cache-first pour assets statiques
// v3: ajout cache PDFs Supabase Storage (offline /cours)
const VERSION = 'v3'
const CACHE_STATIC  = `kelassi-static-${VERSION}`
const CACHE_PAGES   = `kelassi-pages-${VERSION}`
const CACHE_IMAGES  = `kelassi-images-${VERSION}`
const CACHE_PDFS    = `kelassi-pdfs-${VERSION}`

const ALL_CACHES = [CACHE_STATIC, CACHE_PAGES, CACHE_IMAGES, CACHE_PDFS]

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

  if (request.method !== 'GET') return

  // 1. PDFs et fichiers Supabase Storage → Cache-First (économise la data mobile)
  if (url.hostname.includes('supabase.co') && url.pathname.includes('/storage/')) {
    event.respondWith(cacheFirstCrossOrigin(CACHE_PDFS, request))
    return
  }

  // Requêtes cross-origin non-Supabase → network only
  if (url.origin !== self.location.origin) return

  // 2. Assets Next.js immutables → cache-first avec TTL illimité
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(CACHE_STATIC, request))
    return
  }

  // 3. Images → cache-first
  if (
    url.pathname.startsWith('/_next/image') ||
    /\.(png|jpg|jpeg|webp|svg|gif|ico)$/i.test(url.pathname)
  ) {
    event.respondWith(cacheFirst(CACHE_IMAGES, request))
    return
  }

  // 4. Routes API → network only (données fraîches, pas de cache)
  if (url.pathname.startsWith('/api/')) return

  // 5. Navigation HTML → network-first, fallback offline
  if (request.mode === 'navigate') {
    event.respondWith(networkFirstWithOfflineFallback(request))
    return
  }
})

// ─── HELPERS ────────────────────────────────────────────────────────────────

async function cacheFirst(cacheName, request) {
  const cache  = await caches.open(cacheName)
  const cached = await cache.match(request)
  if (cached) return cached
  const response = await fetch(request)
  if (response.ok) cache.put(request, response.clone())
  return response
}

// Pour les ressources cross-origin (Supabase Storage) : CORS require mode 'no-cors'
// → on stocke une "opaque response" (status=0). Elle fonctionne pour les PDF/images.
async function cacheFirstCrossOrigin(cacheName, request) {
  const cache  = await caches.open(cacheName)
  const cached = await cache.match(request)
  if (cached) return cached
  try {
    const response = await fetch(request, { mode: 'no-cors' })
    // response.type === 'opaque' → status=0, mais le navigateur peut l'utiliser
    cache.put(request, response.clone())
    return response
  } catch {
    return new Response('PDF non disponible hors-ligne', { status: 503 })
  }
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
