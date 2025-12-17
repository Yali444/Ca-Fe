"use client";

import type { Roastery } from "@/types/roastery";
import { transformCafeToRoastery, type CafeRaw } from "./roasteries";

// Cache for loaded roasteries data
let roasteriesCache: Roastery[] | null = null;

/**
 * Fetches cafes data from JSON file and transforms it to Roastery format
 */
export async function getROASTERIES(): Promise<Roastery[]> {
  // Return cached data if available
  if (roasteriesCache !== null) {
    return roasteriesCache;
  }

  try {
    // Fetch cafes data from JSON file
    const response = await fetch("/data/cafes.json");
    if (!response.ok) {
      throw new Error(`Failed to fetch cafes data: ${response.statusText}`);
    }
    
    const cafesRaw: CafeRaw[] = await response.json();
    
    // Transform cafes to roasteries format
    const roasteries = cafesRaw.map(transformCafeToRoastery);
    
    // Cache the result
    roasteriesCache = roasteries;
    
    return roasteries;
  } catch (error) {
    console.error("Error loading roasteries data:", error);
    throw error;
  }
}




