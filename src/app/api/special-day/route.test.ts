import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

describe("GET /api/special-day", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("calls Hebcal with the Israel scheme and Hebrew titles", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ items: [] }), { status: 200 }),
    );

    await GET();

    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain("hebcal.com/hebcal");
    expect(calledUrl).toContain("i=on");
    expect(calledUrl).toContain("lg=he");
    expect(calledUrl).toContain("mod=on");
  });

  it("splits relevant items into today and tomorrow buckets", async () => {
    // Build dates that match the route's own Israel-time view of now.
    const { getIsraelToday, getIsraelTomorrow } = await import(
      "@/lib/special-days"
    );
    const today = getIsraelToday();
    const tomorrow = getIsraelTomorrow();

    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          items: [
            { title: "יום הזיכרון", date: today, category: "holiday", subcat: "modern" },
            { title: "יום העצמאות", date: tomorrow, category: "holiday", subcat: "modern" },
            // Irrelevant — should be filtered out.
            { title: "ראש חודש אייר", date: today, category: "roshchodesh" },
          ],
        }),
        { status: 200 },
      ),
    );

    const res = await GET();
    const body = (await res.json()) as {
      today: Array<{ title: string }>;
      tomorrow: Array<{ title: string }>;
    };

    expect(body.today.map((d) => d.title)).toEqual(["יום הזיכרון"]);
    expect(body.tomorrow.map((d) => d.title)).toEqual(["יום העצמאות"]);
  });

  it("degrades to empty buckets when Hebcal returns a non-OK status", async () => {
    fetchMock.mockResolvedValue(new Response("boom", { status: 500 }));

    const res = await GET();
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ today: [], tomorrow: [] });
  });

  it("degrades to empty buckets when fetch throws", async () => {
    fetchMock.mockRejectedValue(new Error("ECONNRESET"));

    const res = await GET();
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ today: [], tomorrow: [] });
  });
});
