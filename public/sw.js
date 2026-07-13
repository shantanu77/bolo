const CACHE_VERSION = 'auraxpress-v1'
const OFFLINE_CACHE = `${CACHE_VERSION}-offline`
const ASSET_CACHE = `${CACHE_VERSION}-assets`
const OFFLINE_URL = '/offline'

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(OFFLINE_CACHE).then(cache => cache.addAll([
      OFFLINE_URL,
      '/icon-192.png',
      '/icon-512.png',
      '/apple-touch-icon.png',
    ]))
  )
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => !key.startsWith(CACHE_VERSION)).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', event => {
  const request = event.request
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)))
    return
  }

  const cacheableAsset = url.pathname.startsWith('/_next/static/')
    || url.pathname.startsWith('/_next/image')
    || /\.(?:png|jpg|jpeg|webp|svg|ico|woff2?)$/i.test(url.pathname)

  if (cacheableAsset) {
    event.respondWith(
      caches.open(ASSET_CACHE).then(async cache => {
        const cached = await cache.match(request)
        if (cached) return cached
        const response = await fetch(request)
        if (response.ok) cache.put(request, response.clone())
        return response
      })
    )
  }
})
