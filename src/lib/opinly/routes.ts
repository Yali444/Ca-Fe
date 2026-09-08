import "server-only";
import { cache } from "react";
import { opinlyConfig } from "@opinly/next";
import { getOpinlyClient } from "./client";

export const loadBlogRoute = cache(async (path: string, cursor?: string) => {
  const slug = path ? path.split("/") : [];
  const missing = { type: "not-found" as const };
  if (slug.length > 2) return missing;
  const client = getOpinlyClient();
  const page = { limit: 12, cursor };
  if (!slug.length) {
    const [list, categories] = await Promise.all([client.posts(page), client.categories()]);
    return { type: "home" as const, list, categories };
  }
  if (slug[0] === (opinlyConfig.categoryPrefix ?? "category")) {
    if (slug.length !== 2) return missing;
    const categories = await client.categories();
    const category = categories.find((item) => item.slug === slug[1]);
    if (!category) return missing;
    return { type: "category" as const, data: { ...category, name: category.title }, list: await client.posts({ ...page, category: slug[1] }) };
  }
  if (slug[0] === (opinlyConfig.tagPrefix ?? "tag")) {
    if (slug.length !== 2) return missing;
    const tag = (await client.tags()).find((item) => item.slug === slug[1]);
    if (!tag) return missing;
    return { type: "tag" as const, data: tag, list: await client.posts({ ...page, tag: slug[1] }) };
  }
  if (slug[0] === (opinlyConfig.authorPrefix ?? "authors")) {
    if (slug.length === 1) return client.authors();
    const author = await client.author(slug[1]);
    if (author.type !== "author") return missing;
    return { ...author, list: await client.posts({ ...page, author: slug[1] }) };
  }
  if (slug.length !== 1) return missing;
  const post = await client.post(slug[0]);
  return post ? { type: "post" as const, data: post } : missing;
});
