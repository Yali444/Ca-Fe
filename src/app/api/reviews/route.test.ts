import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const post = (body: unknown, ip = "198.51.100.1") =>
  POST(
    new Request("https://example.com/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
      body: JSON.stringify(body),
    }),
  );

const validBody = { cafeId: 42, name: "דנה", rating: 5, text: "קפה מעולה" };

describe("POST /api/reviews", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://proj.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          new Response(JSON.stringify([{ id: 1, created_at: "2026-08-08T00:00:00Z" }]), {
            status: 201,
          }),
        ),
      ),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("inserts a valid review and returns it", async () => {
    const res = await post(validBody, "198.51.100.10");
    expect(res.status).toBe(201);
    const json = (await res.json()) as { review: { author: string; rating: number } };
    expect(json.review.author).toBe("דנה");
    expect(json.review.rating).toBe(5);
  });

  it("rejects an out-of-range rating", async () => {
    const res = await post({ ...validBody, rating: 9 }, "198.51.100.11");
    expect(res.status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("rejects an oversized review body", async () => {
    const res = await post({ ...validBody, text: "x".repeat(1001) }, "198.51.100.12");
    expect(res.status).toBe(400);
  });

  it("rejects a missing name", async () => {
    const res = await post({ ...validBody, name: "" }, "198.51.100.13");
    expect(res.status).toBe(400);
  });

  it("rate-limits a single IP after the per-window cap", async () => {
    const ip = "198.51.100.99";
    const statuses: number[] = [];
    for (let i = 0; i < 6; i++) statuses.push((await post(validBody, ip)).status);
    expect(statuses.slice(0, 5).every((s) => s === 201)).toBe(true);
    expect(statuses[5]).toBe(429);
  });
});
