"use client";

import dynamic from "next/dynamic";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { InitialLoading } from "@/components/InitialLoading";

// Client-only: the guide manages the map, geolocation and other browser APIs,
// so it's dynamically imported with SSR disabled. Split out of page.tsx so the
// page itself can stay a server component and expose generateMetadata + JSON-LD.
//
// `loading` matters here, not just cosmetically: the guide chunk (plus
// everything it pulls in) is ~900KB, which can take several seconds on a slow
// connection. Without a `loading` fallback, `dynamic()` renders null until
// that chunk finishes — a blank white screen the whole time, since the app's
// own AppSkeleton lives inside that same chunk and can't paint any earlier
// than the real content can. InitialLoading is a separate, minimal component
// so it ships in the initial page JS and can paint immediately.
const IsraelCoffeeGuide = dynamic(() => import("@/components/IsraelCoffeeGuide"), {
  ssr: false,
  loading: () => <InitialLoading />,
});

export default function HomeClient() {
  return (
    <ErrorBoundary>
      <IsraelCoffeeGuide />
    </ErrorBoundary>
  );
}
