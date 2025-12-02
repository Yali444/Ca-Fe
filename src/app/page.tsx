"use client";

import dynamic from "next/dynamic";
import { ModeContextProvider } from '@/contexts/ModeContext';

// Dynamic import for the main guide component to disable SSR
const IsraelCoffeeGuide = dynamic(
  () => import("@/components/IsraelCoffeeGuide"),
  { ssr: false }
);

export default function Home() {
  return (
    <ModeContextProvider>
      <IsraelCoffeeGuide />
    </ModeContextProvider>
  );
}
