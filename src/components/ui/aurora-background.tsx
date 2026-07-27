"use client";

import { cn } from "@/lib/utils";
import React, { ReactNode } from "react";

interface AuroraBackgroundProps extends React.HTMLProps<HTMLDivElement> {
  children: ReactNode;
  showRadialGradient?: boolean;
}

/**
 * Animated aurora gradient behind the shops catalogue.
 *
 * Two properties here were disproportionately expensive while the list
 * scrolls: `background-attachment: fixed` on the animated `::after` pinned the
 * gradient to the viewport, forcing a full-screen re-rasterisation on every
 * scroll frame, and `mix-blend-difference` without a stacking context made the
 * browser blend against everything painted behind it. The attachment is gone
 * (the layer is absolutely positioned inside a non-scrolling container, so it
 * never moved with scroll to begin with) and `isolation`/`contain` now confine
 * the blend and its repaints to this element.
 */
export const AuroraBackground = ({
  className,
  children,
  showRadialGradient = true,
  ...props
}: AuroraBackgroundProps) => {
  return (
      <div
        className={cn(
        "relative flex flex-col h-full w-full items-center justify-center bg-zinc-50 dark:bg-[#0B1120] text-slate-950 dark:text-slate-200 transition-bg",
          className
        )}
        {...props}
      >
      <div className="absolute inset-0 overflow-hidden z-0">
          <div
            className={cn(
              `
            [--white-gradient:repeating-linear-gradient(100deg,var(--white)_0%,var(--white)_7%,var(--transparent)_10%,var(--transparent)_12%,var(--white)_16%)]
            [--dark-gradient:repeating-linear-gradient(100deg,var(--black)_0%,var(--black)_7%,var(--transparent)_10%,var(--transparent)_12%,var(--black)_16%)]
            [--aurora:repeating-linear-gradient(100deg,var(--blue-500)_10%,var(--indigo-300)_15%,var(--blue-300)_20%,var(--violet-200)_25%,var(--blue-400)_30%)]
            [background-image:var(--white-gradient),var(--aurora)]
            dark:[background-image:var(--dark-gradient),var(--aurora)]
            [background-size:300%,_200%]
            [background-position:50%_50%,50%_50%]
            filter blur-[10px] invert dark:invert-0
            after:content-[""] after:absolute after:inset-0 after:[background-image:var(--white-gradient),var(--aurora)] 
            after:dark:[background-image:var(--dark-gradient),var(--aurora)]
            after:[background-size:200%,_100%]
            after:animate-aurora after:mix-blend-difference
            aurora-layer
            pointer-events-none
            absolute -inset-[10px] opacity-50 will-change-transform
            [isolation:isolate] [contain:paint]
            transition-[filter,opacity] duration-[150ms] ease-[cubic-bezier(0.4,0,0.2,1)]`,
              showRadialGradient &&
              `[mask-image:radial-gradient(ellipse_at_100%_0%,black_10%,transparent_70%)]`
            )}
          ></div>
        </div>
      <div className="relative z-10 h-full w-full">
        {children}
      </div>
    </div>
  );
};
