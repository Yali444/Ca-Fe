"use client";

import dynamic from "next/dynamic";
import { ErrorBoundary } from "@/components/ErrorBoundary";

// Client-only: the guide manages the map, geolocation and other browser APIs,
// so it's dynamically imported with SSR disabled. Split out of page.tsx so the
// page itself can stay a server component and expose generateMetadata + JSON-LD.
const IsraelCoffeeGuide = dynamic(() => import("@/components/IsraelCoffeeGuide"), {
  ssr: false,
});

export default function HomeClient() {
  return (
    <ErrorBoundary>
      <IsraelCoffeeGuide />
    </ErrorBoundary>
  );
}
