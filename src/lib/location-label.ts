/**
 * Most addresses already end with the city (e.g. "החשמל 12, תל אביב").
 * Avoid rendering "תל אביב · החשמל 12, תל אביב".
 */
export function formatLocationAddress(
  city?: string | null,
  address?: string | null,
): string {
  const location = city?.trim() ?? "";
  const street = address?.trim() ?? "";
  if (!street) return location;
  if (!location || street.includes(location)) return street;
  return `${street} · ${location}`;
}
