import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildShareUrl, googleMapsUrl, openGoogleMaps } from "./share";

describe("googleMapsUrl", () => {
  it("builds the expected Google Maps query URL", () => {
    expect(googleMapsUrl(32.0853, 34.7818)).toBe(
      "https://www.google.com/maps?q=32.0853,34.7818",
    );
  });

  it("handles negative coordinates", () => {
    expect(googleMapsUrl(-12.5, -73.25)).toBe(
      "https://www.google.com/maps?q=-12.5,-73.25",
    );
  });

  it("handles zero coordinates", () => {
    expect(googleMapsUrl(0, 0)).toBe("https://www.google.com/maps?q=0,0");
  });
});

describe("openGoogleMaps", () => {
  let openSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    openSpy = vi.fn();
    vi.stubGlobal("window", { open: openSpy });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("calls window.open with the Google Maps URL", () => {
    openGoogleMaps(32.0853, 34.7818);
    expect(openSpy).toHaveBeenCalledOnce();
    expect(openSpy.mock.calls[0][0]).toBe(
      "https://www.google.com/maps?q=32.0853,34.7818",
    );
  });

  it("opens in a new tab with noopener/noreferrer", () => {
    openGoogleMaps(32, 34);
    const [, target, features] = openSpy.mock.calls[0];
    expect(target).toBe("_blank");
    expect(features).toContain("noopener");
    expect(features).toContain("noreferrer");
  });
});

describe("buildShareUrl", () => {
  const ORIGINAL_BASE = process.env.NEXT_PUBLIC_BASE_URL;

  afterEach(() => {
    vi.unstubAllGlobals();
    if (ORIGINAL_BASE === undefined) {
      delete process.env.NEXT_PUBLIC_BASE_URL;
    } else {
      process.env.NEXT_PUBLIC_BASE_URL = ORIGINAL_BASE;
    }
  });

  it("returns an empty string when running server-side (no window)", () => {
    // No window stub → typeof window === "undefined" branch.
    expect(buildShareUrl("cafe-1")).toBe("");
  });

  it("uses NEXT_PUBLIC_BASE_URL as the base when set", () => {
    process.env.NEXT_PUBLIC_BASE_URL = "https://www.ca-fe.xyz/";
    vi.stubGlobal("window", { location: { href: "https://fallback.example/" } });

    expect(buildShareUrl("cafe-42")).toBe("https://www.ca-fe.xyz/cafe/cafe-42");
  });

  it("falls back to window.location.href when no env base is set", () => {
    delete process.env.NEXT_PUBLIC_BASE_URL;
    vi.stubGlobal("window", {
      location: { href: "https://example.com/cafes" },
    });

    expect(buildShareUrl("matcha-abc")).toBe(
      "https://example.com/cafe/matcha-abc",
    );
  });

  it("ignores the current page's path and query so they don't leak into the link", () => {
    delete process.env.NEXT_PUBLIC_BASE_URL;
    vi.stubGlobal("window", {
      location: { href: "https://example.com/?cafe=old&beans=1" },
    });

    expect(buildShareUrl("new-id")).toBe("https://example.com/cafe/new-id");
  });

  it("encodes ids that contain URL-significant characters", () => {
    delete process.env.NEXT_PUBLIC_BASE_URL;
    vi.stubGlobal("window", { location: { href: "https://example.com/" } });

    expect(buildShareUrl("a b/c?d")).toBe(
      "https://example.com/cafe/a%20b%2Fc%3Fd",
    );
  });
});
