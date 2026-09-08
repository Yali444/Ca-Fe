import "server-only";
import { createOpinlyClient } from "@opinly/backend";

// Lazy construction lets the existing guide build without a blog key.
// Never put OPINLY_API_KEY in next.config.env or a NEXT_PUBLIC variable.
export function getOpinlyClient() {
  return createOpinlyClient({
    apiKey: process.env.OPINLY_API_KEY,
    fetch: (url, init) => {
      const method = init?.method ?? (url instanceof Request ? url.method : "GET");
      const read = method.toUpperCase() === "GET";
      return fetch(url, {
        ...init,
        cache: read ? "force-cache" : "no-store",
        next: { tags: ["opinly"] },
      });
    },
  });
}
