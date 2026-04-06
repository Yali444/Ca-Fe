import { useState, useEffect } from 'react'

interface PopularTimesData {
  day: string
  hours: Array<{
    hour: number
    popularity: number
  }>
}

interface GooglePlacesResponse {
  result: {
    popular_times?: PopularTimesData[]
  }
  status: string
}

export const useGooglePlacesPopularTimes = (placeId?: string) => {
  const [popularTimes, setPopularTimes] = useState<PopularTimesData[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchPopularTimes = async (googlePlaceId: string) => {
    setLoading(true)
    setError(null)

    try {
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY
      if (!apiKey) {
        throw new Error('Google Places API key not found')
      }

      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?` +
        `place_id=${googlePlaceId}` +
        `&fields=popular_times` +
        `&key=${apiKey}` +
        `&language=iw` // Hebrew
      )

      const data: GooglePlacesResponse = await response.json()

      if (data.status === 'OK' && data.result.popular_times) {
        setPopularTimes(data.result.popular_times)
      } else {
        throw new Error(`Google Places API error: ${data.status}`)
      }
    } catch (err) {
      console.error('Failed to fetch popular times:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  return {
    popularTimes,
    loading,
    error,
    fetchPopularTimes
  }
}

// Helper to get place ID from cafe data
export const getGooglePlaceId = (cafe: {
  name: string
  address?: string | null
  city: string
}): string | null => {
  // You would need to match your cafe data with Google Places
  // This could be done by:
  // 1. Storing Google Place ID in your cafe data
  // 2. Using Places API to search by name + address
  // 3. Manual mapping
  
  // For now, return null - you'll need to implement this
  return null
}

// Fallback to synthetic data if Google Places fails
export const useHybridPopularTimes = (placeId?: string, cafeType?: 'coffee' | 'matcha', city?: string) => {
  const googlePlaces = useGooglePlacesPopularTimes(placeId)
  
  // Import synthetic data generator
  const generatePopularTimes = (type: 'coffee' | 'matcha', location: string) => {
    // This would be your existing generatePopularTimes function
    return []
  }
  
  const [syntheticData, setSyntheticData] = useState<PopularTimesData[]>([])
  
  useEffect(() => {
    // If Google Places fails or no place ID, use synthetic data
    if (!placeId || googlePlaces.error) {
      if (cafeType && city) {
        setSyntheticData(generatePopularTimes(cafeType, city))
      }
    }
  }, [placeId, googlePlaces.error, cafeType, city])
  
  return {
    popularTimes: googlePlaces.popularTimes.length > 0 ? googlePlaces.popularTimes : syntheticData,
    loading: googlePlaces.loading,
    error: googlePlaces.error,
    isGoogleData: googlePlaces.popularTimes.length > 0,
    fetchPopularTimes: googlePlaces.fetchPopularTimes
  }
}
