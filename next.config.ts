import type { NextConfig } from "next";

// The Supabase origin is the only same-deploy-specific external host we need to
// allowlist in connect-src. Derive it from the env var (guarded for local/dev
// where it may be unset) rather than hardcoding a project URL.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
let supabaseOrigin = "";
try {
  if (supabaseUrl) supabaseOrigin = new URL(supabaseUrl).origin;
} catch {
  // Invalid/placeholder URL — leave it out of the CSP rather than crash the build.
}

// Content-Security-Policy directives. Shipped as Report-Only (see headers())
// until the violation reports are clean, because the app relies on inline
// styles/scripts (framer-motion, next-themes theme script, Vercel Analytics,
// Disqus) and several external origins — enforcing a strict policy blind would
// risk white-screening the site.
const cspReportOnly = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'self'",
  // Unsplash (already in images.remotePatterns) + OSM tiles loaded by Leaflet.
  "img-src 'self' data: blob: https://images.unsplash.com https://*.tile.openstreetmap.org",
  // 'unsafe-inline' is pragmatic for now (next-themes/analytics inline scripts);
  // a nonce-based policy is the documented follow-up.
  "script-src 'self' 'unsafe-inline' https://disqus.com https://*.disqus.com https://*.disquscdn.com https://va.vercel-scripts.com",
  // framer-motion injects inline styles.
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  [
    "connect-src 'self' https://*.vercel-insights.com https://*.disqus.com",
    supabaseOrigin,
  ]
    .filter(Boolean)
    .join(" "),
  "frame-src https://disqus.com https://*.disqus.com",
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
        // Baseline security headers for every route. These are low-risk and
        // shipped enforcing; the CSP is Report-Only until validated.
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            // Keep geolocation=(self): the app uses navigator.geolocation
            // (useGeolocation). Lock down APIs the app never needs.
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), payment=(), geolocation=(self)',
          },
          {
            key: 'Content-Security-Policy-Report-Only',
            value: cspReportOnly,
          },
        ],
      },
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
    ];
  },
};

export default nextConfig;
