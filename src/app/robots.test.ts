import { describe, expect, it, vi } from "vitest";

import { middleware } from "@/middleware";
import robots from "./robots";

const result = robots();
const rules = Array.isArray(result.rules) ? result.rules : [result.rules];
const siteUrl = "https://www.ca-fe.xyz";

const aiRule = rules.find((r) => Array.isArray(r.userAgent))!;
const aiCrawlers = aiRule.userAgent as string[];

describe("robots", () => {
  it("allows every crawler to read the site", () => {
    const wildcard = rules.find((r) => r.userAgent === "*")!;
    expect(wildcard.allow).toBe("/");
  });

  // The API routes hold no indexable content and the geocode proxy calls an
  // external service on every hit — crawling them is pure cost.
  it("keeps every rule out of /api/", () => {
    for (const rule of rules) {
      expect(rule.disallow).toBe("/api/");
    }
  });

  it("points at an absolute sitemap and host", () => {
    expect(result.sitemap).toBe(`${siteUrl}/sitemap.xml`);
    expect(result.host).toBe(siteUrl);
  });

  it("names the AI answer engines explicitly, not only via the wildcard", () => {
    expect(aiCrawlers).toEqual(expect.arrayContaining(["GPTBot", "ClaudeBot", "PerplexityBot"]));
    expect(aiRule.allow).toBe("/");
  });

  it("lists each crawler once", () => {
    expect(aiCrawlers).toHaveLength(new Set(aiCrawlers).size);
  });

  // robots.ts and middleware.ts each keep their own crawler list. They are
  // allowed to differ — middleware deliberately logs a wider set, including
  // bots we don't single out here — but the reverse would be a mistake: a
  // crawler we explicitly welcome should show up in the traffic log, otherwise
  // there is no way to tell whether inviting it achieved anything.
  it("logs every crawler it welcomes, so the two lists can't drift apart silently", () => {
    for (const bot of aiCrawlers) {
      const log = vi.spyOn(console, "log").mockImplementation(() => {});
      middleware({
        headers: new Headers({ "user-agent": bot }),
        nextUrl: { pathname: "/llms.txt" },
      } as unknown as Parameters<typeof middleware>[0]);

      const logged = log.mock.calls.length === 1;
      log.mockRestore();

      expect(logged, `${bot} is welcomed in robots.txt but not logged by the middleware`).toBe(
        true,
      );
    }
  });
});
