import { createHash } from "node:crypto";

// Node-only module. Never import credentials into a client component.
export function backendConfig(): { url: string; key: string } | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" || parsed.username || parsed.password ||
        parsed.search || parsed.hash || parsed.pathname !== "/") return null;
    return { url: parsed.origin, key };
  } catch { return null; }
}

export function backendHeaders(key: string): Record<string, string> {
  // New sb_secret keys are API keys, not JWT bearer tokens.
  return { apikey: key, ...(key.startsWith("eyJ") ? { Authorization: `Bearer ${key}` } : {}) };
}

export async function consumeLimit(key: string, limit: number, windowMs: number): Promise<"allowed" | "limited" | "unavailable"> {
  const config = backendConfig();
  if (!config) return "unavailable";
  try {
    const res = await fetch(`${config.url}/rest/v1/rpc/consume_api_rate_limit`, {
      method: "POST",
      headers: { ...backendHeaders(config.key), "Content-Type": "application/json" },
      body: JSON.stringify({ p_key: createHash("sha256").update(key).digest("hex"), p_limit: limit, p_window_ms: windowMs }),
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return "unavailable";
    const allowed: unknown = await res.json();
    return allowed === true ? "allowed" : allowed === false ? "limited" : "unavailable";
  } catch { return "unavailable"; }
}
