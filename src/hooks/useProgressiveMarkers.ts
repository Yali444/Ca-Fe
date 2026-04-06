import { useState, useEffect, useCallback, useRef } from 'react'

// Define CoffeeShop type locally to avoid circular imports
interface CoffeeShop {
  id: string
  name: string
  location: string
  address: string | null
  lat: number
  lng: number
  image: string
  specialty: string
  description: string
  brewMethods?: string[]
  vibeTags: string[]
  instagram?: string
  website?: string
  hours?: string | any
  reviews: any[]
  matchaOrigin?: string
  milkOptions?: string
  isRoaster?: boolean
  sellsBeans?: boolean
  roasteryOnly?: boolean
  type?: 'coffee' | 'matcha'
  hidden?: boolean
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
  const isLoadingRef = useRef(false)
  const lastLoadTimeRef = useRef(Date.now())

  // Load initial batch
  useEffect(() => {
    if (shops.length === 0) return
    const initial = shops.slice(0, initialBatch)
    setVisibleShops(initial)
    setLoadedCount(initialBatch)
  }, [shops, initialBatch])

  // Load more markers
  const loadMore = useCallback(() => {
    if (isLoadingRef.current || loadedCount >= shops.length) return
    
    // Throttle loading to prevent too frequent updates
    const now = Date.now()
    if (now - lastLoadTimeRef.current < 100) return
    
    isLoadingRef.current = true
    lastLoadTimeRef.current = now

    const nextBatch = shops.slice(loadedCount, loadedCount + batchSize)
    
    setTimeout(() => {
      setVisibleShops(prev => [...prev, ...nextBatch])
      setLoadedCount(prev => prev + nextBatch.length)
      isLoadingRef.current = false
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
    isLoading: isLoadingRef.current,
    triggerElementRef,
    loadMarkersInView
  }
}
