// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { ShopsView } from "./ShopsView";
import { useFilters } from "@/hooks/useFilters";

vi.mock("./ShopCard", () => ({ default: () => null }));
afterEach(cleanup);

function Catalogue() {
  const { filters, actions } = useFilters();
  return <ShopsView
    error={null} filteredShops={[]} paginatedFilteredShops={[]}
    paginatedGroupedShops={null} groupedAreaTotalCounts={new Map()}
    availableRegions={[]} addressLocation={null} userLocation={null}
    lastSearchedAddress="" addressQuery="" selectedRegionFilter={null}
    favoritesActive={filters.favoritesFilter}
    hasActiveFilters={filters.favoritesFilter || filters.sellsBeansFilter || filters.selectedBrewMethods.length > 0}
    favorites={["saved-cafe"]} shopsToDisplay={12} gridColsClass="grid-cols-1"
    getRating={() => null} onClearAddressSearch={() => {}} onSelectRegion={() => {}}
    onSelectShop={() => {}} onToggleFavorite={() => {}} onShowMore={() => {}}
    onClearUserLocation={() => {}} onClearAllFilters={actions.reset}
    selectedBrewMethods={filters.selectedBrewMethods} sellsBeansFilter={filters.sellsBeansFilter}
    onToggleBrewMethod={actions.toggleBrewMethod} onToggleSellsBeans={actions.toggleSellsBeans}
    onToggleFavorites={actions.toggleFavorites}
  />;
}

it("keeps shortcuts usable with zero results and combines, toggles, and clears the shared filters", () => {
  render(<Catalogue />);
  const filter = screen.getByRole("button", { name: "בא לי פילטר" });
  const beans = screen.getByRole("button", { name: "פולים הביתה" });
  const saved = screen.getByRole("button", { name: /המקומות ששמרתי/ });
  fireEvent.click(filter);
  fireEvent.click(beans);
  fireEvent.click(saved);
  for (const button of [filter, beans, saved]) expect(button).toHaveAttribute("aria-pressed", "true");
  fireEvent.click(filter);
  expect(filter).toHaveAttribute("aria-pressed", "false");
  expect(beans).toHaveAttribute("aria-pressed", "true");
  fireEvent.click(screen.getByRole("button", { name: "ניקוי סינון" }));
  for (const button of [filter, beans, saved]) expect(button).toHaveAttribute("aria-pressed", "false");
  expect(saved).toHaveTextContent("1");
});
