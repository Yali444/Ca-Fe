"use client";

import dynamic from "next/dynamic";
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { OfflineSupportProvider } from '@/hooks/OfflineSupportProvider';

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
      <OfflineSupportProvider>
        <IsraelCoffeeGuide />
      </OfflineSupportProvider>
    </ErrorBoundary>
  );
}
