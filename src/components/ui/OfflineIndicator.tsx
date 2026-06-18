"use client"

import React, { useState } from 'react'
import { Icon } from '@/components/ui/Icon'
import { useOfflineSupport } from '@/hooks/useOfflineSupport'

export const OfflineIndicator: React.FC = () => {
  const [showDetails, setShowDetails] = useState(false)
  const [confirmingClear, setConfirmingClear] = useState(false)
  const {
    isOnline,
    isOfflineMode,
    lastSyncTime,
    syncData,
    clearCaches,
    cacheCafeData
  } = useOfflineSupport()

  const handleSync = async () => {
    await syncData()
  }

  const handleClearCache = async () => {
    await clearCaches()
    setConfirmingClear(false)
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
            <Icon name="Wifi" className="h-5 w-5 text-green-500" />
          ) : (
            <Icon name="WifiOff" className="h-5 w-5 text-red-500" />
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
            <Icon name="Database" className="h-4 w-4 text-slate-600 dark:text-slate-400" />
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
            <div className="flex flex-wrap gap-2">
              {isOnline && (
                <button
                  onClick={handleSync}
                  className="flex min-h-[40px] items-center gap-1 px-3 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  <Icon name="RefreshCw" className="h-4 w-4" />
                  סנכרן נתונים
                </button>
              )}

              <button
                onClick={handleCacheData}
                className="flex min-h-[40px] items-center gap-1 px-3 py-2 text-sm bg-emerald-500 text-white rounded-lg hover:bg-emerald-600"
              >
                <Icon name="Database" className="h-4 w-4" />
                שמור נתונים
              </button>

              {!confirmingClear ? (
                <button
                  onClick={() => setConfirmingClear(true)}
                  className="flex min-h-[40px] items-center gap-1 px-3 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600"
                >
                  <Icon name="Trash2" className="h-4 w-4" />
                  נקה מטמון
                </button>
              ) : (
                <div className="flex w-full flex-col gap-2 rounded-lg bg-red-50 dark:bg-red-900/20 p-2">
                  <p className="text-xs text-red-700 dark:text-red-300">
                    לנקות את כל המטמון? יידרש חיבור לאינטרנט לטעינה מחדש.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleClearCache}
                      className="flex min-h-[40px] flex-1 items-center justify-center gap-1 px-3 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600"
                    >
                      <Icon name="Trash2" className="h-4 w-4" />
                      כן, נקה
                    </button>
                    <button
                      onClick={() => setConfirmingClear(false)}
                      className="min-h-[40px] flex-1 px-3 py-2 text-sm bg-slate-200 dark:bg-zinc-700 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-300 dark:hover:bg-zinc-600"
                    >
                      ביטול
                    </button>
                  </div>
                </div>
              )}
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
        <Icon name="WifiOff" className="h-4 w-4" />
        <span>מצב לא מקוון - גולשים מהמטמון</span>
      </div>
    </div>
  )
}
