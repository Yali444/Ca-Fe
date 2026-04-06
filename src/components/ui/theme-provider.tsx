"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"
import type { ThemeProviderProps as NextThemesProviderProps } from "next-themes"

type ThemeProviderProps = {
  children: React.ReactNode
} & Omit<NextThemesProviderProps, "children">

// Helper function to get sunrise/sunset times for Israel (Tel Aviv coordinates) with caching
const getSunriseSunset = async () => {
  const today = new Date().toISOString().split('T')[0];
  const cacheKey = `sun-times-${today}`;
  
  // Check cache first
  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    try {
      const { data, timestamp } = JSON.parse(cached);
      // Cache is valid for 2 hours
      if (Date.now() - timestamp < 2 * 60 * 60 * 1000) {
        return data;
      }
    } catch (error) {
      console.warn('Failed to parse cached sun times:', error);
    }
  }
  
  try {
    // Using Tel Aviv coordinates for Israel timezone
    const lat = 32.0853;
    const lng = 34.7818;
    
    const response = await fetch(
      `https://api.sunrisesunset.io/json?lat=${lat}&lng=${lng}&date=${today}`
    );
    
    if (!response.ok) {
      console.warn('Failed to fetch sunrise/sunset data, falling back to default times');
      return { sunrise: '06:00', sunset: '18:00' };
    }
    
    const apiData = await response.json();
    const sunTimes = {
      sunrise: apiData.results.sunrise,
      sunset: apiData.results.sunset
    };
    
    // Cache the result
    localStorage.setItem(cacheKey, JSON.stringify({
      data: sunTimes,
      timestamp: Date.now()
    }));
    
    return sunTimes;
  } catch (error) {
    console.warn('Error fetching sunrise/sunset data:', error);
    // Fallback to default times for Israel
    return { sunrise: '06:00', sunset: '18:00' };
  }
};

// Helper function to check if current time is between sunrise and sunset
const isDaytime = (sunrise: string, sunset: string): boolean => {
  const now = new Date();
  const currentTime = now.getHours() * 60 + now.getMinutes();
  
  const [sunriseHour, sunriseMin] = sunrise.split(':').map(Number);
  const [sunsetHour, sunsetMin] = sunset.split(':').map(Number);
  
  const sunriseTime = sunriseHour * 60 + sunriseMin;
  const sunsetTime = sunsetHour * 60 + sunsetMin;
  
  return currentTime >= sunriseTime && currentTime < sunsetTime;
};

export function ThemeProvider({
  children,
  ...props
}: ThemeProviderProps) {
  const [autoTheme, setAutoTheme] = React.useState<"light" | "dark">("light");
  const [sunTimes, setSunTimes] = React.useState({ sunrise: '06:00', sunset: '18:00' });

  React.useEffect(() => {
    const updateTheme = async () => {
      const times = await getSunriseSunset();
      setSunTimes(times);
      
      const shouldBeLight = isDaytime(times.sunrise, times.sunset);
      const newTheme = shouldBeLight ? "light" : "dark";
      setAutoTheme(newTheme);
      
      // Update the HTML class directly
      const root = document.documentElement;
      if (newTheme === "dark") {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }
      
      // Store in localStorage
      localStorage.setItem("coffee-guide-theme", newTheme);
    };

    // Update immediately
    updateTheme();
    
    // Update every minute to handle theme changes
    const interval = setInterval(updateTheme, 60000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <NextThemesProvider 
      {...props} 
      defaultTheme="system"
      storageKey="coffee-guide-theme"
      forcedTheme={autoTheme}
    >
      {children}
    </NextThemesProvider>
  );
}
