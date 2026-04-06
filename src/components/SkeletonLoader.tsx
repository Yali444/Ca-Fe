"use client";

import React from "react";

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
export const SkeletonMapLoader: React.FC = () => (
  <div className="flex h-full items-center justify-center bg-slate-50 dark:bg-zinc-900">
    <div className="space-y-6 text-center">
      {/* Map placeholder */}
      <div className="relative">
        <Skeleton variant="rectangular" width={300} height={200} className="rounded-2xl mx-auto shadow-xl" />
        {/* Animated location markers */}
        <div className="absolute top-1/4 left-1/3">
          <div className="w-3 h-3 bg-blue-500 rounded-full animate-ping absolute" />
          <div className="w-3 h-3 bg-blue-500 rounded-full relative" />
        </div>
        <div className="absolute top-1/2 right-1/4">
          <div className="w-3 h-3 bg-emerald-500 rounded-full animate-ping absolute" />
          <div className="w-3 h-3 bg-emerald-500 rounded-full relative" />
        </div>
        <div className="absolute bottom-1/3 left-1/2">
          <div className="w-3 h-3 bg-blue-500 rounded-full animate-ping absolute" />
          <div className="w-3 h-3 bg-blue-500 rounded-full relative" />
        </div>
      </div>
      
      {/* Loading text */}
      <div className="space-y-2">
        <Skeleton variant="text" height={24} width={180} className="mx-auto" />
        <Skeleton variant="text" height={16} width={120} className="mx-auto" />
      </div>
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




