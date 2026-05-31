"use client"

import React, { useState } from 'react'
import { Wifi, WifiOff, RefreshCw, Database, Trash2 } from 'lucide-react'
import { useOfflineSupport } from '@/hooks/useOfflineSupport'

export const OfflineIndicator: React.FC = () => {
  const [showDetails, setShowDetails] = useState(false)
  const { 
    isOnline, 
    isOfflineMode, 
    lastSyncTime, 
    syncData, 
    clearCaches, 
    getCacheInfo,
    cacheCafeData
  } = useOfflineSupport()

  const handleSync = async () => {
    await syncData()
  }

  const handleClearCache = async () => {
    if (confirm('לנקות את כל המטמון? זה ידרוש חיבור לאינטרנט לטעינה מחדש.')) {
      await clearCaches()
    }
  }

  const handleCacheData = async () => {
    const success = await cacheCafeData()
    if (success) {
      alert('הנתונים נשמרו בהצלחה לגלישה ללא אינטרנט')
    }
  }

  if (!isOfflineMode && isOnline) {
    return null // Don't show anything when online and not in offline mode
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-lg border border-slate-200 dark:border-zinc-700 p-4 max-w-sm">
        {/* Main indicator */}
        <div className="flex items-center gap-3 mb-2">
          {isOnline ? (
            <Wifi className="h-5 w-5 text-green-500" />
          ) : (
            <WifiOff className="h-5 w-5 text-red-500" />
          )}
          
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
              {isOnline ? 'מחובר לאינטרנט' : 'מצב לא מקוון'}
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              {isOnline 
                ? 'כל הפונקציות זמינות' 
                : 'גולשים מהמטמון המקומי'
              }
            </p>
          </div>

          <button
            onClick={() => setShowDetails(!showDetails)}
            aria-label={showDetails ? "הסתר פרטי מטמון" : "הצג פרטי מטמון"}
            aria-expanded={showDetails}
            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-zinc-700"
          >
            <Database className="h-4 w-4 text-slate-600 dark:text-slate-400" />
          </button>
        </div>

        {/* Last sync info */}
        {lastSyncTime && (
          <div className="text-xs text-slate-500 dark:text-slate-400 mb-2">
            סנכרון אחרון: {lastSyncTime.toLocaleTimeString('he-IL')}
          </div>
        )}

        {/* Detailed controls */}
        {showDetails && (
          <div className="border-t border-slate-200 dark:border-zinc-700 pt-3 mt-3 space-y-2">
            <div className="flex gap-2">
              {isOnline && (
                <button
                  onClick={handleSync}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  <RefreshCw className="h-3 w-3" />
                  סנכרן נתונים
                </button>
              )}
              
              <button
                onClick={handleCacheData}
                className="flex items-center gap-1 px-3 py-1.5 text-xs bg-emerald-500 text-white rounded hover:bg-emerald-600"
              >
                <Database className="h-3 w-3" />
                שמור נתונים
              </button>
              
              <button
                onClick={handleClearCache}
                className="flex items-center gap-1 px-3 py-1.5 text-xs bg-red-500 text-white rounded hover:bg-red-600"
              >
                <Trash2 className="h-3 w-3" />
                נקה מטמון
              </button>
            </div>

            {!isOnline && (
              <div className="text-xs text-amber-600 dark:text-amber-400 p-2 bg-amber-50 dark:bg-amber-900/20 rounded">
                <strong>טיפ:</strong> הנתונים האחרונים שנשמרו זמינים לגלישה. חלק מהתכונות עלולות לא לעבוד ללא חיבור.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// Simple offline banner for mobile
export const OfflineBanner: React.FC = () => {
  const { isOnline, isOfflineMode } = useOfflineSupport()

  if (isOnline || !isOfflineMode) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-white text-center py-2 px-4">
      <div className="flex items-center justify-center gap-2 text-sm">
        <WifiOff className="h-4 w-4" />
        <span>מצב לא מקוון - גולשים מהמטמון</span>
      </div>
    </div>
  )
}
