import { NextResponse } from "next/server";

// Nominatim's usage policy caps clients at 1 request/second. A short cache on
// the same query protects both that limit and this route's own latency —
// street addresses geocode to the same point every time.
const CACHE_SECONDS = 60 * 60 * 24 * 30;
const MAX_QUERY_LENGTH = 120;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");

  if (!q || !q.trim()) {
    return NextResponse.json({ error: "Missing query" }, { status: 400 });
  }
  if (q.length > MAX_QUERY_LENGTH) {
    return NextResponse.json({ error: "Query too long" }, { status: 400 });
  }

  const encodedQuery = encodeURIComponent(q);

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodedQuery}&format=json&limit=1&addressdetails=1`,
      {
        headers: {
          "User-Agent": "Ca-Fe-Coffee-Guide/1.0 (Vercel Next.js)",
          Accept: "application/json",
        },
        next: { revalidate: CACHE_SECONDS },
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: "Geocoding failed" },
        { status: response.status }
      );
    }

    const data = (await response.json()) as Array<{ lat?: string; lon?: string }>;

    if (!data || data.length === 0 || !data[0]?.lat || !data[0]?.lon) {
      return NextResponse.json(
        { result: null },
        { status: 200, headers: { "Cache-Control": `public, max-age=${CACHE_SECONDS}` } }
      );
    }

    return NextResponse.json(
      {
        result: {
          lat: Number.parseFloat(data[0].lat),
          lng: Number.parseFloat(data[0].lon),
        },
      },
      { status: 200, headers: { "Cache-Control": `public, max-age=${CACHE_SECONDS}` } }
    );
  } catch {
    return NextResponse.json({ error: "Fetch failed" }, { status: 502 });
  }
}
