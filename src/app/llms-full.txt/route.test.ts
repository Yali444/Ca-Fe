import { describe, it, expect } from "vitest";
import { GET } from "./route";

describe("GET /llms-full.txt", () => {
  it("serves per-cafe detail blocks as plain text", async () => {
    const res = GET();
    expect(res.headers.get("Content-Type")).toBe("text/plain; charset=utf-8");

    const body = await res.text();
    expect(body.startsWith("# Ca-Fe")).toBe(true);
    // Points back to the short index.
    expect(body).toContain("/llms.txt");
    // Per-cafe blocks use ### headings and carry a page link + hours label.
    expect(body).toContain("### ");
    expect(body).toContain("- שעות:");
    expect(body).toMatch(/- עמוד: https?:\/\/[^\s]+\/cafe\/[^\s]+/);
  });
});
