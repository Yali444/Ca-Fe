// Popular times data and calculations for cafes

export interface PopularTime {
  hour: number
  popularity: number // 0-100 percentage
  day: string
}

export interface DayPopularTimes {
  day: string
  hours: PopularTime[]
  peakHours: number[]
  quietHours: number[]
}

// Generate realistic popular times based on cafe type and location
export const generatePopularTimes = (cafeType: 'coffee' | 'matcha', city: string): DayPopularTimes[] => {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  
  return days.map(day => {
    const isWeekend = day === 'Friday' || day === 'Saturday'
    const isTelAviv = city.includes('תל אביב')
    
    let hours: PopularTime[] = []
    
    for (let hour = 6; hour <= 23; hour++) {
      let popularity = 0
      
      // Morning rush (7-10)
      if (hour >= 7 && hour <= 10) {
        popularity = 60 + Math.random() * 30 // 60-90%
        if (cafeType === 'coffee') popularity += 10 // Coffee more popular in morning
      }
      // Mid-morning (10-12)
      else if (hour >= 10 && hour <= 12) {
        popularity = 40 + Math.random() * 30 // 40-70%
      }
      // Lunch (12-14)
      else if (hour >= 12 && hour <= 14) {
        popularity = 70 + Math.random() * 25 // 70-95%
        if (isTelAviv) popularity += 5 // Tel Aviv cafes busier at lunch
      }
      // Afternoon (14-17)
      else if (hour >= 14 && hour <= 17) {
        popularity = 50 + Math.random() * 30 // 50-80%
        if (cafeType === 'matcha') popularity += 10 // Matcha more popular in afternoon
      }
      // Evening (17-20)
      else if (hour >= 17 && hour <= 20) {
        popularity = isWeekend ? 80 + Math.random() * 15 : 60 + Math.random() * 25
        if (isTelAviv && !isWeekend) popularity += 10 // Tel Aviv weekday evenings
      }
      // Late evening (20-23)
      else if (hour >= 20 && hour <= 23) {
        popularity = isWeekend ? 60 + Math.random() * 25 : 20 + Math.random() * 20
      }
      
      // Add some randomness
      popularity += (Math.random() - 0.5) * 10
      popularity = Math.max(5, Math.min(95, popularity)) // Clamp between 5-95
      
      hours.push({
        hour,
        popularity: Math.round(popularity),
        day
      })
    }
    
    // Find peak and quiet hours
    const sortedHours = [...hours].sort((a, b) => b.popularity - a.popularity)
    const peakHours = sortedHours.slice(0, 3).map(h => h.hour)
    const quietHours = sortedHours.slice(-3).map(h => h.hour)
    
    return {
      day,
      hours,
      peakHours,
      quietHours
    }
  })
}

// Get current popularity for a cafe
export const getCurrentPopularity = (popularTimes: DayPopularTimes[], cafeId: string): number => {
  const now = new Date()
  const currentDay = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][now.getDay()]
  const currentHour = now.getHours()
  
  const dayData = popularTimes.find(pt => pt.day === currentDay)
  if (!dayData) return 0
  
  const hourData = dayData.hours.find(h => h.hour === currentHour)
  return hourData ? hourData.popularity : 0
}

// Get popularity status
export const getPopularityStatus = (popularity: number): {
  level: 'quiet' | 'moderate' | 'busy' | 'very-busy'
  color: string
  text: string
  bgColor: string
} => {
  if (popularity < 30) {
    return {
      level: 'quiet',
      color: 'text-emerald-600 dark:text-emerald-400',
      text: 'שקט',
      bgColor: 'bg-emerald-100 dark:bg-emerald-900/40'
    }
  } else if (popularity < 60) {
    return {
      level: 'moderate',
      color: 'text-blue-600 dark:text-blue-400',
      text: 'די עמוס',
      bgColor: 'bg-blue-100 dark:bg-blue-900/40'
    }
  } else if (popularity < 80) {
    return {
      level: 'busy',
      color: 'text-amber-600 dark:text-amber-400',
      text: 'עמוס',
      bgColor: 'bg-amber-100 dark:bg-amber-900/40'
    }
  } else {
    return {
      level: 'very-busy',
      color: 'text-red-600 dark:text-red-400',
      text: 'עמוס מאוד',
      bgColor: 'bg-red-100 dark:bg-red-900/40'
    }
  }
}

// Get best time to visit
export const getBestTimeToVisit = (popularTimes: DayPopularTimes[]): string => {
  const now = new Date()
  const currentDayIndex = now.getDay()
  const currentHour = now.getHours()
  
  // Look for the next quiet hour today
  const today = popularTimes[currentDayIndex]
  const nextQuietHour = today.hours
    .filter(h => h.hour > currentHour && h.popularity < 40)
    .sort((a, b) => a.popularity - b.popularity)[0]
  
  if (nextQuietHour) {
    return `השעה הטובה היום: ${nextQuietHour.hour}:00`
  }
  
  // Look for tomorrow morning
  const tomorrow = popularTimes[(currentDayIndex + 1) % 7]
  const tomorrowMorning = tomorrow.hours
    .filter(h => h.hour >= 7 && h.hour <= 10)
    .sort((a, b) => a.popularity - b.popularity)[0]
  
  if (tomorrowMorning) {
    return `השעה הטובה מחר: ${tomorrowMorning.hour}:00`
  }
  
  return 'מומלץ לבדוק את השעות השקטות'
}

// Cache popular times for cafes
const popularTimesCache = new Map<string, DayPopularTimes[]>()

export const getCachedPopularTimes = (
  cafeId: string, 
  cafeType: 'coffee' | 'matcha', 
  city: string
): DayPopularTimes[] => {
  const cacheKey = `${cafeId}-${cafeType}-${city}`
  
  if (!popularTimesCache.has(cacheKey)) {
    popularTimesCache.set(cacheKey, generatePopularTimes(cafeType, city))
  }
  
  return popularTimesCache.get(cacheKey)!
}
