"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"
import type { ThemeProviderProps as NextThemesProviderProps } from "next-themes"
import { MotionConfig } from "framer-motion"

type ThemeProviderProps = {
  children: React.ReactNode
} & Omit<NextThemesProviderProps, "children">

export function ThemeProvider({
  children,
  ...props
}: ThemeProviderProps) {
  return (
    <NextThemesProvider
      {...props}
      storageKey="coffee-guide-theme"
    >
      {/* globals.css's prefers-reduced-motion rule only neutralises CSS
          animations — framer-motion animates inline styles from JS and is
          unaffected by it, so the spring sheets/panels animated in full for
          users who asked for less motion. `reducedMotion="user"` makes every
          framer-motion animation in the app honour the OS setting: transforms
          are dropped, opacity fades are kept (Apple design §14 — a gentler
          equivalent, not "no feedback"). */}
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </NextThemesProvider>
  )
}
