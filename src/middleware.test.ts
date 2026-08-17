import { describe, it, expect, vi, afterEach } from "vitest";
import type { NextRequest } from "next/server";
import { middleware, config } from "./middleware";

/** Minimal stand-in for the parts of NextRequest the middleware reads. */
const req = (userAgent: string, pathname = "/llms.txt") =>
  ({
    headers: new Headers(userAgent ? { "user-agent": userAgent } : {}),
    nextUrl: { pathname },
  }) as unknown as NextRequest;

function captureLog(fn: () => void): string[] {
  const spy = vi.spyOn(console, "log").mockImplementation(() => {});
  fn();
  const lines = spy.mock.calls.map((c) => String(c[0]));
  spy.mockRestore();
  return lines;
}

afterEach(() => vi.restoreAllMocks());

describe("GEO crawl logging middleware", () => {
  it("logs a structured line when an AI crawler fetches llms.txt", () => {
    const [line] = captureLog(() =>
      middleware(req("Mozilla/5.0 (compatible; GPTBot/1.2; +https://openai.com/gptbot)")),
    );
    const entry = JSON.parse(line);
    expect(entry).toMatchObject({ tag: "geo-crawl", bot: "GPTBot", path: "/llms.txt" });
    expect(Date.parse(entry.at)).not.toBeNaN();
  });

  it("matches the user-agent case-insensitively", () => {
    const [line] = captureLog(() => middleware(req("perplexitybot/1.0")));
    expect(JSON.parse(line).bot).toBe("PerplexityBot");
  });

  it("records which surface was fetched", () => {
    const [line] = captureLog(() => middleware(req("ClaudeBot/1.0", "/llms-full.txt")));
    expect(JSON.parse(line).path).toBe("/llms-full.txt");
  });

  it("stays silent for ordinary browsers and unknown bots", () => {
    expect(
      captureLog(() => {
        middleware(req("Mozilla/5.0 (Macintosh) AppleWebKit/537.36 Chrome/131 Safari/537.36"));
        middleware(req("Googlebot/2.1 (+http://www.google.com/bot.html)"));
        middleware(req(""));
      }),
    ).toHaveLength(0);
  });

  it("never returns a response, so the request always falls through", () => {
    expect(middleware(req("GPTBot/1.2"))).toBeUndefined();
  });

  it("only runs on the two GEO surfaces", () => {
    expect(config.matcher).toEqual(["/llms.txt", "/llms-full.txt"]);
  });
});
