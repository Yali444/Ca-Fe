"use client";

import { useEffect, useState } from "react";

// Respect reduced motion preference or small screens to trim transitions
export function useReducedMotion() {
  const [reduceMotion, setReduceMotion] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      setPrefersReducedMotion(mq.matches);
      setReduceMotion(mq.matches || window.innerWidth < 768);
    };
    update();
    mq.addEventListener("change", update);
    window.addEventListener("resize", update);
    return () => {
      mq.removeEventListener("change", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return { reduceMotion, prefersReducedMotion };
}
