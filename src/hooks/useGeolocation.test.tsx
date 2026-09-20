// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import { useGeolocation } from "./useGeolocation";

const position = { coords: { latitude: 32, longitude: 34 } } as GeolocationPosition;

function positionError(code: number): GeolocationPositionError {
  return { code, message: "boom", PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 };
}

function captureRequests() {
  const requests: {
    ok: PositionCallback;
    fail: PositionErrorCallback;
    options?: PositionOptions;
  }[] = [];
  const getCurrentPosition = vi.fn((ok: PositionCallback, fail?: PositionErrorCallback | null, options?: PositionOptions) => {
    requests.push({ ok, fail: fail!, options });
  });
  stubGeolocation({ getCurrentPosition });
  return { requests, getCurrentPosition };
}

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
  it("still asks the device for a position when the online hint is false", () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    stubGeolocation({
      getCurrentPosition: (ok) => ok(position),
    });
    const { result } = renderHook(() => useGeolocation());
    act(() => result.current.handleGetUserLocation());
    expect(result.current.gpsStatus).toBe("success");
    expect(result.current.userLocation).toEqual({ lat: 32, lng: 34 });
  });

  it("reports unsupported when the browser has no geolocation", () => {
    stubGeolocation(undefined);
    const { result } = renderHook(() => useGeolocation());
    act(() => result.current.handleGetUserLocation());
    expect(result.current.gpsStatus).toBe("unsupported");
  });

  it("stores the location and bumps the fly-to key on success", () => {
    stubGeolocation({
      getCurrentPosition: (ok) =>
        ok({ coords: { latitude: 32, longitude: 34 } } as GeolocationPosition),
    });
    const { result } = renderHook(() => useGeolocation());
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
    const { result } = renderHook(() => useGeolocation());

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
    const getCurrentPosition = vi.fn((_ok: PositionCallback, err?: PositionErrorCallback | null) =>
      err?.(positionError(code))
    );
    stubGeolocation({ getCurrentPosition });
    const { result } = renderHook(() => useGeolocation());

    act(() => result.current.handleGetUserLocation());

    expect(result.current.gpsStatus).toBe(status);
    expect(result.current.userLocation).toBeNull();
    expect(result.current.isLocating).toBe(false);
    // Only unavailable/timeout get a second attempt; no loop or denial retry.
    expect(getCurrentPosition).toHaveBeenCalledTimes(code === 2 || code === 3 ? 2 : 1);
  });

  it.each([2, 3])("recovers from error %i with one fresh higher-accuracy attempt", (code) => {
    const { requests, getCurrentPosition } = captureRequests();
    const { result } = renderHook(() => useGeolocation());

    act(() => result.current.handleGetUserLocation());
    expect(requests[0].options).toEqual({ enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 });
    act(() => requests[0].fail(positionError(code)));

    expect(result.current.isLocating).toBe(true);
    expect(result.current.gpsStatus).toBe("locating");
    expect(result.current.gpsMessage).toContain("מנסים שוב");
    expect(requests[1].options).toEqual({ enableHighAccuracy: true, timeout: 20000, maximumAge: 0 });

    act(() => requests[1].ok(position));
    expect(result.current.userLocation).toEqual({ lat: 32, lng: 34 });
    expect(result.current.gpsStatus).toBe("success");
    expect(result.current.isLocating).toBe(false);
    expect(result.current.flyToUserKey).toBe(1);
    expect(getCurrentPosition).toHaveBeenCalledTimes(2);
  });

  it("ignores repeated taps while either location attempt is pending", () => {
    const { requests, getCurrentPosition } = captureRequests();
    const { result } = renderHook(() => useGeolocation());

    act(() => {
      result.current.handleGetUserLocation();
      result.current.handleGetUserLocation();
    });
    expect(getCurrentPosition).toHaveBeenCalledTimes(1);

    act(() => requests[0].fail(positionError(2)));
    act(() => result.current.handleGetUserLocation());
    expect(getCurrentPosition).toHaveBeenCalledTimes(2);
    act(() => requests[1].ok(position));
    expect(result.current.flyToUserKey).toBe(1);
  });

  it("allows a manual retry after both attempts fail", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { requests } = captureRequests();
    const { result } = renderHook(() => useGeolocation());

    act(() => result.current.handleGetUserLocation());
    act(() => requests[0].fail(positionError(2)));
    act(() => requests[1].fail(positionError(3)));
    expect(result.current.gpsStatus).toBe("timeout");
    expect(result.current.gpsMessage).toContain("כתובת");

    act(() => result.current.handleGetUserLocation());
    expect(result.current.isLocating).toBe(true);
    expect(requests[2].options?.enableHighAccuracy).toBe(false);
    act(() => requests[2].ok(position));
    expect(result.current.gpsStatus).toBe("success");
  });

  it("reports a permission denial during recovery without retrying again", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { requests, getCurrentPosition } = captureRequests();
    const { result } = renderHook(() => useGeolocation());

    act(() => result.current.handleGetUserLocation());
    act(() => requests[0].fail(positionError(2)));
    act(() => requests[1].fail(positionError(1)));

    expect(result.current.gpsStatus).toBe("denied");
    expect(result.current.gpsMessage).toContain("בהגדרות המכשיר");
    expect(result.current.isLocating).toBe(false);
    expect(getCurrentPosition).toHaveBeenCalledTimes(2);
  });

  it("ignores old callbacks after clearing a location and requesting another", () => {
    const { requests, getCurrentPosition } = captureRequests();
    const { result } = renderHook(() => useGeolocation());
    act(() => result.current.handleGetUserLocation());
    act(() => requests[0].ok(position));
    act(() => result.current.handleGetUserLocation()); // clear
    act(() => result.current.handleGetUserLocation()); // start a new request

    act(() => {
      requests[0].fail(positionError(2));
      requests[0].ok(position);
    });
    expect(getCurrentPosition).toHaveBeenCalledTimes(2);
    expect(result.current.isLocating).toBe(true);
    expect(result.current.userLocation).toBeNull();
    expect(result.current.flyToUserKey).toBe(1);

    act(() => requests[1].ok(position));
    expect(result.current.gpsStatus).toBe("success");
    expect(result.current.flyToUserKey).toBe(2);
  });

  it("does not start a recovery request after unmount", () => {
    const { requests, getCurrentPosition } = captureRequests();
    const { result, unmount } = renderHook(() => useGeolocation());
    act(() => result.current.handleGetUserLocation());
    unmount();
    act(() => {
      requests[0].fail(positionError(2));
      requests[0].ok(position);
    });
    expect(getCurrentPosition).toHaveBeenCalledTimes(1);
  });

  it.each([
    [new DOMException("Blocked", "SecurityError"), "denied"],
    [new Error("Device error"), "error"],
  ])("stops locating when the browser throws synchronously (%s)", (error, status) => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    stubGeolocation({ getCurrentPosition: () => { throw error; } });
    const { result } = renderHook(() => useGeolocation());
    act(() => result.current.handleGetUserLocation());
    expect(result.current.isLocating).toBe(false);
    expect(result.current.gpsStatus).toBe(status);
    expect(result.current.userLocation).toBeNull();
  });
});
