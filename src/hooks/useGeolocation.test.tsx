// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import { useGeolocation } from "./useGeolocation";

/** Install a fake navigator.geolocation for the duration of one test. */
function stubGeolocation(geo: Partial<Geolocation> | undefined) {
  Object.defineProperty(navigator, "geolocation", {
    value: geo,
    configurable: true,
  });
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  stubGeolocation(undefined);
});

describe("useGeolocation", () => {
  it("reports an error and does not locate while offline", () => {
    const { result } = renderHook(() => useGeolocation({ isOnline: false }));
    act(() => result.current.handleGetUserLocation());
    expect(result.current.gpsStatus).toBe("error");
    expect(result.current.gpsMessage).toContain("אינטרנט");
    expect(result.current.userLocation).toBeNull();
  });

  it("reports unsupported when the browser has no geolocation", () => {
    stubGeolocation(undefined);
    const { result } = renderHook(() => useGeolocation({ isOnline: true }));
    act(() => result.current.handleGetUserLocation());
    expect(result.current.gpsStatus).toBe("unsupported");
  });

  it("stores the location and bumps the fly-to key on success", () => {
    stubGeolocation({
      getCurrentPosition: (ok) =>
        ok({ coords: { latitude: 32, longitude: 34 } } as GeolocationPosition),
    });
    const { result } = renderHook(() => useGeolocation({ isOnline: true }));
    const keyBefore = result.current.flyToUserKey;

    act(() => result.current.handleGetUserLocation());

    expect(result.current.userLocation).toEqual({ lat: 32, lng: 34 });
    expect(result.current.gpsStatus).toBe("success");
    expect(result.current.flyToUserKey).toBe(keyBefore + 1);
  });

  it("toggles the location off when it is already set", () => {
    const getCurrentPosition = vi.fn((ok: PositionCallback) =>
      ok({ coords: { latitude: 32, longitude: 34 } } as GeolocationPosition)
    );
    stubGeolocation({ getCurrentPosition });
    const { result } = renderHook(() => useGeolocation({ isOnline: true }));

    act(() => result.current.handleGetUserLocation()); // on
    act(() => result.current.handleGetUserLocation()); // off

    expect(result.current.userLocation).toBeNull();
    expect(result.current.gpsStatus).toBe("idle");
    expect(getCurrentPosition).toHaveBeenCalledTimes(1);
  });

  it.each([
    [1, "denied"],
    [2, "unavailable"],
    [3, "timeout"],
    [99, "error"],
  ])("maps geolocation error code %i to status '%s'", (code, status) => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    stubGeolocation({
      getCurrentPosition: (_ok, err) =>
        err?.({
          code,
          message: "boom",
          PERMISSION_DENIED: 1,
          POSITION_UNAVAILABLE: 2,
          TIMEOUT: 3,
        } as GeolocationPositionError),
    });
    const { result } = renderHook(() => useGeolocation({ isOnline: true }));

    act(() => result.current.handleGetUserLocation());

    expect(result.current.gpsStatus).toBe(status);
    expect(result.current.userLocation).toBeNull();
  });
});
