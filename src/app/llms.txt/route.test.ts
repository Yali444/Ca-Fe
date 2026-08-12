import { describe, it, expect } from "vitest";
import { GET } from "./route";

describe("GET /llms.txt", () => {
  it("serves a plain-text Markdown index of the catalogue", async () => {
    const res = GET();
    expect(res.headers.get("Content-Type")).toBe("text/plain; charset=utf-8");

    const body = await res.text();
    expect(body.startsWith("# Ca-Fe")).toBe(true);
    expect(body).toContain("## ערים");
    expect(body).toContain("## נושאים");
    expect(body).toContain("## בתי קפה");
    // At least one crawlable cafe link.
    expect(body).toMatch(/\]\(https?:\/\/[^)]+\/cafe\/[^)]+\)/);
  });
});
