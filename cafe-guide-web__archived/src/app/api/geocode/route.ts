import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");

  if (!q || !q.trim()) {
    return NextResponse.json({ error: "Missing query" }, { status: 400 });
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
        cache: "no-store",
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
      return NextResponse.json({ result: null }, { status: 200 });
    }

    return NextResponse.json(
      {
        result: {
          lat: Number.parseFloat(data[0].lat),
          lng: Number.parseFloat(data[0].lon),
        },
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json({ error: "Fetch failed" }, { status: 502 });
  }
}
