"use client";

import { useEffect, useState } from "react";

// Respect reduced motion preference or small screens to trim transitions.
//
// Both conditions are expressed as media queries and observed via `change`
// events. The width check used to ride on a `resize` listener that called
// setState on every resize event of the drag; matchMedia only fires when the
// query result actually flips.
export function useReducedMotion() {
  const [reduceMotion, setReduceMotion] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const smallScreenQuery = window.matchMedia("(max-width: 767px)");

    const update = () => {
      setPrefersReducedMotion(motionQuery.matches);
      setReduceMotion(motionQuery.matches || smallScreenQuery.matches);
    };
    update();

    motionQuery.addEventListener("change", update);
    smallScreenQuery.addEventListener("change", update);
    return () => {
      motionQuery.removeEventListener("change", update);
      smallScreenQuery.removeEventListener("change", update);
    };
  }, []);

  return { reduceMotion, prefersReducedMotion };
}
