"use client"

import React from 'react'
import { _useOfflineSupportCore, OfflineSupportContext } from './useOfflineSupport'

export function OfflineSupportProvider({ children }: { children: React.ReactNode }) {
  const value = _useOfflineSupportCore()
  return (
    <OfflineSupportContext.Provider value={value}>
      {children}
    </OfflineSupportContext.Provider>
  )
}
