import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const callRoute = (url: string) => GET(new Request(url));

describe("GET /api/geocode", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
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
});
