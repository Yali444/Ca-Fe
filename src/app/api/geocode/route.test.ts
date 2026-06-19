import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET, __resetRateLimitForTests } from "./route";

const callRoute = (url: string, init?: RequestInit) =>
  GET(new Request(url, init));

describe("GET /api/geocode", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    // The limiter is module-scoped, so clear it between cases.
    __resetRateLimitForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns 400 when `q` is missing entirely", async () => {
    const res = await callRoute("https://example.com/api/geocode");
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ error: "Missing query" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns 400 when `q` is whitespace-only", async () => {
    const res = await callRoute("https://example.com/api/geocode?q=%20%20");
    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns parsed lat/lng when Nominatim returns a valid hit", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify([{ lat: "32.0853", lon: "34.7818" }]),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const res = await callRoute(
      "https://example.com/api/geocode?q=Tel%20Aviv",
    );

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      result: { lat: 32.0853, lng: 34.7818 },
    });
  });

  it("URL-encodes the query when calling Nominatim", async () => {
    fetchMock.mockResolvedValue(
      new Response("[]", { status: 200 }),
    );

    await callRoute("https://example.com/api/geocode?q=Tel%20Aviv%20%26%20Jaffa");

    expect(fetchMock).toHaveBeenCalledOnce();
    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain("nominatim.openstreetmap.org");
    expect(calledUrl).toContain("q=Tel%20Aviv%20%26%20Jaffa");
  });

  it("sends a User-Agent header (Nominatim ToS requirement)", async () => {
    fetchMock.mockResolvedValue(new Response("[]", { status: 200 }));

    await callRoute("https://example.com/api/geocode?q=Haifa");

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.headers).toMatchObject({
      "User-Agent": expect.stringContaining("Ca-Fe"),
    });
  });

  it("returns { result: null } when Nominatim has no matches", async () => {
    fetchMock.mockResolvedValue(new Response("[]", { status: 200 }));

    const res = await callRoute("https://example.com/api/geocode?q=zzz");
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ result: null });
  });

  it("returns { result: null } when the top hit is missing lat or lon", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify([{ lat: "32.0", /* no lon */ }]), {
        status: 200,
      }),
    );

    const res = await callRoute("https://example.com/api/geocode?q=somewhere");
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ result: null });
  });

  it("propagates a non-OK Nominatim status as a generic geocoding error", async () => {
    fetchMock.mockResolvedValue(new Response("rate limited", { status: 429 }));

    const res = await callRoute("https://example.com/api/geocode?q=anywhere");
    expect(res.status).toBe(429);
    await expect(res.json()).resolves.toEqual({ error: "Geocoding failed" });
  });

  it("returns 502 when fetch itself throws (network error)", async () => {
    fetchMock.mockRejectedValue(new Error("ECONNRESET"));

    const res = await callRoute("https://example.com/api/geocode?q=anywhere");
    expect(res.status).toBe(502);
    await expect(res.json()).resolves.toEqual({ error: "Fetch failed" });
  });

  it("returns 400 without calling Nominatim when `q` exceeds the length cap", async () => {
    const longQuery = "a".repeat(201);
    const res = await callRoute(
      `https://example.com/api/geocode?q=${longQuery}`,
    );
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ error: "Query too long" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sets a Cache-Control header on a successful result", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify([{ lat: "32.0853", lon: "34.7818" }]), {
        status: 200,
      }),
    );

    const res = await callRoute("https://example.com/api/geocode?q=Tel%20Aviv");
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toContain("s-maxage=86400");
  });

  it("rate-limits a client after the per-window budget is exceeded", async () => {
    // Fresh Response per call — a body can only be read once.
    fetchMock.mockImplementation(() => new Response("[]", { status: 200 }));
    const headers = { "x-forwarded-for": "203.0.113.7" };

    // 30 requests are allowed within the window; the 31st is rejected.
    for (let i = 0; i < 30; i++) {
      const ok = await callRoute(
        `https://example.com/api/geocode?q=q${i}`,
        { headers },
      );
      expect(ok.status).toBe(200);
    }

    const blocked = await callRoute(
      "https://example.com/api/geocode?q=blocked",
      { headers },
    );
    expect(blocked.status).toBe(429);
    await expect(blocked.json()).resolves.toEqual({ error: "Too many requests" });
  });

  it("rate-limits per client IP, not globally", async () => {
    fetchMock.mockImplementation(() => new Response("[]", { status: 200 }));

    // Exhaust the budget for one IP.
    for (let i = 0; i < 31; i++) {
      await callRoute(`https://example.com/api/geocode?q=q${i}`, {
        headers: { "x-forwarded-for": "203.0.113.7" },
      });
    }

    // A different IP is unaffected.
    const other = await callRoute("https://example.com/api/geocode?q=fresh", {
      headers: { "x-forwarded-for": "198.51.100.2" },
    });
    expect(other.status).toBe(200);
  });
});
