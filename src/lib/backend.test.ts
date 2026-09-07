import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { backendConfig, backendHeaders, consumeLimit } from "./backend";

describe("server backend boundary", () => {
  beforeEach(() => { vi.stubEnv("SUPABASE_URL", "https://proj.supabase.co"); vi.stubEnv("SUPABASE_SECRET_KEY", "sb_secret_test_only"); });
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
  it.each(["sb_publishable_misconfigured", "http://proj.supabase.co", "https://user:pass@proj.supabase.co", "https://proj.supabase.co/other", "https://proj.supabase.co/?x=1"])("rejects unsafe URL %s", url => {
    vi.stubEnv("SUPABASE_URL", url); expect(backendConfig()).toBeNull();
  });
  it("does not treat a new API key as a JWT", () => {
    expect(backendHeaders("sb_secret_test_only")).toEqual({ apikey: "sb_secret_test_only" });
    expect(backendHeaders("eyJlegacy")).toHaveProperty("Authorization", "Bearer eyJlegacy");
  });
  it.each([[true, "allowed"], [false, "limited"], [{}, "unavailable"]])("interprets only a boolean RPC result", async (body, result) => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(body))));
    expect(await consumeLimit("reviews:198.51.100.1", 5, 60000)).toBe(result);
    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toContain("/rpc/consume_api_rate_limit");
    const args = JSON.parse(init?.body as string); expect(args.p_key).toMatch(/^[a-f0-9]{64}$/); expect(args.p_window_ms).toBe(60000);
    expect(init?.body).not.toContain("198.51.100.1"); expect(init?.signal).toBeInstanceOf(AbortSignal); expect(init?.cache).toBe("no-store");
  });
  it("fails closed without configured credentials", async () => {
    vi.stubEnv("SUPABASE_SECRET_KEY", ""); vi.stubGlobal("fetch", vi.fn());
    expect(await consumeLimit("key", 1, 1000)).toBe("unavailable"); expect(fetch).not.toHaveBeenCalled();
  });
  it("fails closed on RPC errors", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("missing function", { status: 404 })));
    expect(await consumeLimit("key", 1, 1000)).toBe("unavailable");
    vi.mocked(fetch).mockRejectedValue(new Error("timeout")); expect(await consumeLimit("key", 1, 1000)).toBe("unavailable");
  });
});
