// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { ResultsEmptyState } from "./ResultsEmptyState";

type LatLng = { lat: number; lng: number };

const TEL_AVIV: LatLng = { lat: 32.08, lng: 34.78 };

/** Every branch off, so each test opts into exactly the one it exercises. */
const baseProps = {
  favoritesActive: false,
  addressLocation: null as LatLng | null,
  userLocation: null as LatLng | null,
  hasActiveFilters: false,
  onClearAddressSearch: vi.fn(),
  onClearUserLocation: vi.fn(),
  onClearAllFilters: vi.fn(),
};

const renderState = (overrides: Partial<typeof baseProps> & { variant?: "page" | "overlay" } = {}) => {
  const props = { ...baseProps, ...overrides };
  return { props, ...render(<ResultsEmptyState {...props} />) };
};

describe("<ResultsEmptyState />", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  describe("copy", () => {
    it("tailors the heading and hint to the favourites filter", () => {
      renderState({ favoritesActive: true });
      expect(screen.getByRole("heading")).toHaveTextContent("עדיין אין מועדפים");
      expect(
        screen.getByText("הקישו על הלב בכרטיס כדי לשמור מקומות אהובים"),
      ).toBeInTheDocument();
    });

    it("explains an empty address search", () => {
      renderState({ addressLocation: TEL_AVIV });
      expect(screen.getByRole("heading")).toHaveTextContent("לא נמצאו בתי קפה");
      expect(screen.getByText("לא מצאנו בתי קפה ליד הכתובת הזו")).toBeInTheDocument();
    });

    it("explains an empty nearby search", () => {
      renderState({ userLocation: TEL_AVIV });
      expect(screen.getByText("לא מצאנו בתי קפה קרובים אליך")).toBeInTheDocument();
    });

    it("falls back to filter guidance when no location is involved", () => {
      renderState({ hasActiveFilters: true });
      expect(screen.getByText("נסו לשנות את הסינון או לבחור אזור אחר")).toBeInTheDocument();
    });
  });

  describe("recovery CTA", () => {
    it("offers no clear action when nothing is there to clear", () => {
      renderState();
      expect(screen.queryByRole("button", { name: /נקה/ })).not.toBeInTheDocument();
    });

    it("clears the address search first when an address is active", () => {
      // Address outranks both location and filters: it is the most recent,
      // most deliberate narrowing the user performed.
      const { props } = renderState({
        addressLocation: TEL_AVIV,
        userLocation: TEL_AVIV,
        hasActiveFilters: true,
      });

      fireEvent.click(screen.getByRole("button", { name: /נקה חיפוש/ }));

      expect(props.onClearAddressSearch).toHaveBeenCalledOnce();
      expect(props.onClearUserLocation).not.toHaveBeenCalled();
      expect(props.onClearAllFilters).not.toHaveBeenCalled();
    });

    it("clears the GPS location when there is no address but filters are on", () => {
      const { props } = renderState({ userLocation: TEL_AVIV, hasActiveFilters: true });

      fireEvent.click(screen.getByRole("button", { name: /נקה מיקום/ }));

      expect(props.onClearUserLocation).toHaveBeenCalledOnce();
      expect(props.onClearAllFilters).not.toHaveBeenCalled();
    });

    it("clears every filter when filters are all that narrowed the results", () => {
      const { props } = renderState({ hasActiveFilters: true });

      fireEvent.click(screen.getByRole("button", { name: /נקה את כל המסננים/ }));

      expect(props.onClearAllFilters).toHaveBeenCalledOnce();
    });
  });

  describe("contribution prompt", () => {
    it("opens the suggest-a-place mailto, even with no filters to clear", () => {
      const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);
      renderState();

      fireEvent.click(screen.getByRole("button", { name: /הוסיפו מקום חסר/ }));

      expect(openSpy).toHaveBeenCalledWith(
        expect.stringContaining("mailto:"),
        "_blank",
      );
      openSpy.mockRestore();
    });
  });

  describe("overlay variant", () => {
    it("announces itself politely, since it appears without a navigation", () => {
      const { container } = renderState({ variant: "overlay", hasActiveFilters: true });
      const status = container.querySelector('[role="status"]');
      expect(status).toHaveAttribute("aria-live", "polite");
    });

    it("stays click-through so an empty map can still be panned", () => {
      const { container } = renderState({ variant: "overlay" });
      const status = container.querySelector('[role="status"]');
      expect(status).toHaveClass("pointer-events-none");
      // ...while the card itself remains interactive.
      expect(status?.firstElementChild).toHaveClass("pointer-events-auto");
    });

    it("renders the same copy and CTA as the page variant", () => {
      const { props } = renderState({ variant: "overlay", hasActiveFilters: true });

      expect(screen.getByRole("heading")).toHaveTextContent("לא נמצאו בתי קפה");
      fireEvent.click(screen.getByRole("button", { name: /נקה את כל המסננים/ }));
      expect(props.onClearAllFilters).toHaveBeenCalledOnce();
    });

    it("is a plain block, not a status region, in the page variant", () => {
      const { container } = renderState({ hasActiveFilters: true });
      expect(container.querySelector('[role="status"]')).toBeNull();
    });
  });
});
