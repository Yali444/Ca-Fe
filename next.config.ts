import type { NextConfig } from "next";

// Content-Security-Policy directives, one per line for readability, joined into
// a single header value. See the header entry below for the allowlist rationale.
const CSP = [
  "default-src 'self'",
  "img-src 'self' data: blob: https://images.unsplash.com https://*.basemaps.cartocdn.com https://unpkg.com https://cdnjs.cloudflare.com",
  "connect-src 'self' https://*.supabase.co https://*.basemaps.cartocdn.com https://nominatim.openstreetmap.org https://va.vercel-scripts.com https://vitals.vercel-insights.com",
  "script-src 'self' 'unsafe-inline' https://va.vercel-scripts.com",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
].join("; ");

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
    formats: ['image/avif', 'image/webp'],
  },
  async headers() {
    return [
      {
        // cafes.json — keep it fresh: a short 60 s max-age means data updates
        // (new cafes, edits) show up almost immediately, while
        // stale-while-revalidate serves the cached copy instantly and
        // refreshes it in the background so there's no latency cost.
        source: '/data/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=60, stale-while-revalidate=86400',
          },
        ],
      },
      {
        // Static images — content-addressed filenames never change, so
        // 1-year cache is safe. Vercel also serves these from CDN edge.
        source: '/images/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // Fonts — same rationale as images
        source: '/fonts/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // Baseline security headers on every response.
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
          // Content-Security-Policy. Shipped in Report-Only first: it logs
          // violations to the console without blocking, so we can confirm the
          // allowlist below covers every real origin the app uses before
          // enforcing. Once verified in production (map tiles, search,
          // geocode, Supabase reviews, Vercel analytics all clean), rename the
          // key to 'Content-Security-Policy' to enforce.
          //
          // Allowlist rationale:
          //  - img-src: unsplash hero photos, Carto basemap tiles, and the
          //    Leaflet marker icons served from unpkg/cdnjs (see layout.tsx).
          //  - connect-src: Supabase (reviews), Carto tiles, the Nominatim
          //    geocoder, and Vercel analytics/speed-insights beacons.
          //  - script-src 'unsafe-inline': JSON-LD is injected via
          //    dangerouslySetInnerHTML and Vercel Analytics injects a script.
          //  - style-src 'unsafe-inline': Tailwind and inline style attributes.
          { key: 'Content-Security-Policy-Report-Only', value: CSP },
        ],
      },
    ];
  },
};

export default nextConfig;
