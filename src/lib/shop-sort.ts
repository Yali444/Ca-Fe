/**
 * Catalogue sort options for the shops list (used when browsing without a
 * GPS/address location). 'area' groups results by region; the others render a
 * flat, sorted list. Kept in lib (not the view) so the URL-sync helper can
 * validate sort values without importing a component.
 */
export type ShopSortBy = "area" | "openNow" | "name";

export const SHOP_SORT_VALUES: ShopSortBy[] = ["area", "openNow", "name"];

/** Narrow an arbitrary string to a valid ShopSortBy, or null if unrecognised. */
export const parseShopSortBy = (value: string | null | undefined): ShopSortBy | null =>
  value && (SHOP_SORT_VALUES as string[]).includes(value) ? (value as ShopSortBy) : null;
