"use client";

import dynamic from "next/dynamic";
import { ModeContextProvider } from '@/contexts/ModeContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';

// Dynamic import for the main guide component to disable SSR
const IsraelCoffeeGuide = dynamic(
  () => import("@/components/IsraelCoffeeGuide"),
  { 
    ssr: false
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
