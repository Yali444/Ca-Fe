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
  type?: 'coffee' | 'matcha' | 'workshops'
  hidden?: boolean
}

export interface HeatMapPoint {
  lat: number
  lng: number
  intensity: number // 0-1
  area: string
  cafeCount: number
}

export interface HeatMapArea {
  name: string
  center: [number, number]
  radius: number // in kilometers
  cafeDensity: number
  avgRating?: number
  popularTypes: string[]
}

// Calculate cafe density for different areas in Israel
export const calculateHeatMapData = (cafes: CoffeeShop[]): HeatMapPoint[] => {
  const heatMapPoints: HeatMapPoint[] = []
  
  // Define major areas in Israel with their coordinates
  const areas = [
    { name: 'תל אביב מרכז', center: [32.0853, 34.7818] as [number, number], radius: 3 },
    { name: 'תל אביב צפון', center: [32.1500, 34.8000] as [number, number], radius: 3 },
    { name: 'יפו', center: [32.0524, 34.7495] as [number, number], radius: 2 },
    { name: 'רמת גן-גבעתיים', center: [32.0830, 34.8030] as [number, number], radius: 2.5 },
    { name: 'ירושלים מרכז', center: [31.7683, 35.2137] as [number, number], radius: 3 },
    { name: 'ירושלים דרום', center: [31.7400, 35.2200] as [number, number], radius: 2.5 },
    { name: 'חיפה מרכז', center: [32.8160, 34.9890] as [number, number], radius: 2.5 },
    { name: 'חיפה דרום', center: [32.7900, 35.0100] as [number, number], radius: 2 },
    { name: 'רעננה', center: [32.2800, 34.8700] as [number, number], radius: 2 },
    { name: 'הרצליה', center: [32.1660, 34.8400] as [number, number], radius: 2 },
    { name: 'כפר סבא', center: [32.1700, 34.9500] as [number, number], radius: 2 },
    { name: 'ראשון לציון', center: [31.9730, 34.7920] as [number, number], radius: 2.5 },
    { name: 'רחובות', center: [31.8930, 34.7990] as [number, number], radius: 2 },
    { name: 'אשדוד', center: [31.8000, 34.6500] as [number, number], radius: 2 },
    { name: 'באר שבע', center: [31.2500, 34.7900] as [number, number], radius: 2.5 },
    { name: 'מודיעין', center: [31.9000, 35.0000] as [number, number], radius: 2 },
    { name: 'נתניה', center: [32.3300, 34.8500] as [number, number], radius: 2 },
  ]
  
  areas.forEach(area => {
    // Count cafes in this area
    const cafesInArea = cafes.filter(cafe => {
      const distance = calculateDistance(
        area.center[0], 
        area.center[1], 
        cafe.lat, 
        cafe.lng
      )
      return distance <= area.radius
    })
    
    if (cafesInArea.length > 0) {
      // Calculate intensity based on cafe density
      const density = cafesInArea.length / (Math.PI * area.radius * area.radius)
      const intensity = Math.min(density / 2, 1) // Normalize to 0-1
      
      // Add multiple points for better heat map visualization
      const pointsPerArea = Math.max(3, Math.ceil(cafesInArea.length / 3))
      
      for (let i = 0; i < pointsPerArea; i++) {
        // Add some randomness to create a more natural heat map
        const randomLat = area.center[0] + (Math.random() - 0.5) * area.radius * 0.8
        const randomLng = area.center[1] + (Math.random() - 0.5) * area.radius * 0.8
        
        heatMapPoints.push({
          lat: randomLat,
          lng: randomLng,
          intensity: intensity * (0.7 + Math.random() * 0.3), // Add some variation
          area: area.name,
          cafeCount: cafesInArea.length
        })
      }
    }
  })
  
  return heatMapPoints
}

// Calculate heat map areas with additional data
export const getHeatMapAreas = (cafes: CoffeeShop[]): HeatMapArea[] => {
  const areas = [
    { name: 'תל אביב מרכז', center: [32.0853, 34.7818] as [number, number], radius: 3 },
    { name: 'תל אביב צפון', center: [32.1500, 34.8000] as [number, number], radius: 3 },
    { name: 'יפו', center: [32.0524, 34.7495] as [number, number], radius: 2 },
    { name: 'רמת גן-גבעתיים', center: [32.0830, 34.8030] as [number, number], radius: 2.5 },
    { name: 'ירושלים מרכז', center: [31.7683, 35.2137] as [number, number], radius: 3 },
    { name: 'ירושלים דרום', center: [31.7400, 35.2200] as [number, number], radius: 2.5 },
    { name: 'חיפה מרכז', center: [32.8160, 34.9890] as [number, number], radius: 2.5 },
    { name: 'חיפה דרום', center: [32.7900, 35.0100] as [number, number], radius: 2 },
    { name: 'רעננה', center: [32.2800, 34.8700] as [number, number], radius: 2 },
    { name: 'הרצליה', center: [32.1660, 34.8400] as [number, number], radius: 2 },
    { name: 'כפר סבא', center: [32.1700, 34.9500] as [number, number], radius: 2 },
    { name: 'ראשון לציון', center: [31.9730, 34.7920] as [number, number], radius: 2.5 },
    { name: 'רחובות', center: [31.8930, 34.7990] as [number, number], radius: 2 },
    { name: 'אשדוד', center: [31.8000, 34.6500] as [number, number], radius: 2 },
    { name: 'באר שבע', center: [31.2500, 34.7900] as [number, number], radius: 2.5 },
    { name: 'מודיעין', center: [31.9000, 35.0000] as [number, number], radius: 2 },
    { name: 'נתניה', center: [32.3300, 34.8500] as [number, number], radius: 2 },
  ]
  
  return areas.map(area => {
    const cafesInArea = cafes.filter(cafe => {
      const distance = calculateDistance(
        area.center[0], 
        area.center[1], 
        cafe.lat, 
        cafe.lng
      )
      return distance <= area.radius
    })
    
    const density = cafesInArea.length / (Math.PI * area.radius * area.radius)
    
    // Calculate popular types in this area
    const typeCount: Record<string, number> = {}
    cafesInArea.forEach(cafe => {
      const type = cafe.type || 'coffee'
      typeCount[type] = (typeCount[type] || 0) + 1
    })
    
    const popularTypes = Object.entries(typeCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 2)
      .map(([type]) => type)
    
    return {
      name: area.name,
      center: area.center,
      radius: area.radius,
      cafeDensity: density,
      avgRating: cafesInArea.length > 0 
        ? cafesInArea.reduce((sum, cafe) => sum + (cafe.reviews?.length || 0), 0) / cafesInArea.length
        : undefined,
      popularTypes
    }
  }).sort((a, b) => b.cafeDensity - a.cafeDensity) // Sort by density
}

// Calculate distance between two points in km
export const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371 // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLng/2) * Math.sin(dLng/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return R * c
}

// Get heat map color based on intensity
export const getHeatMapColor = (intensity: number): string => {
  if (intensity < 0.2) return 'rgba(0, 255, 0, 0.3)' // Green - low density
  if (intensity < 0.4) return 'rgba(255, 255, 0, 0.4)' // Yellow - medium-low density
  if (intensity < 0.6) return 'rgba(255, 165, 0, 0.5)' // Orange - medium density
  if (intensity < 0.8) return 'rgba(255, 69, 0, 0.6)' // Red-orange - high density
  return 'rgba(255, 0, 0, 0.7)' // Red - very high density
}

// Get density level description
export const getDensityLevel = (density: number): {
  level: 'very-low' | 'low' | 'medium' | 'high' | 'very-high'
  text: string
  color: string
  bgColor: string
} => {
  if (density < 0.5) {
    return {
      level: 'very-low',
      text: 'צפיפות נמוכה מאוד',
      color: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'bg-emerald-100 dark:bg-emerald-900/40'
    }
  } else if (density < 1.0) {
    return {
      level: 'low',
      text: 'צפיפות נמוכה',
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-100 dark:bg-green-900/40'
    }
  } else if (density < 1.5) {
    return {
      level: 'medium',
      text: 'צפיפות בינונית',
      color: 'text-amber-600 dark:text-amber-400',
      bgColor: 'bg-amber-100 dark:bg-amber-900/40'
    }
  } else if (density < 2.0) {
    return {
      level: 'high',
      text: 'צפיפות גבוהה',
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-100 dark:bg-orange-900/40'
    }
  } else {
    return {
      level: 'very-high',
      text: 'צפיפות גבוהה מאוד',
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-100 dark:bg-red-900/40'
    }
  }
}
