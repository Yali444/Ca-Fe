"use client";

import { useEffect, useState } from "react";

// Detect iOS Safari which is more likely to crash on heavy animated layers
export function useIsMobileSafari() {
  const [isMobileSafari, setIsMobileSafari] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const ua = navigator.userAgent || "";
    const isIOS =
      /iP(hone|od|ad)/.test(ua) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const isSafari =
      /Safari/.test(ua) && !/Chrome|CriOS|FxiOS|OPiOS/.test(ua);
    // UA detection runs after hydration on purpose (navigator is unavailable
    // during SSR), so seeding false and correcting here is intentional.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMobileSafari(isIOS && isSafari);
  }, []);

  return isMobileSafari;
}
