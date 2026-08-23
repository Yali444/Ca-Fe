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

const postRaw = (raw: string, ip: string) =>
  POST(
    new Request("https://example.com/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
      body: raw,
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

  // Every branch below was previously uncovered. This is the one endpoint that
  // accepts untrusted input, so its rejections matter more than its happy path.
  describe("rejections", () => {
    it("returns 400 on a body that is not JSON, without calling Supabase", async () => {
      const res = await postRaw("{not json", "198.51.100.20");
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: "Invalid JSON" });
      expect(fetch).not.toHaveBeenCalled();
    });

    it.each([
      ["missing", undefined, "198.51.100.21"],
      ["non-numeric", "abc", "198.51.100.22"],
      ["fractional", 1.5, "198.51.100.23"],
      ["zero", 0, "198.51.100.24"],
      ["negative", -3, "198.51.100.25"],
    ])("returns 400 for a %s cafe id", async (_label, cafeId, ip) => {
      const res = await post({ ...validBody, cafeId }, ip);
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: "Bad cafe id" });
      expect(fetch).not.toHaveBeenCalled();
    });

    it.each([
      ["below the range", 0, "198.51.100.26"],
      ["above the range", 6, "198.51.100.27"],
      ["fractional", 4.5, "198.51.100.28"],
      ["not a number", "five", "198.51.100.29"],
    ])("returns 400 for a rating %s", async (_label, rating, ip) => {
      const res = await post({ ...validBody, rating }, ip);
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: "Rating must be 1–5" });
    });

    it("returns 400 for a name longer than the cap", async () => {
      const res = await post({ ...validBody, name: "x".repeat(41) }, "198.51.100.30");
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: "Bad name" });
    });

    it("returns 400 for whitespace-only text", async () => {
      const res = await post({ ...validBody, text: "   " }, "198.51.100.31");
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: "Bad review text" });
    });
  });

  describe("when the upstream is unavailable", () => {
    it("returns 503 when Supabase is not configured", async () => {
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");

      const res = await post(validBody, "198.51.100.40");

      expect(res.status).toBe(503);
      expect(await res.json()).toEqual({ error: "Reviews unavailable" });
      expect(fetch).not.toHaveBeenCalled();
    });

    it("returns 502 when Supabase rejects the insert", async () => {
      vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(new Response("nope", { status: 401 }))));

      const res = await post(validBody, "198.51.100.41");

      expect(res.status).toBe(502);
      expect(await res.json()).toEqual({ error: "Insert failed" });
    });

    it("returns 502 when the fetch itself throws", async () => {
      vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("ECONNRESET"))));

      const res = await post(validBody, "198.51.100.42");

      expect(res.status).toBe(502);
      expect(await res.json()).toEqual({ error: "Insert failed" });
    });

    it("does not leak the upstream error to the client", async () => {
      vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("postgres://user:pw@host down"))));

      const body = await (await post(validBody, "198.51.100.43")).text();

      expect(body).not.toContain("postgres");
      expect(body).not.toContain("pw@host");
    });
  });

  describe("the insert it sends", () => {
    it("posts the trimmed values under the dataset's Hebrew column names", async () => {
      await post({ cafeId: 7, name: "  דנה  ", rating: 4, text: "  טעים  " }, "198.51.100.50");

      const [, init] = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(JSON.parse(init.body as string)).toEqual({
        cafe_id: 7,
        שם: "דנה",
        דירוג: 4,
        הערה: "טעים",
      });
    });

    it("falls back to a synthetic id when Supabase returns no rows", async () => {
      vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(new Response("[]", { status: 201 }))));

      const res = await post(validBody, "198.51.100.51");
      const json = (await res.json()) as { review: { id: string; date: string } };

      expect(res.status).toBe(201);
      expect(json.review.id).toMatch(/^42-\d+$/);
      expect(json.review.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  it("sends Retry-After alongside a 429", async () => {
    const ip = "198.51.100.60";
    for (let i = 0; i < 5; i++) await post(validBody, ip);

    const limited = await post(validBody, ip);

    expect(limited.status).toBe(429);
    expect(limited.headers.get("Retry-After")).toBe("60");
  });
});
