"use client"

import * as React from "react"
import { Icon } from "@/components/ui/Icon"
import { useTheme } from "next-themes"
import { motion, AnimatePresence } from "framer-motion"

import { LiquidButton } from "@/components/ui/liquid-glass-button"

export function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  const isDark = resolvedTheme === "dark"

  const handleToggle = () => {
    setTheme(isDark ? "light" : "dark")
  }

  return (
    <LiquidButton
      variant="ghost"
      size="icon"
      onClick={handleToggle}
      type="button"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="relative flex items-center justify-center"
    >
      <div className="relative h-[1.2rem] w-[1.2rem] overflow-hidden flex items-center justify-center">
        <AnimatePresence mode="wait" initial={false}>
          {isDark ? (
            <motion.div
              key="moon"
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <Icon name="Moon" className="h-[1.2rem] w-[1.2rem]" />
            </motion.div>
          ) : (
            <motion.div
              key="sun"
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <Icon name="Sun" className="h-[1.2rem] w-[1.2rem]" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <span className="sr-only">Toggle theme</span>
    </LiquidButton>
  )
}
