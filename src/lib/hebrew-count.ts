/** Human-readable count labels with correct singular Hebrew grammar. */
export function formatPlacesCount(count: number): string {
  return count === 1 ? "מקום אחד" : `${count} מקומות`;
}

export function formatRecommendedPlacesCount(count: number): string {
  return count === 1 ? "מקום מומלץ אחד" : `${count} מקומות מומלצים`;
}

export function formatCityCafeCount(count: number, city: string): string {
  return count === 1
    ? `מקום מומלץ אחד ב${city}`
    : `${count} בתי קפה ובתי קלייה מומלצים ב${city}`;
}
