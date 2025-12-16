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

// Loading component
const LoadingScreen = () => (
  <div className="flex h-screen w-screen items-center justify-center bg-[#F0F9FF]">
    <div className="text-center">
      <div className="h-10 w-10 border-4 border-[#0284C7] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
      <p className="text-[#64748B]">טוען...</p>
    </div>
  </div>
);

// Simple mobile Safari app - loaded separately
const MobileSafariApp = dynamic(
  () => import("@/components/MobileSafariApp"),
  { ssr: false, loading: LoadingScreen }
);

// Full desktop app
const IsraelCoffeeGuide = dynamic(
  () => import("@/components/IsraelCoffeeGuide"),
  { ssr: false, loading: LoadingScreen }
);

export default function Home() {
  const [isMobile, setIsMobile] = useState<boolean | null>(null);

  useEffect(() => {
    // Detect mobile Safari on client
    setIsMobile(isMobileSafari());
  }, []);

  // Show loading while detecting
  if (isMobile === null) {
    return <LoadingScreen />;
  }

  // Mobile Safari: use simple app (no map, no heavy effects)
  if (isMobile) {
    return (
      <ErrorBoundary>
        <MobileSafariApp />
      </ErrorBoundary>
    );
  }

  // Desktop/other browsers: use full app
  return (
    <ErrorBoundary>
      <ModeContextProvider>
        <IsraelCoffeeGuide />
      </ModeContextProvider>
    </ErrorBoundary>
  );
}
