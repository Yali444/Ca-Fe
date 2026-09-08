import { beforeEach, describe, expect, it, vi } from "vitest";
import { Webhook } from "svix";

vi.mock("next/cache", () => ({ revalidateTag: vi.fn(), revalidatePath: vi.fn() }));
vi.mock("@opinly/next", () => ({ opinlyConfig: { siteUrl: "https://www.ca-fe.xyz", blogPrefix: "/blog", imagesPrefix: "/opinly-images" } }));
import { revalidatePath, revalidateTag } from "next/cache";
import { POST } from "./route";

const secret = `whsec_${Buffer.from("test-signing-secret-for-opinly").toString("base64")}`;
function request(body: unknown, valid = true) {
  const payload = JSON.stringify(body);
  const date = new Date();
  const id = "msg_test";
  return new Request("https://www.ca-fe.xyz/api/opinly", {
    method: "POST", body: payload,
    headers: { "svix-id": id, "svix-timestamp": String(Math.floor(date.getTime() / 1000)), "svix-signature": valid ? new Webhook(secret).sign(id, date, payload) : "v1,invalid" },
  });
}
const changed = ["home", "post", "category", "author", "tag"].map((type) => ({ type, slug: type === "home" ? "" : "coffee", lastModified: "2026-09-08T00:00:00Z" }));
beforeEach(() => { vi.clearAllMocks(); vi.stubEnv("OPINLY_WEBHOOK_SIGNING_SECRET", secret); });
describe("Opinly webhook", () => {
  it("rejects forged events without invalidating either cache", async () => {
    expect((await POST(request({ type: "content.routes-changed", data: { changed } }, false))).status).toBe(400);
    expect(revalidateTag).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });
  it("immediately expires data and every changed route plus paginated archives", async () => {
    expect((await POST(request({ type: "content.routes-changed", data: { changed } }))).status).toBe(200);
    expect(revalidateTag).toHaveBeenCalledWith("opinly", { expire: 0 });
    for (const path of ["/blog", "/blog/coffee", "/blog/category/coffee", "/blog/authors/coffee", "/blog/tag/coffee", "/sitemap.xml"]) expect(revalidatePath).toHaveBeenCalledWith(path);
    expect(revalidatePath).toHaveBeenCalledWith("/blog/[[...slug]]", "page");
  });
  it("acknowledges unrelated events without invalidating", async () => {
    expect((await POST(request({ type: "other" }))).status).toBe(200);
    expect(revalidateTag).not.toHaveBeenCalled();
  });
  it("rejects malformed signed payloads atomically", async () => {
    expect((await POST(request({ type: "content.routes-changed", data: { changed: [...changed, { type: "post", slug: "../admin" }] } }))).status).toBe(400);
    expect(revalidateTag).not.toHaveBeenCalled();
  });
  it("fails closed when not configured", async () => {
    vi.stubEnv("OPINLY_WEBHOOK_SIGNING_SECRET", "");
    expect((await POST(request({})))).toHaveProperty("status", 503);
  });
});
