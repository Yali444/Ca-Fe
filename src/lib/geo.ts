/**
 * Great-circle distance between two lat/lng points in kilometers
 * (Haversine formula, mean Earth radius = 6371 km).
 */
export const calculateDistance = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/** Default map center when there are no shops to average — Jerusalem. */
export const DEFAULT_MAP_CENTER: [number, number] = [31.7683, 35.2137];

/**
 * Arithmetic-mean center of a list of lat/lng points. Returns
 * DEFAULT_MAP_CENTER for an empty list.
 *
 * This is the centroid in equirectangular space, not a great-circle
 * midpoint — fine for the Israel-sized bounding box this app uses, but
 * would be wrong for globe-scale inputs.
 */
export const calculateMapCenter = (
  shops: Array<{ lat: number; lng: number }>,
): [number, number] => {
  if (shops.length === 0) return DEFAULT_MAP_CENTER;

  const avgLat = shops.reduce((sum, s) => sum + s.lat, 0) / shops.length;
  const avgLng = shops.reduce((sum, s) => sum + s.lng, 0) / shops.length;
  return [avgLat, avgLng];
};
