"use client";

import React from "react";
import Image from "next/image";

interface SkeletonProps {
  className?: string;
  variant?: "text" | "rectangular" | "circular" | "card";
  width?: string | number;
  height?: string | number;
  animated?: boolean;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = "",
  variant = "rectangular",
  width,
  height,
  animated = true,
}) => {
  const baseClasses = `skeleton ${animated ? 'animate-pulse' : ''}`;
  const variantClasses = {
    text: "rounded",
    rectangular: "rounded-lg",
    circular: "rounded-full",
    card: "rounded-2xl",
  };

  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === "number" ? `${width}px` : width;
  if (height) style.height = typeof height === "number" ? `${height}px` : height;

  return (
    <div
      aria-hidden="true"
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      style={style}
    />
  );
};

// Enhanced skeleton card with better visual hierarchy
export const SkeletonCard: React.FC<{ className?: string; animated?: boolean }> = ({
  className = "",
  animated = true,
}) => (
  <div className={`group overflow-hidden rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl ${className}`}>
    {/* Image skeleton */}
    <div className="relative h-56 mx-1 mt-1 overflow-hidden rounded-xl">
      <Skeleton variant="rectangular" height="100%" className="w-full" animated={animated} />
      {/* Favorite button skeleton */}
      <div className="absolute left-4 top-4">
        <Skeleton variant="circular" width={40} height={40} animated={animated} />
      </div>
      {/* Navigation button skeleton */}
      <div className="absolute right-4 bottom-4">
        <Skeleton variant="rectangular" width={60} height={32} className="rounded-xl" animated={animated} />
      </div>
    </div>

    {/* Content skeleton */}
    <div className="p-4 flex flex-col gap-3 flex-1 min-h-[220px]">
      {/* Opening status skeleton */}
      <div className="mb-3">
        <Skeleton variant="rectangular" height={28} width={120} className="rounded-full" animated={animated} />
      </div>
      
      {/* Title and location */}
      <div className="space-y-2">
        <Skeleton variant="text" height={20} width="70%" animated={animated} />
        <Skeleton variant="text" height={16} width="50%" animated={animated} />
      </div>

      {/* Description */}
      <div className="space-y-1">
        <Skeleton variant="text" height={14} width="90%" animated={animated} />
        <Skeleton variant="text" height={14} width="85%" animated={animated} />
        <Skeleton variant="text" height={14} width="75%" animated={animated} />
      </div>

      {/* Brew method tags */}
      <div className="flex flex-wrap gap-1">
        <Skeleton variant="rectangular" height={24} width={60} className="rounded-full" animated={animated} />
        <Skeleton variant="rectangular" height={24} width={60} className="rounded-full" animated={animated} />
        <Skeleton variant="rectangular" height={24} width={60} className="rounded-full" animated={animated} />
      </div>
    </div>
  </div>
);

// Enhanced map loader with better visual feedback
// Map-tab loader: branded logo + small spinner + "טוען..." text, centered.
// Same elegant pattern used on the initial-load AppSkeleton mobile view.
export const SkeletonMapLoader: React.FC = () => (
  <div
    className="flex h-full w-full flex-col items-center justify-center gap-6 bg-slate-50 dark:bg-zinc-900"
    role="status"
    aria-label="טוען מפה"
  >
    <Image
      src="/images/ca_fe_logo.png"
      alt=""
      width={120}
      height={72}
      className="w-32 h-auto object-contain opacity-90"
      priority
    />
    <div className="flex items-center gap-2">
      <svg
        className="animate-spin h-5 w-5 text-[#0284C7]"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4l-3 3 3 3H4a8 8 0 010-16z"
        />
      </svg>
      <span
        className="text-sm text-[#0284C7] font-medium"
        style={{ fontFamily: "var(--font-aran), sans-serif" }}
      >
        טוען...
      </span>
    </div>
  </div>
);

// Enhanced list loader
export const SkeletonListLoader: React.FC<{ count?: number; animated?: boolean }> = ({
  count = 3,
  animated = true,
}) => (
  <div className="space-y-4">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="group rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-3 transition-all duration-300 hover:shadow-lg">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 space-y-2">
            <Skeleton variant="text" height={20} width="60%" animated={animated} />
            <Skeleton variant="text" height={16} width="40%" animated={animated} />
          </div>
          <Skeleton variant="rectangular" height={32} width={80} className="rounded-xl" animated={animated} />
        </div>
        
        <Skeleton variant="text" height={14} width="80%" animated={animated} />
        <Skeleton variant="text" height={14} width="70%" animated={animated} />
        
        <div className="flex gap-2">
          <Skeleton variant="rectangular" height={24} width={50} className="rounded-full" animated={animated} />
          <Skeleton variant="rectangular" height={24} width={50} className="rounded-full" animated={animated} />
          <Skeleton variant="rectangular" height={24} width={50} className="rounded-full" animated={animated} />
        </div>
      </div>
    ))}
  </div>
);

// Full-app layout skeleton — mirrors the real sidebar + map layout
// shown during the pre-mount / initial hydration window
export const AppSkeleton: React.FC = () => (
  <div className="flex h-screen w-screen overflow-hidden bg-gradient-to-br from-[#E0F2FE] via-[#F0F9FF] to-[#DBEAFE] dark:bg-[#0B1120]" dir="rtl" role="status" aria-label="טוען">
    {/* ── Sidebar (right, same width as real sidebar w-80) ── */}
    <div className="hidden md:flex flex-col w-80 shrink-0 h-full border-l border-slate-200/60 dark:border-slate-800 bg-white/70 dark:bg-zinc-900/80 backdrop-blur-xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-5 py-4" style={{ borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
        <Image src="/images/ca_fe_logo.png" alt="" width={80} height={48} className="h-12 w-auto object-contain opacity-80" />
        <div className="flex items-center gap-2">
          <Skeleton variant="circular" width={32} height={32} />
          <Skeleton variant="circular" width={32} height={32} />
        </div>
      </div>

      {/* Search input */}
      <div className="px-4 py-3">
        <Skeleton variant="rectangular" height={38} className="rounded-md w-full" />
      </div>

      {/* Nav buttons */}
      <div className="px-3 space-y-1 pb-2">
        <Skeleton variant="rectangular" height={44} className="rounded-xl w-full" />
        <Skeleton variant="rectangular" height={44} className="rounded-xl w-full" />
      </div>

      {/* Add place button */}
      <div className="px-6 pb-3">
        <Skeleton variant="rectangular" height={34} className="rounded-xl w-full" />
      </div>

      {/* Filters label */}
      <div className="px-6 pb-2 pt-1">
        <Skeleton variant="text" height={12} width={60} />
      </div>

      {/* Filter chips */}
      <div className="px-6 space-y-4">
        {[80, 96, 72].map((w, i) => (
          <Skeleton key={i} variant="rectangular" height={28} width={w} className="rounded-full" />
        ))}
        {/* Brew methods */}
        <div className="flex gap-2 flex-wrap">
          {[64, 52, 72].map((w, i) => (
            <Skeleton key={i} variant="rectangular" height={26} width={w} className="rounded-full" />
          ))}
        </div>
      </div>
    </div>

    {/* ── Main map area (desktop) ── */}
    <div className="hidden md:block flex-1 relative overflow-hidden">
      {/* Shimmer base */}
      <div className="absolute inset-0 skeleton opacity-60" />
      {/* Tile grid hint */}
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage: "linear-gradient(#64748b 1px, transparent 1px), linear-gradient(90deg, #64748b 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />
      {/* Pinging markers */}
      {([
        { top: "38%", left: "44%", size: "h-4 w-4", delay: "0s" },
        { top: "52%", left: "28%", size: "h-3 w-3", delay: "0.4s" },
        { top: "29%", left: "60%", size: "h-3 w-3", delay: "0.8s" },
        { top: "65%", left: "55%", size: "h-2.5 w-2.5", delay: "1.2s" },
      ] as const).map((m, i) => (
        <div key={i} className="absolute" style={{ top: m.top, left: m.left }}>
          <span className={`absolute inline-flex ${m.size} rounded-full bg-blue-400 opacity-75 animate-ping`} style={{ animationDelay: m.delay }} />
          <span className={`relative inline-flex ${m.size} rounded-full bg-blue-500`} />
        </div>
      ))}
    </div>

    {/* ── Mobile: logo + spinner centered, bottom bar ── */}
    <div className="md:hidden flex-1 flex flex-col items-center justify-center gap-6">
      <Image
        src="/images/ca_fe_logo.png"
        alt=""
        width={120}
        height={72}
        className="w-32 h-auto object-contain opacity-90"
      />
      {/* Spinner */}
      <div className="flex items-center gap-2">
        <svg className="animate-spin h-5 w-5 text-[#0284C7]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4l-3 3 3 3H4a8 8 0 010-16z" />
        </svg>
        <span className="text-sm text-[#0284C7] font-medium" style={{ fontFamily: "var(--font-aran), sans-serif" }}>
          טוען...
        </span>
      </div>
      {/* Bottom bar */}
      <div className="absolute bottom-0 inset-x-0 h-20 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800 flex items-center justify-around px-8">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} variant="circular" width={34} height={34} />
        ))}
      </div>
    </div>
  </div>
);

// New: Skeleton for search results
export const SkeletonSearchResults: React.FC<{ count?: number }> = ({ count = 5 }) => (
  <div className="space-y-3">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="flex items-center gap-4 p-3 rounded-xl border border-slate-200 dark:border-zinc-800">
        <Skeleton variant="circular" width={48} height={48} />
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" height={18} width="60%" />
          <Skeleton variant="text" height={14} width="40%" />
        </div>
        <Skeleton variant="rectangular" width={80} height={32} className="rounded-lg" />
      </div>
    ))}
  </div>
);




