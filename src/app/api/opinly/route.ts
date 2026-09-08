import { Webhook } from "svix";
import { revalidatePath, revalidateTag } from "next/cache";
import { opinlyConfig } from "@opinly/next";
import { sitemapUrl } from "@opinly/shared";
import type { ContentRouteChange } from "@opinly/backend";

export const runtime = "nodejs";

function isRoute(value: unknown): value is ContentRouteChange {
  if (!value || typeof value !== "object") return false;
  const route = value as Record<string, unknown>;
  return ["home", "post", "category", "author", "tag"].includes(String(route.type)) &&
    typeof route.slug === "string" &&
    (route.type === "home" ? route.slug === "" : route.slug.length > 0 && !/[/?#\\\[\]]/.test(route.slug) && route.slug !== "." && route.slug !== "..") &&
    typeof route.lastModified === "string" && Number.isFinite(Date.parse(route.lastModified));
}

export async function POST(request: Request) {
  const secret = process.env.OPINLY_WEBHOOK_SIGNING_SECRET;
  if (!secret) return new Response("Webhook not configured", { status: 503 });
  const id = request.headers.get("svix-id");
  const timestamp = request.headers.get("svix-timestamp");
  const signature = request.headers.get("svix-signature");
  if (!id || !timestamp || !signature) return new Response("Missing signature", { status: 400 });

  let event: unknown;
  try {
    event = new Webhook(secret).verify(await request.text(), {
      "svix-id": id, "svix-timestamp": timestamp, "svix-signature": signature,
    });
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }
  if (!event || typeof event !== "object") return new Response("Invalid event", { status: 400 });
  const payload = event as { type?: unknown; data?: { changed?: unknown } };
  if (payload.type !== "content.routes-changed") return new Response("ok");
  const changed = payload.data?.changed;
  if (!Array.isArray(changed) || !changed.every(isRoute)) return new Response("Invalid routes", { status: 400 });

  // Drop API data immediately, including on dynamically rendered/self-hosted pages.
  revalidateTag("opinly", { expire: 0 });
  for (const route of changed) {
    revalidatePath(new URL(sitemapUrl(opinlyConfig, route)).pathname);
  }
  // Lists/pagination and previously visited 404s can also contain changed posts.
  revalidatePath("/blog/[[...slug]]", "page");
  revalidatePath("/blog");
  revalidatePath("/sitemap.xml");
  return new Response("ok");
}
