// Service Worker for offline support
// Bump these versions whenever the caching strategy changes so the activate
// handler evicts stale caches from previously-installed service workers.
const CACHE_NAME = 'cafe-guide-v3'
const STATIC_CACHE = 'cafe-static-v3'
const DATA_CACHE = 'cafe-data-v3'

// Files to precache for offline functionality. Keep this list to real,
// fetchable URLs only — cache.addAll() rejects (and install fails) if any
// single entry 404s. Source-file paths like /app/page.tsx and tile-template
// URLs (with {s}/{z}/{x}/{y}) are not real assets, so they're cached lazily
// at runtime by the fetch handler instead of precached here.
const STATIC_ASSETS = [
  '/',
  '/data/cafes.json',
]

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...')
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('Service Worker: Caching static assets')
        // Cache entries individually so one failure can't abort the whole
        // install (cache.addAll is all-or-nothing).
        return Promise.allSettled(
          STATIC_ASSETS.map((asset) => cache.add(asset))
        )
      })
      .then(() => self.skipWaiting())
  )
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...')
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && cacheName !== DATA_CACHE) {
              console.log('Service Worker: Clearing old cache', cacheName)
              return caches.delete(cacheName)
            }
          })
        )
      })
      .then(() => self.clients.claim())
  )
})

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
  const { request } = event
  
  // Handle different types of requests
  if (request.url.includes('/data/cafes.json')) {
    // Network-first for cafe data so data updates (new cafes, edits) reach
    // returning visitors. We revalidate against the server ('no-cache') on
    // every load, refresh the cached copy, and fall back to the cache only
    // when the network is unavailable. A cache-first strategy here meant the
    // cached JSON was served forever and updates never appeared until the
    // cache name was bumped.
    event.respondWith(
      caches.open(DATA_CACHE)
        .then((cache) => {
          return fetch(request, { cache: 'no-cache' })
            .then((networkResponse) => {
              if (networkResponse.ok) {
                cache.put(request, networkResponse.clone())
              }
              return networkResponse
            })
            .catch(() => {
              // Offline — serve the last cached copy if we have one.
              return cache.match(request)
            })
        })
    )
  } else if (request.url.includes('basemaps.cartocdn.com')) {
    // Handle map tiles with cache-first strategy
    event.respondWith(
      caches.match(request)
        .then((response) => {
          if (response) {
            return response
          }
          
          return fetch(request)
            .then((networkResponse) => {
              if (networkResponse.ok) {
                const responseClone = networkResponse.clone()
                caches.open(STATIC_CACHE)
                  .then((cache) => cache.put(request, responseClone))
              }
              return networkResponse
            })
        })
    )
  } else {
    // Network-first strategy for other requests
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          // Cache successful responses
          if (networkResponse.ok && request.method === 'GET') {
            const responseClone = networkResponse.clone()
            caches.open(STATIC_CACHE)
              .then((cache) => cache.put(request, responseClone))
          }
          return networkResponse
        })
        .catch(() => {
          // Try to serve from cache if network fails
          return caches.match(request)
        })
    )
  }
})

// Background sync for when connection is restored
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-cafe-data') {
    event.waitUntil(syncCafeData())
  }
})

// Sync cafe data when connection is restored
async function syncCafeData() {
  try {
    const response = await fetch('/data/cafes.json')
    if (response.ok) {
      const cache = await caches.open(DATA_CACHE)
      await cache.put('/data/cafes.json', response.clone())
      console.log('Service Worker: Cafe data synced')
    }
  } catch (error) {
    console.error('Service Worker: Failed to sync cafe data', error)
  }
}

// Push notifications (if needed in future)
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json()
    const options = {
      body: data.body,
      icon: '/images/ca_fe_logo.png',
      badge: '/images/ca_fe_favicon.ico',
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: 1
      }
    }
    
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    )
  }
})
