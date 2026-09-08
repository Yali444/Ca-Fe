import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { getOpinlyClient } from "./client";

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
describe("Opinly fetch cache", () => {
  it("tags and caches content reads, but never caches purchase POSTs", async () => {
    vi.stubEnv("OPINLY_API_KEY", "test-key");
    const fetcher = vi.fn().mockResolvedValueOnce(Response.json([])).mockResolvedValueOnce(Response.json({ recorded: true }));
    vi.stubGlobal("fetch", fetcher);
    const client = getOpinlyClient();
    await client.routes();
    await client.trackPurchase({ orderId: "test-order", value: 12, currency: "ILS", anonId: "visitor" });
    expect(fetcher.mock.calls[0][1]).toMatchObject({ cache: "force-cache", next: { tags: ["opinly"] } });
    expect(fetcher.mock.calls[1][1]).toMatchObject({ cache: "no-store", next: { tags: ["opinly"] } });
  });
});
