import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./route";
import { consumeLimit } from "@/lib/backend";
import { getAllCafes } from "@/lib/cafe-lookup";
import { reviewCafeId } from "@/lib/reviews-server";

vi.mock("@/lib/backend", async importOriginal => ({
  ...await importOriginal<typeof import("@/lib/backend")>(), consumeLimit: vi.fn(),
}));
const cafe = getAllCafes()[0];
const cafeId = reviewCafeId(cafe.name, cafe.rawCity);
const validBody = { cafeId, name: "דנה", rating: 5, text: "קפה מעולה" };
let serial = 0;
const post = (body: unknown, headers: Record<string, string> = {}) => POST(new Request("https://example.com/api/reviews", {
  method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": `198.51.100.${++serial}`, ...headers }, body: JSON.stringify(body),
}));

describe("review API security", () => {
  beforeEach(() => {
    vi.stubEnv("SUPABASE_URL", "https://proj.supabase.co");
    vi.stubEnv("SUPABASE_SECRET_KEY", "sb_secret_test_only");
    vi.mocked(consumeLimit).mockReset().mockResolvedValue("allowed");
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify([{ id: 1, created_at: "2026-09-07T00:00:00Z" }]), { status: 201 })));
  });
  afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

  it("inserts validated fields with a server-only API key and timeout", async () => {
    const response = await post({ ...validBody, name: "  דנה ", hidden: true, role: "admin" });
    expect(response.status).toBe(201);
    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toContain("select=id,created_at");
    expect(init?.headers).toMatchObject({ apikey: "sb_secret_test_only" });
    expect(init?.headers).not.toHaveProperty("Authorization");
    expect(init?.signal).toBeInstanceOf(AbortSignal);
    expect(JSON.parse(init?.body as string)).toEqual({ cafe_id: cafeId, שם: "דנה", דירוג: 5, הערה: "קפה מעולה", hidden: false });
    expect(await response.text()).not.toContain("sb_secret_");
  });
  it.each([null, [], true, "text"])('rejects non-object %j', async body => {
    expect((await post(body)).status).toBe(400); expect(fetch).not.toHaveBeenCalled();
  });
  it.each([
    { cafeId: true }, { cafeId: String(cafeId) }, { cafeId: 9007199254740991 },
    { rating: true }, { rating: "5" }, { rating: 0 }, { rating: 6 }, { rating: 1.5 },
    { name: "" }, { name: "a".repeat(41) }, { text: " " }, { text: "a".repeat(1001) },
  ])('rejects invalid fields %j', async override => {
    expect((await post({ ...validBody, ...override })).status).toBe(400); expect(fetch).not.toHaveBeenCalled();
  });
  it("caps actual bytes even without a content-length header", async () => {
    expect((await post({ ...validBody, padding: "a".repeat(9000) })).status).toBe(413);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("rejects cross-origin browser submissions", async () => {
    expect((await post(validBody, { origin: "https://attacker.invalid" })).status).toBe(403);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("requires JSON content type", async () => {
    expect((await post(validBody, { "content-type": "text/plain" })).status).toBe(415);
  });
  it("does not fall back to legacy public credentials", async () => {
    vi.stubEnv("SUPABASE_SECRET_KEY", ""); vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "sb_secret_unsafe_old_value");
    expect((await post(validBody)).status).toBe(503); expect(fetch).not.toHaveBeenCalled();
  });
  it.each([["limited", 429], ["unavailable", 503]] as const)("blocks writes when durable limit is %s", async (state, status) => {
    vi.mocked(consumeLimit).mockResolvedValue(state);
    const res = await post(validBody); expect(res.status).toBe(status); expect(res.headers.get("Retry-After")).toBe("60");
    expect(fetch).not.toHaveBeenCalled();
  });
  it("does not fabricate success for an empty insert result", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response("[]", { status: 201 }));
    expect((await post(validBody)).status).toBe(502);
  });
  it("does not expose backend failures", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("sb_secret_do_not_print"));
    const res = await post(validBody); expect(res.status).toBe(502); expect(await res.text()).toBe('{"error":"Insert failed"}');
  });
  it("validates review reads before contacting the database", async () => {
    expect((await GET(new Request("https://example.com/api/reviews?cafeId=999999999"))).status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("reads only visible review columns with caching", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify([{ id: 1, שם: "דנה", דירוג: 5, הערה: "קפה" }])));
    const res = await GET(new Request(`https://example.com/api/reviews?cafeId=${cafeId}`));
    expect(res.status).toBe(200); expect(res.headers.get("Cache-Control")).toContain("s-maxage=60");
    expect(vi.mocked(fetch).mock.calls[0][0]).toContain("hidden=eq.false");
    expect(vi.mocked(fetch).mock.calls[0][0]).not.toContain("select=*");
  });
});
