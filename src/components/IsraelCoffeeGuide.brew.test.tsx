// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import type { Place } from "@/types/place";
import type { ComponentProps } from "react";
import type { DetailPanel } from "./DetailPanel";
import IsraelCoffeeGuide from "./IsraelCoffeeGuide";

// Keep the guide's real selection, URL effects and filter hydration together.
// Only the data boundary and unrelated UI/network integrations are replaced.
const state = vi.hoisted(() => ({ places: [] as Place[], noop: vi.fn() }));
vi.mock("@/hooks/usePlaceData", () => ({ usePlaceData: () => ({ places: state.places, loading: !state.places.length, error: null }) }));
vi.mock("@/hooks/useOfflineSupport", () => ({ useOfflineSupport: () => ({ registerServiceWorker: state.noop }) }));
vi.mock("@/hooks/useRatings", () => ({ useRatings: () => () => null }));
vi.mock("@/hooks/useReviews", () => ({ useReviews: () => ({ selectedShopReviews: [], reviewDraft: { name: "", text: "", rating: 5 }, setReviewDraft: state.noop }) }));
vi.mock("next/dynamic", () => ({ default: () => () => null }));
vi.mock("@/components/AboutView", () => ({ AboutView: () => null }));
vi.mock("@/components/Sidebar", () => ({ Sidebar: (props: ComponentProps<typeof import("./Sidebar").Sidebar>) => <div>
  <output data-testid="results">{props.nearbyCount}</output>
  {Object.entries(props.brewMethodCounts).map(([method, count]) => <button key={method} aria-pressed={props.selectedBrewMethods.includes(method)} onClick={() => props.onToggleBrewMethod(method)}>{method}:{count}</button>)}
  <button onClick={props.onToggleSellsBeansFilter}>beans</button>
</div> }));
vi.mock("@/components/ShopsView", () => ({ ShopsView: () => null }));
vi.mock("@/components/MobileFilterSheet", () => ({ MobileFilterSheet: () => null }));
vi.mock("@/components/SelectionBubble", () => ({ SelectionBubble: () => null }));
vi.mock("@/components/DetailPanel", () => ({
  DetailPanel: ({ detailOpen, selectedShop, onClose }: ComponentProps<typeof DetailPanel>) =>
    detailOpen && selectedShop ? <div role="dialog" aria-label={selectedShop.name}><button onClick={onClose}>Close cafe</button></div> : null,
}));


const place = (id: string, methods: string[], extra: Partial<Place> = {}): Place => ({
  id, name: id, city: "תל אביב", address: "", latitude: 32.07, longitude: 34.77,
  description: "", vibeTags: [], openingHours: null, brewMethods: methods, ...extra,
});
beforeEach(() => {
  state.places = [place("espresso", ["אספרסו"], { sellsBeans: true }), place("matcha", ["מאצ'ה"]), place("moka", ["מקינטה"]), place("unknown", []), place("alias", ["V60", "פילטר"], { city: "חיפה" })];
  window.localStorage.clear(); window.history.replaceState({}, "", "/");
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
it("OR matches selected methods, excludes unknown menus, and restores all results on deselection", () => {
  render(<IsraelCoffeeGuide />);
  expect(screen.getByTestId("results")).toHaveTextContent("5");
  fireEvent.click(screen.getByRole("button", { name: "מאצ'ה:1" }));
  expect(screen.getByTestId("results")).toHaveTextContent("1");
  fireEvent.click(screen.getByRole("button", { name: "מקינטה:1" }));
  expect(screen.getByTestId("results")).toHaveTextContent("2");
  expect(new URLSearchParams(window.location.search).get("brew")).toBe("מאצ'ה,מקינטה");
  fireEvent.click(screen.getByRole("button", { name: "מאצ'ה:1" }));
  fireEvent.click(screen.getByRole("button", { name: "מקינטה:1" }));
  expect(screen.getByTestId("results")).toHaveTextContent("5");
});
it("counts aliases once, respects the beans facet and preserves zero counts", () => {
  render(<IsraelCoffeeGuide />);
  expect(screen.getByRole("button", { name: "פילטר:1" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "beans" }));
  expect(screen.getByTestId("results")).toHaveTextContent("1");
  expect(screen.getByRole("button", { name: "פילטר:0" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "פילטר:0" }));
  expect(screen.getByTestId("results")).toHaveTextContent("0");
  expect(screen.getByRole("button", { name: "אספרסו:1" })).toBeInTheDocument();
});
it("restores new brew methods and region from a shared URL", () => {
  window.history.replaceState({}, "", "/?" + new URLSearchParams({brew: "מאצ'ה,מקינטה", region: "תל אביב וגוש דן"}));
  render(<IsraelCoffeeGuide />);
  expect(screen.getByTestId("results")).toHaveTextContent("2");
  expect(screen.getByRole("button", { name: "מאצ'ה:1" })).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByRole("button", { name: "פילטר:0" })).toBeInTheDocument();
});
