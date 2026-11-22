/** Business identity and visiting arrangements are independent of catalogue visibility. */
export interface BusinessDetails {
  /** Date this entry was added to cafes.json (YYYY-MM-DD). */
  addedAt?: string;
  businessType?: "cafe" | "roastery" | "workshops";
  visitMode?: "public" | "appointment" | "online";
  visitNote?: string;
  /** Verified destination for buying online; absent for informational websites. */
  shopUrl?: string;
}
