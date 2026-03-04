"use client";

import React from "react";

interface SkeletonProps {
  className?: string;
  variant?: "text" | "rectangular" | "circular" | "card";
  width?: string | number;
  height?: string | number;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = "",
  variant = "rectangular",
  width,
  height,
}) => {
  const baseClasses = "skeleton";
  const variantClasses = {
    text: "rounded",
    rectangular: "rounded",
    circular: "rounded-full",
    card: "rounded-xl",
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

// Pre-built skeleton components for common use cases
export const SkeletonCard: React.FC<{ className?: string }> = ({
  className = "",
}) => (
  <div className={`rounded-2xl overflow-hidden ${className}`}>
    <Skeleton variant="rectangular" height={224} className="w-full" />
    <div className="p-5 space-y-4">
      <Skeleton variant="text" height={24} width="70%" />
      <Skeleton variant="text" height={16} width="50%" />
      <Skeleton variant="text" height={16} width="90%" />
      <Skeleton variant="text" height={16} width="80%" />
      <div className="flex gap-2 mt-4">
        <Skeleton variant="rectangular" height={24} width={60} className="rounded-full" />
        <Skeleton variant="rectangular" height={24} width={60} className="rounded-full" />
        <Skeleton variant="rectangular" height={24} width={60} className="rounded-full" />
      </div>
    </div>
  </div>
);

export const SkeletonMapLoader: React.FC = () => (
  <div className="flex h-full items-center justify-center">
    <div className="space-y-4 text-center">
      <Skeleton variant="rectangular" width={200} height={200} className="rounded-xl mx-auto" />
      <Skeleton variant="text" height={20} width={150} className="mx-auto" />
      <Skeleton variant="text" height={16} width={100} className="mx-auto" />
    </div>
  </div>
);

export const SkeletonListLoader: React.FC<{ count?: number }> = ({
  count = 3,
}) => (
  <div className="space-y-4">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="rounded-xl p-4 space-y-3">
        <Skeleton variant="text" height={20} width="60%" />
        <Skeleton variant="text" height={16} width="40%" />
        <Skeleton variant="text" height={16} width="80%" />
        <div className="flex gap-2">
          <Skeleton variant="rectangular" height={24} width={50} className="rounded-full" />
          <Skeleton variant="rectangular" height={24} width={50} className="rounded-full" />
        </div>
      </div>
    ))}
  </div>
);




