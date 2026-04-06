import { useState, useEffect } from 'react'

interface GooglePlaceResult {
  place_id: string
  name: string
  formatted_address: string
  geometry: {
    location: {
      lat: number
      lng: number
    }
  }
  types: string[]
}

interface GooglePlacesResponse {
  results: GooglePlaceResult[]
  status: string
}

export const useGooglePlaces = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const searchPlace = async (name: string, address?: string, city?: string): Promise<GooglePlaceResult | null> => {
    setLoading(true)
    setError(null)

    try {
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
      if (!apiKey) {
        throw new Error('Google Maps API key not found in environment variables')
      }

      // Build search query
      const query = [name, address, city].filter(Boolean).join(', ')
      
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/textsearch/json?` +
        `query=${encodeURIComponent(query)}` +
        `&fields=place_id,name,formatted_address,geometry,types` +
        `&key=${apiKey}` +
        `&language=iw` // Hebrew results
      )

      const data: GooglePlacesResponse = await response.json()

      if (data.status === 'OK' && data.results.length > 0) {
        // Return the first (most relevant) result
        return data.results[0]
      } else {
        throw new Error(`Google Places API error: ${data.status}`)
      }
    } catch (err) {
      console.error('Failed to search Google Places:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
      return null
    } finally {
      setLoading(false)
    }
  }

  const findPlaceId = async (cafe: {
    name: string
    address?: string | null
    city: string
  }): Promise<string | null> => {
    const result = await searchPlace(cafe.name, cafe.address || undefined, cafe.city)
    return result?.place_id || null
  }

  // Batch find place IDs for multiple cafes
  const findMultiplePlaceIds = async (cafes: Array<{
    name: string
    address?: string | null
    city: string
  }>): Promise<Record<string, string>> => {
    const results: Record<string, string> = {}
    
    for (const cafe of cafes) {
      try {
        const placeId = await findPlaceId(cafe)
        if (placeId) {
          results[cafe.name] = placeId
        }
        
        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100))
      } catch (err) {
        console.warn(`Failed to find place ID for ${cafe.name}:`, err)
      }
    }
    
    return results
  }

  return {
    searchPlace,
    findPlaceId,
    findMultiplePlaceIds,
    loading,
    error
  }
}

// Hook to get popular times from Google Places
export const useGooglePlacesPopularTimes = (placeId: string) => {
  const [popularTimes, setPopularTimes] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchPopularTimes = async () => {
    setLoading(true)
    setError(null)

    try {
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
      if (!apiKey) {
        throw new Error('Google Maps API key not found')
      }

      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?` +
        `place_id=${placeId}` +
        `&fields=popular_times` +
        `&key=${apiKey}` +
        `&language=iw`
      )

      const data = await response.json()

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

  useEffect(() => {
    if (placeId) {
      fetchPopularTimes()
    }
  }, [placeId])

  return {
    popularTimes,
    loading,
    error,
    refetch: fetchPopularTimes
  }
}
