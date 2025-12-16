"use client";

import dynamic from "next/dynamic";
import { useState, useEffect } from "react";
import { ModeContextProvider } from '@/contexts/ModeContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';

// Detect mobile Safari early
function isMobileSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const isIOS = /iP(hone|od|ad)/.test(ua) || 
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isSafari = /Safari/.test(ua) && !/Chrome|CriOS|FxiOS|OPiOS/.test(ua);
  return isIOS && isSafari;
}

// Minimal loading screen
const LoadingScreen = () => (
  <div className="flex h-screen w-screen items-center justify-center bg-gradient-to-br from-[#E0F2FE] via-[#F0F9FF] to-[#DBEAFE] dark:bg-[#0B1120]">
    <div className="text-center">
      <div className="h-12 w-12 border-4 border-[#0284C7] dark:border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
      <p className="text-[#64748B] dark:text-slate-400">טוען...</p>
    </div>
  </div>
);

// Dynamic import for the main guide component to disable SSR
const IsraelCoffeeGuide = dynamic(
  () => import("@/components/IsraelCoffeeGuide"),
  { 
    ssr: false,
    loading: LoadingScreen
  }
);

export default function Home() {
  const [canLoad, setCanLoad] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mobile = isMobileSafari();
    setIsMobile(mobile);
    
    // On mobile Safari, wait longer before loading the component
    // This gives the browser time to stabilize
    if (mobile) {
      const timer = setTimeout(() => {
        setCanLoad(true);
      }, 1500); // 1.5 second delay on mobile Safari
      return () => clearTimeout(timer);
    } else {
      // Desktop: load immediately
      setCanLoad(true);
    }
  }, []);

  // Show loading screen until we're ready to load
  if (!canLoad) {
    return <LoadingScreen />;
  }

  return (
    <ErrorBoundary>
      <ModeContextProvider>
        <IsraelCoffeeGuide />
      </ModeContextProvider>
    </ErrorBoundary>
  );
}
