// Service Worker for offline support
const CACHE_NAME = 'cafe-guide-v1'
const STATIC_CACHE = 'cafe-static-v1'
const DATA_CACHE = 'cafe-data-v1'

// Files to cache for offline functionality
const STATIC_ASSETS = [
  '/',
  '/app/layout.tsx',
  '/app/page.tsx',
  '/components/IsraelCoffeeGuide.tsx',
  '/data/cafes.json',
  // Add critical CSS and JS files
  '/app/globals.css',
  // Add map tiles and icons
  'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
  'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
]

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...')
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('Service Worker: Caching static assets')
        return cache.addAll(STATIC_ASSETS)
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
    // Cache cafe data for offline use
    event.respondWith(
      caches.open(DATA_CACHE)
        .then((cache) => {
          return cache.match(request)
            .then((response) => {
              // Return cached version if available
              if (response) {
                return response
              }
              
              // Otherwise fetch from network and cache
              return fetch(request)
                .then((networkResponse) => {
                  // Cache the successful response
                  if (networkResponse.ok) {
                    cache.put(request, networkResponse.clone())
                  }
                  return networkResponse
                })
                .catch(() => {
                  // Return cached version if network fails
                  return cache.match(request)
                })
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
