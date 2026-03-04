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
          ? "border border-[#D2D2D7] dark:border-zinc-700 bg-white/90 dark:bg-zinc-900"
          : "border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
      }`}
    >
      {/* Image skeleton */}
      <div className="relative h-56">
        <div className="skeleton h-full w-full" />
        
        {/* Favorite button skeleton */}
        <div className="skeleton absolute left-4 top-4 h-10 w-10 rounded-full" />
        
        {/* Bottom overlay skeleton */}
        <div className="absolute bottom-0 right-0">
          <div className="glass rounded-t-lg rounded-l-lg border-t border-l border-slate-200/70 px-4 py-2.5 dark:border-zinc-700">
            <div className="flex items-center gap-3">
              {/* Shop name skeleton */}
              <div className="skeleton h-5 w-24 rounded" />
              {/* Location skeleton */}
              <div className="skeleton h-4 w-20 rounded" />
              {/* Navigation button skeleton */}
              <div className="skeleton h-7 w-16 rounded-xl" />
            </div>
          </div>
        </div>
      </div>

      {/* Content skeleton */}
      <div className="p-5">
        {/* Description skeleton - 3 lines */}
        <div className="mb-4 space-y-2">
          <div className="skeleton h-4 w-full rounded" />
          <div className="skeleton h-4 w-full rounded" />
          <div className="skeleton h-4 w-3/4 rounded" />
        </div>

        {/* Brew methods / Tags skeleton */}
        <div className="mb-4">
          <div className="skeleton mb-2 h-3 w-20 rounded" />
          <div className="flex flex-wrap gap-1">
            <div className="skeleton h-6 w-16 rounded-full" />
            <div className="skeleton h-6 w-20 rounded-full" />
            <div className="skeleton h-6 w-14 rounded-full" />
          </div>
        </div>

        {/* Opening hours skeleton (optional) */}
        <div className="mb-4">
          <div className="skeleton mb-2 h-3 w-24 rounded" />
          <div className="skeleton h-4 w-32 rounded" />
        </div>

        {/* Notes textarea skeleton */}
        <div className="mt-4">
          <div className="skeleton h-16 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}



