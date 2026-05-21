const CACHE_NAME = 'kelassi-v1'
const STATIC_CACHE = 'kelassi-static-v1'

// Shell applicatif à mettre en cache à l'installation
const APP_SHELL = [
  '/',
  '/dashboard',
  '/cours',
  '/examens',
  '/flashcards',
  '/offline',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME && k !== STATIC_CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Ignore les requêtes non-GET et les URLs externes (Supabase, API)
  if (request.method !== 'GET') return
  if (url.origin !== self.location.origin) return

  // Fichiers statiques Next.js → cache-first
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(request)
        if (cached) return cached
        const response = await fetch(request)
        if (response.ok) cache.put(request, response.clone())
        return response
      })
    )
    return
  }

  // Pages de navigation → network-first avec fallback offline
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            caches.open(CACHE_NAME).then((c) => c.put(request, response.clone()))
          }
          return response
        })
        .catch(async () => {
          const cached = await caches.match(request)
          return cached ?? caches.match('/offline') ?? new Response('Hors-ligne', { status: 503 })
        })
    )
    return
  }
})
