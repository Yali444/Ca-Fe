import { getAllCafes } from "@/lib/cafe-lookup";
import { getNumericId } from "@/lib/numeric-id";
import { generatePlaceId } from "@/lib/place-id";

const cafeIds = new Set(getAllCafes().map(c => getNumericId(generatePlaceId(c.name, c.rawCity))));
export function isReviewCafeId(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && cafeIds.has(value);
}

export async function readReviewBody(request: Request): Promise<unknown> {
  const maxBytes = 8192;
  if (Number(request.headers.get("content-length")) > maxBytes) throw new RangeError();
  const reader = request.body?.getReader();
  if (!reader) throw new SyntaxError();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) { await reader.cancel(); throw new RangeError(); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
