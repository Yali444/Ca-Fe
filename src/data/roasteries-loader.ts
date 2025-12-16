"use client";

import type { Roastery } from "@/types/roastery";

// Lazy loader for roasteries data to prevent mobile Safari crashes
// This file wraps the actual data file and loads it only when needed

let roasteriesModule: any = null;

export async function loadRoasteriesData() {
  if (roasteriesModule === null) {
    // Dynamic import - only loads when called
    roasteriesModule = await import("./roasteries");
  }
  return roasteriesModule;
}

export async function getROASTERIES(): Promise<Roastery[]> {
  const module = await loadRoasteriesData();
  return module.getROASTERIES();
}
