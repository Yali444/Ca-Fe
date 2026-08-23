import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { clientIp, createRateLimiter } from "./rate-limit";

describe("createRateLimiter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-22T00:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows exactly `limit` calls inside one window", () => {
    const isLimited = createRateLimiter({ limit: 3, windowMs: 60_000 });

    expect([isLimited("ip"), isLimited("ip"), isLimited("ip")]).toEqual([false, false, false]);
  });

  it("blocks the call after the cap is reached", () => {
    const isLimited = createRateLimiter({ limit: 3, windowMs: 60_000 });
    for (let i = 0; i < 3; i += 1) isLimited("ip");

    expect(isLimited("ip")).toBe(true);
  });

  it("keeps blocking for the rest of the window", () => {
    const isLimited = createRateLimiter({ limit: 1, windowMs: 60_000 });
    isLimited("ip");

    vi.advanceTimersByTime(59_999);

    expect(isLimited("ip")).toBe(true);
  });

  it("counts each key in its own bucket", () => {
    const isLimited = createRateLimiter({ limit: 1, windowMs: 60_000 });
    isLimited("first");
    isLimited("first");

    expect(isLimited("first")).toBe(true);
    expect(isLimited("second")).toBe(false);
  });

  // A limiter that never releases is as broken as one that never limits, and
  // no route test reaches this path — they all run inside a single window.
  it("releases the key once the window has elapsed", () => {
    const isLimited = createRateLimiter({ limit: 1, windowMs: 60_000 });
    isLimited("ip");
    expect(isLimited("ip")).toBe(true);

    vi.advanceTimersByTime(60_000);

    expect(isLimited("ip")).toBe(false);
  });

  it("resets exactly at the window boundary, not a tick later", () => {
    const isLimited = createRateLimiter({ limit: 1, windowMs: 1_000 });
    isLimited("ip");

    vi.advanceTimersByTime(999);
    expect(isLimited("ip")).toBe(true);

    vi.advanceTimersByTime(1);
    expect(isLimited("ip")).toBe(false);
  });

  it("starts a fresh window rather than resuming the old count", () => {
    const isLimited = createRateLimiter({ limit: 2, windowMs: 1_000 });
    isLimited("ip");
    isLimited("ip");
    expect(isLimited("ip")).toBe(true);

    vi.advanceTimersByTime(1_000);

    expect([isLimited("ip"), isLimited("ip")]).toEqual([false, false]);
    expect(isLimited("ip")).toBe(true);
  });

  // The opportunistic sweep runs when the map outgrows maxKeys. It must only
  // reclaim expired buckets — evicting a live one would hand an active abuser
  // a clean slate.
  it("keeps a live bucket when the eviction sweep runs", () => {
    const isLimited = createRateLimiter({ limit: 1, windowMs: 1_000, maxKeys: 1 });
    isLimited("live");
    expect(isLimited("live")).toBe(true);

    // Push the map past maxKeys mid-window, triggering the sweep.
    vi.advanceTimersByTime(500);
    isLimited("other");

    expect(isLimited("live")).toBe(true);
  });

  it("still limits normally after a sweep has reclaimed expired buckets", () => {
    const isLimited = createRateLimiter({ limit: 1, windowMs: 1_000, maxKeys: 1 });
    isLimited("stale-a");
    isLimited("stale-b");

    // Both buckets are now expired; the next new key triggers the sweep.
    vi.advanceTimersByTime(1_500);
    expect(isLimited("fresh")).toBe(false);
    expect(isLimited("fresh")).toBe(true);
  });
});

describe("clientIp", () => {
  const withHeaders = (headers: Record<string, string>) =>
    new Request("https://ca-fe.test/api/reviews", { headers });

  it("reads the first entry of x-forwarded-for", () => {
    expect(clientIp(withHeaders({ "x-forwarded-for": "203.0.113.5, 70.41.3.18" }))).toBe(
      "203.0.113.5",
    );
  });

  it("trims whitespace around the forwarded entry", () => {
    expect(clientIp(withHeaders({ "x-forwarded-for": "  203.0.113.5  , 70.41.3.18" }))).toBe(
      "203.0.113.5",
    );
  });

  it("handles a single-value x-forwarded-for", () => {
    expect(clientIp(withHeaders({ "x-forwarded-for": "203.0.113.5" }))).toBe("203.0.113.5");
  });

  it("prefers x-forwarded-for over x-real-ip", () => {
    expect(
      clientIp(withHeaders({ "x-forwarded-for": "203.0.113.5", "x-real-ip": "198.51.100.9" })),
    ).toBe("203.0.113.5");
  });

  it("falls back to x-real-ip when there is no forwarded header", () => {
    expect(clientIp(withHeaders({ "x-real-ip": "198.51.100.9" }))).toBe("198.51.100.9");
  });

  it("falls back to `unknown` when neither header is present", () => {
    expect(clientIp(withHeaders({}))).toBe("unknown");
  });

  // Every caller with no usable header collapses onto one bucket. That is the
  // intended trade-off (fail closed rather than open), so pin it deliberately.
  it("gives every header-less caller the same key", () => {
    expect(clientIp(withHeaders({}))).toBe(clientIp(withHeaders({})));
  });
});
