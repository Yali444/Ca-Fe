import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("react", () => ({ cache: (fn: unknown) => fn }));
vi.mock("@opinly/next", () => ({ opinlyConfig: {} }));
const client = vi.hoisted(() => ({ posts: vi.fn(), post: vi.fn(), categories: vi.fn(), tags: vi.fn(), authors: vi.fn(), author: vi.fn() }));
vi.mock("./client", () => ({ getOpinlyClient: () => client }));
import { loadBlogRoute } from "./routes";
const list = { data: [], has_more: false, next_cursor: null };
beforeEach(() => {
  vi.clearAllMocks();
  client.posts.mockResolvedValue(list);
  client.categories.mockResolvedValue([{ slug: "coffee", title: "Coffee", description: "" }]);
  client.tags.mockResolvedValue([{ slug: "espresso", name: "Espresso" }]);
  client.author.mockResolvedValue({ type: "author", data: { name: "Yali", slug: "yali" } });
  client.authors.mockResolvedValue({ type: "authors", data: [] });
});
describe("blog routing", () => {
  it("renders the index and carries pagination cursors", async () => {
    expect(await loadBlogRoute("", "page-two")).toMatchObject({ type: "home", list });
    expect(client.posts).toHaveBeenCalledWith({ limit: 12, cursor: "page-two" });
  });
  it("routes flat posts and propagates missing posts", async () => {
    client.post.mockResolvedValueOnce({ slug: "brew" }).mockResolvedValueOnce(null);
    expect(await loadBlogRoute("brew")).toMatchObject({ type: "post" });
    expect(await loadBlogRoute("missing")).toEqual({ type: "not-found" });
  });
  it("rejects malformed and unknown archives", async () => {
    for (const path of ["a/b/c", "category", "category/missing", "tag/missing", "a/b"]) expect(await loadBlogRoute(path)).toEqual({ type: "not-found" });
    expect(client.post).not.toHaveBeenCalled();
  });
  it("filters each archive by its own taxonomy and paginates authors", async () => {
    expect(await loadBlogRoute("category/coffee")).toMatchObject({ type: "category" });
    expect(client.posts).toHaveBeenLastCalledWith({ limit: 12, category: "coffee", cursor: undefined });
    expect(await loadBlogRoute("tag/espresso")).toMatchObject({ type: "tag" });
    expect(client.posts).toHaveBeenLastCalledWith({ limit: 12, tag: "espresso", cursor: undefined });
    expect(await loadBlogRoute("authors/yali", "next")).toMatchObject({ type: "author" });
    expect(client.posts).toHaveBeenLastCalledWith({ limit: 12, author: "yali", cursor: "next" });
    expect(await loadBlogRoute("authors")).toMatchObject({ type: "authors" });
  });
  it("propagates upstream failures instead of caching an empty success", async () => {
    client.post.mockRejectedValue(new Error("Unavailable"));
    await expect(loadBlogRoute("brew")).rejects.toThrow("Unavailable");
  });
});
