"use client";

import { useSyncExternalStore } from "react";

// No-op subscribe: this store never changes, so React only reads the snapshot.
const subscribe = () => () => {};

// Returns `false` on the server (so SSR matches the initial client render)
// and `true` after hydration. Using useSyncExternalStore avoids the
// set-state-in-effect cascade that the older useEffect/setState pattern
// triggered in React 19.
export function useHasMounted(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
