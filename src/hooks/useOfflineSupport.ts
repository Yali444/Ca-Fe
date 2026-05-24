import { useState, useEffect, useCallback } from 'react'

export const useOfflineSupport = () => {
  const [isOnline, setIsOnline] = useState(true)
  const [isOfflineMode, setIsOfflineMode] = useState(false)
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null)

  useEffect(() => {
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

  const syncData = useCallback(async () => {
    if (isOnline) {
      await cacheCafeData()
    }
  }, [isOnline, cacheCafeData])

  const clearCaches = useCallback(async () => {
    try {
      const cacheNames = await caches.keys()
      await Promise.all(cacheNames.map(name => caches.delete(name)))
      setLastSyncTime(null)
    } catch (error) {
      console.error('Failed to clear caches:', error)
    }
  }, [])

  const getCacheInfo = useCallback(async () => {
    try {
      const cacheNames = await caches.keys()
      const cacheInfo = []
      for (const name of cacheNames) {
        const cache = await caches.open(name)
        const keys = await cache.keys()
        cacheInfo.push({ name, count: keys.length, size: keys.length })
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
