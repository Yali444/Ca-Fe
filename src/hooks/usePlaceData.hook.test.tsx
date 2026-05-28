// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, renderHook, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { usePlaceData } from "./usePlaceData";

// Minimal shape that satisfies `CafeRaw` for the transformer.
const sampleCafe = {
  id: "cafe-1",
  name: "Cafe Levinsky",
  city: "Tel Aviv",
  address: "10 Levinsky St",
  openingHours: "א'-ה': 08:00-18:00",
  description: "Test cafe",
  vibeTags: ["cozy"],
  instagramHandle: "@cafelevinsky",
  website: "https://example.com",
  coordinates: { lat: 32.0853, lng: 34.7818 },
  heroImage: "/hero.jpg",
};

describe("usePlaceData (hook)", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("starts in the loading state with no places and no error", () => {
    // Return a never-settling promise so the loading state sticks.
    fetchMock.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => usePlaceData());
    expect(result.current.loading).toBe(true);
    expect(result.current.places).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it("fetches /data/cafes.json on mount", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify([sampleCafe]), { status: 200 }),
    );

    renderHook(() => usePlaceData());
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());

    expect(fetchMock).toHaveBeenCalledWith("/data/cafes.json");
  });

  it("loads and normalizes places on a successful response", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify([sampleCafe]), { status: 200 }),
    );

    const { result } = renderHook(() => usePlaceData());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBeNull();
    expect(result.current.places).toHaveLength(1);
    expect(result.current.places[0]).toMatchObject({
      name: "Cafe Levinsky",
      city: "Tel Aviv",
      address: "10 Levinsky St",
      latitude: 32.0853,
      longitude: 34.7818,
      // Instagram handle is normalized (leading @ stripped).
      instagramHandle: "cafelevinsky",
      // Default `type` is 'coffee' when the source has no explicit type.
      type: "coffee",
    });
  });

  it("ends up with empty places + an error message on a non-OK response", async () => {
    fetchMock.mockResolvedValue(
      new Response("nope", { status: 500, statusText: "Server Error" }),
    );
    // The hook logs an error via console.error on the failure path — silence
    // it so the test output stays clean.
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const { result } = renderHook(() => usePlaceData());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.places).toEqual([]);
    expect(result.current.error).toContain("Server Error");
    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it("ends up with empty places + an error message when fetch throws", async () => {
    fetchMock.mockRejectedValue(new Error("ECONNRESET"));
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const { result } = renderHook(() => usePlaceData());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.places).toEqual([]);
    expect(result.current.error).toBe("ECONNRESET");
    consoleErrorSpy.mockRestore();
  });

  it("falls back to a generic error message when a non-Error is thrown", async () => {
    fetchMock.mockRejectedValue("string thrown — not an Error instance");
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const { result } = renderHook(() => usePlaceData());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe("Failed to load data");
    consoleErrorSpy.mockRestore();
  });

  it("does not crash or set state after unmounting mid-fetch (cancellation)", async () => {
    // Hold the promise so we can unmount before it settles.
    let resolveFetch: (value: Response) => void = () => {};
    fetchMock.mockReturnValue(
      new Promise<Response>((resolve) => {
        resolveFetch = resolve;
      }),
    );
    // Catch any post-unmount console.error from React.
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const { unmount } = renderHook(() => usePlaceData());
    unmount();
    // Now finish the fetch — the cancelled flag should prevent state updates.
    resolveFetch(new Response(JSON.stringify([sampleCafe]), { status: 200 }));
    // Yield once so the resolved promise's microtasks run.
    await new Promise((r) => setTimeout(r, 0));

    // Specifically, no "cannot update state on unmounted component" log.
    const reactWarnings = consoleErrorSpy.mock.calls
      .map((args) => String(args[0] ?? ""))
      .filter((msg) => msg.includes("unmounted"));
    expect(reactWarnings).toEqual([]);
    consoleErrorSpy.mockRestore();
  });

  it("returns an empty places array when the JSON payload is empty", async () => {
    fetchMock.mockResolvedValue(new Response("[]", { status: 200 }));

    const { result } = renderHook(() => usePlaceData());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBeNull();
    expect(result.current.places).toEqual([]);
  });
});
