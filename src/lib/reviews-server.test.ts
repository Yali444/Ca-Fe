import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { fetchCafeReviews, reviewCafeId } from "./reviews-server";

const rows = (...items: unknown[]) =>
  Promise.resolve(new Response(JSON.stringify(items), { status: 200 }));

const fetchMock = () => fetch as unknown as ReturnType<typeof vi.fn>;

describe("reviewCafeId", () => {
  it("is stable for the same name and raw city", () => {
    expect(reviewCafeId("קפה נונו", "תל אביב")).toBe(reviewCafeId("קפה נונו", "תל אביב"));
  });

  it("distinguishes two cafes with the same name in different cities", () => {
    expect(reviewCafeId("קפה נונו", "תל אביב")).not.toBe(reviewCafeId("קפה נונו", "חיפה"));
  });

  it("returns a positive integer, which is what the reviews table keys on", () => {
    const id = reviewCafeId("קפה נונו", "תל אביב");
    expect(Number.isInteger(id)).toBe(true);
    expect(id).toBeGreaterThan(0);
  });
});

describe("fetchCafeReviews", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://proj.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");
    vi.stubGlobal("fetch", vi.fn(() => rows()));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  describe("mapping rows", () => {
    it("maps a full row into a Review", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn(() =>
          rows({
            id: 12,
            שם: "דנה",
            דירוג: 4,
            הערה: "קפה מצוין",
            created_at: "2026-08-08T09:30:00Z",
          }),
        ),
      );

      expect(await fetchCafeReviews("קפה נונו", "תל אביב")).toEqual([
        {
          id: "12",
          author: "דנה",
          rating: 4,
          text: "קפה מצוין",
          source: "Ca Fe community",
          date: "2026-08-08",
        },
      ]);
    });

    it("falls back to אנונימי, rating 5 and empty text for null columns", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn(() => rows({ id: 3, שם: null, דירוג: null, הערה: null, created_at: null })),
      );

      const [review] = await fetchCafeReviews("קפה נונו", "תל אביב");

      expect(review).toMatchObject({ author: "אנונימי", rating: 5, text: "", date: null });
    });

    it("drops rows with no id rather than emitting a Review without one", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn(() =>
          rows(
            { id: null, שם: "דנה", דירוג: 5, הערה: "כן", created_at: null },
            { id: 9, שם: "רון", דירוג: 5, הערה: "כן", created_at: null },
          ),
        ),
      );

      const reviews = await fetchCafeReviews("קפה נונו", "תל אביב");

      expect(reviews.map((r) => r.id)).toEqual(["9"]);
    });

    it("returns an empty array when the cafe has no reviews", async () => {
      expect(await fetchCafeReviews("קפה נונו", "תל אביב")).toEqual([]);
    });
  });

  describe("the request it makes", () => {
    it("scopes the query to the cafe, hides moderated rows, and caps the result", async () => {
      await fetchCafeReviews("קפה נונו", "תל אביב");

      const [url, init] = fetchMock().mock.calls[0];
      expect(url).toContain(`cafe_id=eq.${reviewCafeId("קפה נונו", "תל אביב")}`);
      expect(url).toContain("hidden=eq.false");
      expect(url).toContain("order=created_at.desc");
      expect(url).toContain("limit=100");
      expect(init.headers).toMatchObject({ apikey: "anon-key" });
    });

    // The 8s cap exists so a slow Supabase can't stall the static build of every
    // cafe page. It only ever runs in the failure case, so pin that it's set.
    it("bounds the request with an abort signal", async () => {
      await fetchCafeReviews("קפה נונו", "תל אביב");

      const [, init] = fetchMock().mock.calls[0];
      expect(init.signal).toBeInstanceOf(AbortSignal);
    });

    it("asks Next to revalidate rather than refetching per request", async () => {
      await fetchCafeReviews("קפה נונו", "תל אביב");

      const [, init] = fetchMock().mock.calls[0];
      expect(init.next).toEqual({ revalidate: 3600 });
    });
  });

  // Every failure mode must degrade to "no reviews" and never throw: this runs
  // during static generation of all 153 cafe pages, and a throw fails the build.
  describe("degrading instead of throwing", () => {
    it("skips the network entirely when the url is unset", async () => {
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");

      expect(await fetchCafeReviews("קפה נונו", "תל אביב")).toEqual([]);
      expect(fetch).not.toHaveBeenCalled();
    });

    it("skips the network entirely when the key is unset", async () => {
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");

      expect(await fetchCafeReviews("קפה נונו", "תל אביב")).toEqual([]);
      expect(fetch).not.toHaveBeenCalled();
    });

    it.each([
      ["a placeholder value", "your-supabase-url-here"],
      ["a non-http protocol", "ftp://proj.supabase.co"],
      ["an unparseable url", "://///"],
    ])("skips the network when the url is %s", async (_label, url) => {
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", url);

      expect(await fetchCafeReviews("קפה נונו", "תל אביב")).toEqual([]);
      expect(fetch).not.toHaveBeenCalled();
    });

    it("returns [] on a non-OK response", async () => {
      vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(new Response("nope", { status: 500 }))));

      expect(await fetchCafeReviews("קפה נונו", "תל אביב")).toEqual([]);
    });

    it("returns [] when the fetch throws", async () => {
      vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("ECONNRESET"))));

      expect(await fetchCafeReviews("קפה נונו", "תל אביב")).toEqual([]);
    });

    it("returns [] when the request times out", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn(() => Promise.reject(new DOMException("The operation was aborted", "TimeoutError"))),
      );

      expect(await fetchCafeReviews("קפה נונו", "תל אביב")).toEqual([]);
    });

    it("returns [] when the body is not valid JSON", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn(() => Promise.resolve(new Response("<html>gateway error</html>", { status: 200 }))),
      );

      expect(await fetchCafeReviews("קפה נונו", "תל אביב")).toEqual([]);
    });
  });
});
