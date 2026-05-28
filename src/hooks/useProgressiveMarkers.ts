import { useState, useEffect, useCallback, useRef } from 'react'

// Minimal shape this hook needs from a shop: an id for dedupe and a lat/lng
// for bbox filtering. The rest of a `Place`/`Roastery` is irrelevant here.
interface CoffeeShop {
  id: string
  lat: number
  lng: number
}

interface UseProgressiveMarkersProps {
  shops: CoffeeShop[]
  batchSize?: number
  initialBatch?: number
  triggerDistance?: number
}

export const useProgressiveMarkers = ({
  shops,
  batchSize = 20,
  initialBatch = 40,
  triggerDistance = 200
}: UseProgressiveMarkersProps) => {
  const [visibleShops, setVisibleShops] = useState<CoffeeShop[]>([])
  const [loadedCount, setLoadedCount] = useState(initialBatch)
  // isLoading must be state, not a ref, so callers actually re-render when
  // it changes. The internal `isLoadingRef` mirror is just so concurrent
  // calls inside `loadMore` can short-circuit without waiting for a render.
  const [isLoading, setIsLoading] = useState(false)
  const isLoadingRef = useRef(false)
  // Lazily initialised on first throttle check; calling Date.now() directly
  // in useRef(...) is an impure call during render.
  const lastLoadTimeRef = useRef<number | null>(null)

  // Load initial batch. Seeding state from props in an effect is the
  // antipattern react-hooks/set-state-in-effect warns about, but here the
  // effect deliberately runs once when `shops` (an async data source) first
  // arrives, then again when batch size changes. Deriving with useMemo
  // would be cleaner but is out of scope for this commit.
  useEffect(() => {
    if (shops.length === 0) return
    const initial = shops.slice(0, initialBatch)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisibleShops(initial)
    setLoadedCount(initialBatch)
  }, [shops, initialBatch])

  // Load more markers
  const loadMore = useCallback(() => {
    if (isLoadingRef.current || loadedCount >= shops.length) return
    
    // Throttle loading to prevent too frequent updates
    const now = Date.now()
    if (lastLoadTimeRef.current !== null && now - lastLoadTimeRef.current < 100) return

    isLoadingRef.current = true
    setIsLoading(true)
    lastLoadTimeRef.current = now

    const nextBatch = shops.slice(loadedCount, loadedCount + batchSize)

    setTimeout(() => {
      setVisibleShops(prev => [...prev, ...nextBatch])
      setLoadedCount(prev => prev + nextBatch.length)
      isLoadingRef.current = false
      setIsLoading(false)
    }, 50) // Small delay for smooth loading
  }, [shops, loadedCount, batchSize])

  // Intersection Observer for scroll-triggered loading
  const observerRef = useRef<IntersectionObserver | null>(null)
  const triggerElementRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!triggerElementRef.current) return

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const [entry] = entries
        if (entry.isIntersecting) {
          loadMore()
        }
      },
      {
        threshold: 0.1,
        rootMargin: `${triggerDistance}px`
      }
    )

    observerRef.current.observe(triggerElementRef.current)

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [loadMore, triggerDistance])

  // Map movement triggered loading
  const loadMarkersInView = useCallback((bounds: {
    north: number
    south: number
    east: number
    west: number
  }) => {
    const shopsInView = shops.filter(shop => 
      shop.lat >= bounds.south &&
      shop.lat <= bounds.north &&
      shop.lng >= bounds.west &&
      shop.lng <= bounds.east
    )

    // Add shops in view to visible shops if not already loaded
    const newShops = shopsInView.filter(shop => 
      !visibleShops.find(visible => visible.id === shop.id)
    )

    if (newShops.length > 0) {
      setVisibleShops(prev => [...prev, ...newShops])
    }
  }, [shops, visibleShops])

  return {
    visibleShops,
    loadMore,
    hasMore: loadedCount < shops.length,
    isLoading,
    triggerElementRef,
    loadMarkersInView
  }
}
