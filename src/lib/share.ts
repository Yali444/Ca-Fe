/**
 * URL builders and side-effect wrappers for the "share / open in maps"
 * actions on a cafe card.
 *
 * The pure builders (googleMapsUrl, buildShareUrl) are exported so the
 * URL shape stays under test. The side-effect wrapper (openGoogleMaps)
 * exists so call-sites don't repeat the `window.open` boilerplate.
 */

/** Pure: build the `https://www.google.com/maps?q=<lat>,<lng>` URL. */
export const googleMapsUrl = (lat: number, lng: number): string =>
  `https://www.google.com/maps?q=${lat},${lng}`;

/** Open Google Maps in a new tab for the given coordinates. */
export const openGoogleMaps = (lat: number, lng: number): void => {
  window.open(googleMapsUrl(lat, lng), "_blank", "noopener,noreferrer");
};

/**
 * Build a sharable deep-link to a specific cafe by adding `?cafe=<id>`
 * to the site base URL.
 *
 * Base URL resolution, in order:
 *   1. NEXT_PUBLIC_BASE_URL (canonical, set in Vercel)
 *   2. window.location.href (fallback when running locally without env)
 *
 * Returns "" when called server-side (no window). Sharing only happens
 * from a click handler so this branch is for SSR safety, not real use.
 */
export const buildShareUrl = (shopId: string): string => {
  if (typeof window === "undefined") return "";
  const base = process.env.NEXT_PUBLIC_BASE_URL || window.location.href;
  const url = new URL(base);
  url.searchParams.set("cafe", shopId);
  return url.toString();
};
