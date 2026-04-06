import { useState, useEffect } from 'react'

export const useOfflineSupport = () => {
  const [isOnline, setIsOnline] = useState(true)
  const [isOfflineMode, setIsOfflineMode] = useState(false)
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null)

  useEffect(() => {
    // Check initial online status
    setIsOnline(navigator.onLine)

    // Listen for online/offline events
    const handleOnline = () => {
      setIsOnline(true)
      setIsOfflineMode(false)
      console.log('App is now online')
    }

    const handleOffline = () => {
      setIsOnline(false)
      setIsOfflineMode(true)
      console.log('App is now offline')
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Register service worker
  const registerServiceWorker = async () => {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js')
        console.log('Service Worker registered:', registration)
        
        // Listen for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New version available
                console.log('New app version available')
                // You could show a notification here
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
  }

  // Cache cafe data for offline use
  const cacheCafeData = async () => {
    try {
      const response = await fetch('/data/cafes.json')
      if (response.ok) {
        const cache = await caches.open('cafe-data-v1')
        await cache.put('/data/cafes.json', response.clone())
        setLastSyncTime(new Date())
        console.log('Cafe data cached for offline use')
        return true
      }
    } catch (error) {
      console.error('Failed to cache cafe data:', error)
      return false
    }
    return false
  }

  // Get cached cafe data
  const getCachedCafeData = async () => {
    try {
      const cache = await caches.open('cafe-data-v1')
      const response = await cache.match('/data/cafes.json')
      if (response) {
        const data = await response.json()
        console.log('Serving cafe data from cache')
        return data
      }
    } catch (error) {
      console.error('Failed to get cached cafe data:', error)
    }
    return null
  }

  // Sync data when coming back online
  const syncData = async () => {
    if (isOnline) {
      await cacheCafeData()
    }
  }

  // Clear all caches
  const clearCaches = async () => {
    try {
      const cacheNames = await caches.keys()
      await Promise.all(cacheNames.map(name => caches.delete(name)))
      console.log('All caches cleared')
      setLastSyncTime(null)
    } catch (error) {
      console.error('Failed to clear caches:', error)
    }
  }

  // Get cache storage info
  const getCacheInfo = async () => {
    try {
      const cacheNames = await caches.keys()
      const cacheInfo = []
      
      for (const name of cacheNames) {
        const cache = await caches.open(name)
        const keys = await cache.keys()
        cacheInfo.push({
          name,
          count: keys.length,
          size: keys.length // Approximate size
        })
      }
      
      return cacheInfo
    } catch (error) {
      console.error('Failed to get cache info:', error)
      return []
    }
  }

  return {
    isOnline,
    isOfflineMode,
    lastSyncTime,
    registerServiceWorker,
    cacheCafeData,
    getCachedCafeData,
    syncData,
    clearCaches,
    getCacheInfo
  }
}
