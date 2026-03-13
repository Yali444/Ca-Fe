"use client"

import * as React from "react"
import { Moon, Sun, Clock } from "lucide-react"
import { useTheme } from "next-themes"
import { motion, AnimatePresence } from "framer-motion"

import { LiquidButton } from "@/components/ui/liquid-glass-button"

// Helper functions for sunrise/sunset
const getSunriseSunset = async () => {
  try {
    const lat = 32.0853; // Tel Aviv
    const lng = 34.7818;
    const today = new Date().toISOString().split('T')[0];
    
    const response = await fetch(
      `https://api.sunrisesunset.io/json?lat=${lat}&lng=${lng}&date=${today}`
    );
    
    if (!response.ok) {
      return { sunrise: '06:00', sunset: '18:00' };
    }
    
    const data = await response.json();
    return {
      sunrise: data.results.sunrise,
      sunset: data.results.sunset
    };
  } catch (error) {
    return { sunrise: '06:00', sunset: '18:00' };
  }
};

const isDaytime = (sunrise: string, sunset: string): boolean => {
  const now = new Date();
  const currentTime = now.getHours() * 60 + now.getMinutes();
  
  const [sunriseHour, sunriseMin] = sunrise.split(':').map(Number);
  const [sunsetHour, sunsetMin] = sunset.split(':').map(Number);
  
  const sunriseTime = sunriseHour * 60 + sunriseMin;
  const sunsetTime = sunsetHour * 60 + sunsetMin;
  
  return currentTime >= sunriseTime && currentTime < sunsetTime;
};

export function ThemeToggle() {
  const { theme, setTheme, systemTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)
  const [sunTimes, setSunTimes] = React.useState({ sunrise: '06:00', sunset: '18:00' })
  const [isAutoMode, setIsAutoMode] = React.useState(true)

  React.useEffect(() => {
    setMounted(true)
    
    const updateSunTimes = async () => {
      const times = await getSunriseSunset()
      setSunTimes(times)
    }
    
    updateSunTimes()
    const interval = setInterval(updateSunTimes, 60000) // Update every minute
    
    return () => clearInterval(interval)
  }, [])

  if (!mounted) {
    return null
  }

  const currentTheme = theme === "system" ? systemTheme : theme
  const isDark = currentTheme === "dark"
  const isCurrentlyDaytime = isDaytime(sunTimes.sunrise, sunTimes.sunset)
  const autoShouldBeDark = !isCurrentlyDaytime

  const handleToggle = () => {
    if (isAutoMode) {
      // Switch to manual mode
      setIsAutoMode(false)
      setTheme(isDark ? "light" : "dark")
    } else {
      // Toggle manually
      setTheme(isDark ? "light" : "dark")
    }
  }

  const handleLongPress = () => {
    // Return to auto mode
    setIsAutoMode(true)
    setTheme("system")
  }

  return (
    <div className="relative">
      <LiquidButton
        variant="ghost"
        size="icon"
        onClick={handleToggle}
        onContextMenu={(e) => {
          e.preventDefault()
          handleLongPress()
        }}
        type="button"
        aria-label="Toggle theme"
        className="relative flex items-center justify-center"
        title={isAutoMode ? `אוטומטי: ${isCurrentlyDaytime ? 'יום' : 'לילה'} (${sunTimes.sunrise} - ${sunTimes.sunset})\nלחץ ימני לחזרה למצב ידני` : 'מצב ידני\nלחץ ימני למצב אוטומטי'}
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
                <Moon className="h-[1.2rem] w-[1.2rem]" />
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
                <Sun className="h-[1.2rem] w-[1.2rem]" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        {/* Auto mode indicator */}
        {isAutoMode && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-green-500"
            title="מצב אוטומטי"
          />
        )}
        <span className="sr-only">Toggle theme</span>
      </LiquidButton>
      
      {/* Tooltip showing current status */}
      <div className="absolute top-full right-0 mt-1 px-2 py-1 bg-black/80 text-white text-xs rounded opacity-0 hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
        {isAutoMode ? (
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{isCurrentlyDaytime ? 'יום' : 'לילה'} ({sunTimes.sunrise}-{sunTimes.sunset})</span>
          </div>
        ) : (
          <span>מצב ידני</span>
        )}
      </div>
    </div>
  )
}
