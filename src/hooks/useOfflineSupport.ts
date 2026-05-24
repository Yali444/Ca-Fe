"use client"

import { useState, useEffect, useCallback, createContext, useContext } from 'react'

// ── Shared context so OfflineIndicator / OfflineBanner / IsraelCoffeeGuide
//    all read the same state instead of each registering their own
//    online/offline event listeners. ────────────────────────────────────────

type OfflineSupportValue = ReturnType<typeof _useOfflineSupportCore>

export const OfflineSupportContext = createContext<OfflineSupportValue | null>(null)

// Internal hook — creates real state. Used only by OfflineSupportProvider.
export function _useOfflineSupportCore() {
  const [isOnline, setIsOnline] = useState(true)
  const [isOfflineMode, setIsOfflineMode] = useState(false)
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null)

  useEffect(() => {
    // Check initial online status
    setIsOnline(navigator.onLine)

    const handleOnline = () => {
      setIsOnline(true)
      setIsOfflineMode(false)
    }

    const handleOffline = () => {
      setIsOnline(false)
      setIsOfflineMode(true)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Register service worker
  const registerServiceWorker = useCallback(async () => {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js')

        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New version available — could show a toast here
              }
            })
          }
        })

        return registration
      } catch (error) {
        console.error('Service Worker registration failed:', error)
        return null
      }
    }
    return null
  }, [])

  // Cache cafe data for offline use
  const cacheCafeData = useCallback(async () => {
    try {
      const response = await fetch('/data/cafes.json')
      if (response.ok) {
        const cache = await caches.open('cafe-data-v1')
        await cache.put('/data/cafes.json', response.clone())
        setLastSyncTime(new Date())
        return true
      }
    } catch (error) {
      console.error('Failed to cache cafe data:', error)
      return false
    }
    return false
  }, [])

  // Get cached cafe data
  const getCachedCafeData = useCallback(async () => {
    try {
      const cache = await caches.open('cafe-data-v1')
      const response = await cache.match('/data/cafes.json')
      if (response) {
        return await response.json()
      }
    } catch (error) {
      console.error('Failed to get cached cafe data:', error)
    }
    return null
  }, [])

  // Sync data when coming back online
  const syncData = useCallback(async () => {
    if (isOnline) {
      await cacheCafeData()
    }
  }, [isOnline, cacheCafeData])

  // Clear all caches
  const clearCaches = useCallback(async () => {
    try {
      const cacheNames = await caches.keys()
      await Promise.all(cacheNames.map(name => caches.delete(name)))
      setLastSyncTime(null)
    } catch (error) {
      console.error('Failed to clear caches:', error)
    }
  }, [])

  // Get cache storage info
  const getCacheInfo = useCallback(async () => {
    try {
      const cacheNames = await caches.keys()
      const cacheInfo = []

      for (const name of cacheNames) {
        const cache = await caches.open(name)
        const keys = await cache.keys()
        cacheInfo.push({
          name,
          count: keys.length,
          size: keys.length, // Approximate
        })
      }

      return cacheInfo
    } catch (error) {
      console.error('Failed to get cache info:', error)
      return []
    }
  }, [])

  return {
    isOnline,
    isOfflineMode,
    lastSyncTime,
    registerServiceWorker,
    cacheCafeData,
    getCachedCafeData,
    syncData,
    clearCaches,
    getCacheInfo,
  }
}

// ── Provider is in OfflineSupportProvider.tsx (JSX not allowed in .ts) ───────

// ── Consumer hook — used everywhere instead of the old hook ──────────────────

export const useOfflineSupport = () => {
  const ctx = useContext(OfflineSupportContext)
  if (!ctx) {
    // Fallback: component mounted outside the provider (e.g. in tests).
    // Return a no-op stub so the app doesn't crash.
    return {
      isOnline: true,
      isOfflineMode: false,
      lastSyncTime: null,
      registerServiceWorker: async () => null,
      cacheCafeData: async () => false,
      getCachedCafeData: async () => null,
      syncData: async () => {},
      clearCaches: async () => {},
      getCacheInfo: async () => [],
    }
  }
  return ctx
}
