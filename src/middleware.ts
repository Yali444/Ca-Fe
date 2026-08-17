import type { NextRequest } from "next/server";

/**
 * Logs when an AI answer engine fetches the GEO surfaces (`/llms.txt`,
 * `/llms-full.txt`).
 *
 * Why this exists: those files are prerendered and served straight from the
 * CDN, so they never invoke a function and leave no trace in Vercel's runtime
 * logs — and Vercel Analytics is client-side JS that crawlers don't execute.
 * Without this there is no way to answer "is anything actually reading the
 * llms.txt we publish?". One structured log line per crawler hit makes that
 * observable via the runtime logs.
 *
 * The matcher is limited to those two paths, so no user-facing request pays
 * any middleware cost.
 */

/** Crawlers we care about, matched case-insensitively against the UA. */
const AI_CRAWLERS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-SearchBot",
  "anthropic-ai",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Applebot-Extended",
  "CCBot",
  "Bytespider",
  "Amazonbot",
  "meta-externalagent",
];

function identify(userAgent: string): string | null {
  const ua = userAgent.toLowerCase();
  return AI_CRAWLERS.find((name) => ua.includes(name.toLowerCase())) ?? null;
}

export function middleware(request: NextRequest) {
  const bot = identify(request.headers.get("user-agent") ?? "");
  if (bot) {
    // Single-line JSON so the entries are greppable in Vercel's log search
    // (query "geo-crawl") and parseable if they're ever piped to a drain.
    console.log(
      JSON.stringify({
        tag: "geo-crawl",
        bot,
        path: request.nextUrl.pathname,
        at: new Date().toISOString(),
      }),
    );
  }
  // Always fall through — this observes, it never blocks or alters a response.
}

export const config = {
  matcher: ["/llms.txt", "/llms-full.txt"],
};
