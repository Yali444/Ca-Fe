"use client";

import dynamic from "next/dynamic";
import { ModeContextProvider } from '@/contexts/ModeContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';

// Dynamic import for the main guide component to disable SSR
// The component itself handles mobile Safari optimizations internally
const IsraelCoffeeGuide = dynamic(
  () => import("@/components/IsraelCoffeeGuide"),
  { 
    ssr: false,
    loading: () => (
      <div className="flex h-screen w-screen items-center justify-center bg-gradient-to-br from-[#E0F2FE] via-[#F0F9FF] to-[#DBEAFE] dark:bg-[#0B1120]">
        <div className="text-center">
          <div className="h-12 w-12 border-4 border-[#0284C7] dark:border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#64748B] dark:text-slate-400">טוען...</p>
        </div>
      </div>
    )
  }
);

export default function Home() {
  return (
    <ErrorBoundary>
      <ModeContextProvider>
        <IsraelCoffeeGuide />
      </ModeContextProvider>
    </ErrorBoundary>
  );
}
