"use client";

import React from "react";

interface ShopCardSkeletonProps {
  appMode?: "coffee" | "matcha";
}

export function ShopCardSkeleton({ appMode = "coffee" }: ShopCardSkeletonProps) {
  const isMatcha = appMode === "matcha";

  return (
    <div
      className={`group overflow-hidden rounded-2xl shadow-lg transition-all duration-300 ${
        isMatcha
          ? "border border-emerald-200 dark:border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30"
          : "border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
      }`}
    >
      {/* Image skeleton */}
      <div className="relative h-56">
        <div className="h-full w-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
        
        {/* Favorite button skeleton */}
        <div className="absolute left-4 top-4 h-10 w-10 rounded-full bg-gray-300 dark:bg-gray-600 animate-pulse" />
        
        {/* Bottom overlay skeleton */}
        <div className="absolute bottom-0 right-0">
          <div className="bg-white dark:bg-zinc-900 rounded-t-lg rounded-l-lg px-4 py-2.5 backdrop-blur-sm border-t border-l border-slate-200 dark:border-zinc-800">
            <div className="flex items-center gap-3">
              {/* Shop name skeleton */}
              <div className="h-5 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              {/* Location skeleton */}
              <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              {/* Navigation button skeleton */}
              <div className="h-7 w-16 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
            </div>
          </div>
        </div>
      </div>

      {/* Content skeleton */}
      <div className="p-5">
        {/* Description skeleton - 3 lines */}
        <div className="mb-4 space-y-2">
          <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          <div className="h-4 w-3/4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>

        {/* Brew methods / Tags skeleton */}
        <div className="mb-4">
          <div className="h-3 w-20 bg-gray-200 dark:bg-gray-700 rounded mb-2 animate-pulse" />
          <div className="flex flex-wrap gap-1">
            <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
            <div className="h-6 w-20 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
            <div className="h-6 w-14 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
          </div>
        </div>

        {/* Opening hours skeleton (optional) */}
        <div className="mb-4">
          <div className="h-3 w-24 bg-gray-200 dark:bg-gray-700 rounded mb-2 animate-pulse" />
          <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>

        {/* Notes textarea skeleton */}
        <div className="mt-4">
          <div className="h-16 w-full bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
        </div>
      </div>
    </div>
  );
}


