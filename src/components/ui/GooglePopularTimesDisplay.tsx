"use client"

import React, { useState, useMemo } from 'react'
import { Clock, TrendingUp, Users, Calendar, AlertCircle } from 'lucide-react'
import { useHybridPopularTimes } from '@/hooks/useGooglePlacesPopularTimes'
import { getPopularityStatus, getBestTimeToVisit } from '@/lib/popular-times'

interface GooglePopularTimesDisplayProps {
  cafeId: string
  cafeType: 'coffee' | 'matcha'
  city: string
  googlePlaceId?: string
  compact?: boolean
}

export const GooglePopularTimesDisplay: React.FC<GooglePopularTimesDisplayProps> = ({
  cafeId,
  cafeType,
  city,
  googlePlaceId,
  compact = false
}) => {
  const [selectedDay, setSelectedDay] = useState<string>('today')
  
  const { 
    popularTimes, 
    loading, 
    error, 
    isGoogleData,
    fetchPopularTimes 
  } = useHybridPopularTimes(googlePlaceId, cafeType, city)
  
  const currentPopularity = useMemo(() => {
    const now = new Date()
    const currentDay = popularTimes.find(pt => 
      pt.day.toLowerCase() === ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][now.getDay()]
    )
    
    if (!currentDay) return 0
    
    const currentHour = now.getHours()
    const hourData = currentDay.hours.find(h => h.hour === currentHour)
    return hourData ? hourData.popularity : 0
  }, [popularTimes])
  
  const currentStatus = useMemo(() => 
    getPopularityStatus(currentPopularity),
    [currentPopularity]
  )
  
  const bestTimeToVisit = useMemo(() => 
    getBestTimeToVisit(popularTimes),
    [popularTimes]
  )
  
  // Handle manual refresh
  const handleRefresh = () => {
    if (googlePlaceId) {
      fetchPopularTimes(googlePlaceId)
    }
  }
  
  if (compact) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <Clock className="h-4 w-4 text-slate-500" />
        <span className="text-slate-600 dark:text-slate-400">עכשיו:</span>
        <span className={`font-medium ${currentStatus.color}`}>
          {currentStatus.text}
        </span>
        <span className="text-xs text-slate-500">
          ({currentPopularity}%)
        </span>
        {isGoogleData && (
          <span className="text-xs text-green-600 dark:text-green-400" title="נתונים מ-Google">
            ✓
          </span>
        )}
      </div>
    )
  }
  
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500" />
          <span className="text-sm text-slate-600 dark:text-slate-400">
            טוען נתוני עומס...
          </span>
        </div>
      </div>
    )
  }
  
  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
          <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <div>
            <p className="text-sm text-amber-800 dark:text-amber-200">
              לא ניתן לקבל נתוני עומס מ-Google
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-400">
              מציג נתונים משוערים
            </p>
          </div>
          {googlePlaceId && (
            <button
              onClick={handleRefresh}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              נסה שוב
            </button>
          )}
        </div>
        
        {/* Show synthetic data fallback */}
        <div className="text-sm text-slate-600 dark:text-slate-400">
          <p>עכשיו: {currentStatus.text} ({currentPopularity}%)</p>
          <p>💡 {bestTimeToVisit}</p>
        </div>
      </div>
    )
  }
  
  const dayNames = ['היום', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת']
  const hours = ['6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23']
  
  return (
    <div className="space-y-4">
      {/* Data source indicator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isGoogleData ? (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              <span className="text-xs text-green-600 dark:text-green-400">
                נתונים מ-Google Places
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-amber-500 rounded-full" />
              <span className="text-xs text-amber-600 dark:text-amber-400">
                נתונים משוערים
              </span>
            </div>
          )}
        </div>
        
        {googlePlaceId && (
          <button
            onClick={handleRefresh}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
          >
            רענן
          </button>
        )}
      </div>
      
      {/* Current status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${currentStatus.bgColor}`}>
            <Users className={`h-5 w-5 ${currentStatus.color}`} />
          </div>
          <div>
            <p className="font-medium text-slate-900 dark:text-slate-100">
              עכשיו: {currentStatus.text}
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              רמת עומס: {currentPopularity}%
            </p>
          </div>
        </div>
        
        <div className="text-right">
          <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
            💡 {bestTimeToVisit}
          </p>
        </div>
      </div>
      
      {/* Day selector */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {dayNames.map((dayName, index) => {
          const isActive = selectedDay === (index === 0 ? 'today' : ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][index])
          
          return (
            <button
              key={dayName}
              onClick={() => setSelectedDay(isActive)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                isActive
                  ? 'bg-blue-500 text-white'
                  : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-zinc-700'
              }`}
            >
              {dayName}
            </button>
          )
        })}
      </div>
      
      {/* Popular times chart */}
      <div className="bg-slate-50 dark:bg-zinc-800 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="h-4 w-4 text-slate-600 dark:text-slate-400" />
          <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
            רמות עומס לפי שעות
          </span>
        </div>
        
        <div className="space-y-2">
          {hours.map((hour, index) => {
            const hourNum = parseInt(hour)
            const hourData = popularTimes[0]?.hours.find(h => h.hour === hourNum)
            const popularity = hourData?.popularity || 0
            const hourStatus = getPopularityStatus(popularity)
            
            return (
              <div key={hour} className="flex items-center gap-3">
                <span className="text-xs text-slate-600 dark:text-slate-400 w-8">
                  {hour}:00
                </span>
                
                <div className="flex-1 relative">
                  <div className="h-6 bg-slate-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${hourStatus.bgColor.replace('bg-', 'bg-opacity-60 bg-')}`}
                      style={{ width: `${popularity}%` }}
                    />
                  </div>
                </div>
                
                <span className="text-xs text-slate-600 dark:text-slate-400 w-8 text-right">
                  {popularity}%
                </span>
              </div>
            )
          })}
        </div>
        
        <div className="mt-3 pt-3 border-t border-slate-200 dark:border-zinc-700">
          <div className="flex items-center gap-4 text-xs text-slate-600 dark:text-slate-400">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-emerald-500 rounded-full" />
              <span>שקט</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-blue-500 rounded-full" />
              <span>די עמוס</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-amber-500 rounded-full" />
              <span>עמוס</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-red-500 rounded-full" />
              <span>עמוס מאוד</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
