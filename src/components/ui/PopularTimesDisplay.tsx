"use client"

import React, { useState, useMemo } from 'react'
import { Clock, TrendingUp, Users, Calendar } from 'lucide-react'
import { 
  getCachedPopularTimes, 
  getCurrentPopularity, 
  getPopularityStatus, 
  getBestTimeToVisit,
  type DayPopularTimes 
} from '@/lib/popular-times'

interface PopularTimesDisplayProps {
  cafeId: string
  cafeType: 'coffee' | 'matcha'
  city: string
  compact?: boolean
}

export const PopularTimesDisplay: React.FC<PopularTimesDisplayProps> = ({
  cafeId,
  cafeType,
  city,
  compact = false
}) => {
  const [selectedDay, setSelectedDay] = useState<string>('today')
  
  const popularTimes = useMemo(() => 
    getCachedPopularTimes(cafeId, cafeType, city),
    [cafeId, cafeType, city]
  )
  
  const currentPopularity = useMemo(() =>
    getCurrentPopularity(popularTimes),
    [popularTimes]
  )
  
  const currentStatus = useMemo(() => 
    getPopularityStatus(currentPopularity),
    [currentPopularity]
  )
  
  const bestTimeToVisit = useMemo(() => 
    getBestTimeToVisit(popularTimes),
    [popularTimes]
  )
  
  const getDayData = (day: string): DayPopularTimes => {
    if (day === 'today') {
      const now = new Date()
      return popularTimes[now.getDay()] || popularTimes[0]
    }
    return popularTimes.find(pt => pt.day === day) || popularTimes[0]
  }
  
  const currentDayData = getDayData(selectedDay)

  const dayNames = ['היום', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת']
  
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
      </div>
    )
  }
  
  return (
    <div className="space-y-4">
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
          const dayKey = index === 0 ? 'today' : ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][index]
          const isActive = selectedDay === dayKey
          
          return (
            <button
              key={dayName}
              onClick={() => setSelectedDay(dayKey)}
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
          {currentDayData.hours.map((hourData) => {
            const hourStatus = getPopularityStatus(hourData.popularity)
            const isOpenHour = hourData.hour >= 7 && hourData.hour <= 22
            
            return (
              <div key={hourData.hour} className="flex items-center gap-3">
                <span className="text-xs text-slate-600 dark:text-slate-400 w-8">
                  {hourData.hour}:00
                </span>
                
                <div className="flex-1 relative">
                  <div className="h-6 bg-slate-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${hourStatus.bgColor.replace('bg-', 'bg-opacity-60 bg-')}`}
                      style={{ width: `${hourData.popularity}%` }}
                    />
                  </div>
                  
                  {!isOpenHour && (
                    <div className="absolute inset-0 bg-slate-900/20 rounded-full" />
                  )}
                </div>
                
                <span className="text-xs text-slate-600 dark:text-slate-400 w-8 text-right">
                  {hourData.popularity}%
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
      
      {/* Peak hours summary */}
      <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3">
        <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
          <Calendar className="h-4 w-4" />
          <span className="text-sm font-medium">
            שעות שיא: {currentDayData.peakHours.map(h => `${h}:00`).join(', ')}
          </span>
        </div>
      </div>
    </div>
  )
}

// Compact version for cards
export const CompactPopularTimes: React.FC<{
  cafeId: string
  cafeType: 'coffee' | 'matcha'
  city: string
}> = ({ cafeId, cafeType, city }) => {
  const popularTimes = useMemo(() => 
    getCachedPopularTimes(cafeId, cafeType, city),
    [cafeId, cafeType, city]
  )
  
  const currentPopularity = useMemo(() =>
    getCurrentPopularity(popularTimes),
    [popularTimes]
  )
  
  const currentStatus = useMemo(() => 
    getPopularityStatus(currentPopularity),
    [currentPopularity]
  )
  
  return (
    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${currentStatus.bgColor} ${currentStatus.color}`}>
      <Clock className="h-3 w-3" />
      <span>{currentStatus.text}</span>
    </div>
  )
}
