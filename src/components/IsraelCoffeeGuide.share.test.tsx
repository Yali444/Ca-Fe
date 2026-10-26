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
vi.mock("@/components/Sidebar", () => ({ Sidebar: () => null }));
vi.mock("@/components/ShopsView", () => ({ ShopsView: () => null }));
vi.mock("@/components/MobileFilterSheet", () => ({ MobileFilterSheet: () => null }));
vi.mock("@/components/SelectionBubble", () => ({ SelectionBubble: () => null }));
vi.mock("@/components/DetailPanel", () => ({
  DetailPanel: ({ detailOpen, selectedShop, onClose }: ComponentProps<typeof DetailPanel>) =>
    detailOpen && selectedShop ? <div role="dialog" aria-label={selectedShop.name}><button onClick={onClose}>Close cafe</button></div> : null,
}));

const cups: Place = {
  id: "cups-legacy-id", datasetId: "162", name: "CUPS", city: "תל אביב",
  address: "דיזנגוף 87", latitude: 32.077, longitude: 34.774,
  description: "", brewMethods: [], vibeTags: [], reviews: [],
  openingHours: null, instagramHandle: null, website: null, heroImage: null,
};

beforeEach(() => {
  state.places = [];
  window.localStorage.clear();
  window.history.replaceState({}, "", "/");
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("shared cafe URL regression", () => {
  it.each(["162", "cups-legacy-id"])("opens %s after delayed catalogue load, survives remount, then closes", (id) => {
    window.history.replaceState({}, "", `/?cafe=${id}&beans=1`);
    const historyWrites: string[] = [];
    const replace = window.history.replaceState.bind(window.history);
    vi.spyOn(window.history, "replaceState").mockImplementation((data, unused, url) => {
      historyWrites.push(String(url));
      replace(data, unused, url);
    });
    const view = render(<IsraelCoffeeGuide />);
    expect(new URLSearchParams(window.location.search).get("cafe")).toBe(id);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    state.places = [cups];
    view.rerender(<IsraelCoffeeGuide />);
    expect(screen.getByRole("dialog", { name: "CUPS" })).toBeInTheDocument();
    expect(new URLSearchParams(window.location.search).get("cafe")).toBe(cups.id);
    // Detect even a transient deletion between loading and panel-open effects.
    expect(historyWrites.every(url => new URL(url, window.location.origin).searchParams.has("cafe"))).toBe(true);
    view.unmount();
    render(<IsraelCoffeeGuide />);
    expect(screen.getByRole("dialog", { name: "CUPS" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Close cafe" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(new URLSearchParams(window.location.search).has("cafe")).toBe(false);
    expect(new URLSearchParams(window.location.search).get("beans")).toBe("1");
  });

  it("closes the panel on browser Back without reopening the selection", () => {
    state.places = [cups];
    window.history.replaceState({}, "", "/?cafe=162");
    render(<IsraelCoffeeGuide />);
    expect(screen.getByRole("dialog", { name: "CUPS" })).toBeInTheDocument();
    act(() => {
      window.history.replaceState({}, "", "/");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(window.location.search).toBe("");
  });

  it("clears an unknown ID only after the catalogue arrives", () => {
    window.history.replaceState({}, "", "/?cafe=unknown");
    const view = render(<IsraelCoffeeGuide />);
    expect(window.location.search).toBe("?cafe=unknown");
    state.places = [cups];
    view.rerender(<IsraelCoffeeGuide />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(window.location.search).toBe("");
  });
});
