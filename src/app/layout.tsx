import type { Metadata, Viewport } from "next";
import "./globals.css";
import { timeBurner, aran } from "@/lib/fonts";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.ca-fe.xyz";

// A single, accessible viewport (no maximum-scale / user-scalable=no, which
// blocks pinch-zoom). Defined via Next's viewport export so there's exactly one
// viewport tag rather than a manual <meta> duplicating Next's default.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Keeps the mobile browser chrome in step with the theme — otherwise a
  // dark-mode visitor gets a white address bar above a #0B1120 page.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FFFFFF" },
    { media: "(prefers-color-scheme: dark)", color: "#0B1120" },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "בתי קפה ספיישלטי בישראל | Ca-Fe",
    template: "%s | Ca-Fe",
  },
  description:
    "בתי קפה ספיישלטי בישראל — בתי קפה, בתי קלייה וקפה ספיישלטי איכותי בתל אביב, ירושלים ובכל הארץ. גלו את המקומות הטובים ביותר לקפה ספיישלטי.",
  keywords: [
    "קפה ספיישלטי",
    "בתי קפה ספיישלטי",
    "בתי קפה ספיישלטי בישראל",
    "קפה ספשיילטי",
    "בתי קפה ספשיילטי",
    "בתי קפה בישראל",
    "בתי קלייה",
    "קפה איכותי",
    "specialty coffee",
    "Israel",
    "Tel Aviv",
    "Jerusalem",
    "coffee shops",
    "roasteries",
    "specialty cafes",
    "coffee culture",
  ],
  authors: [{ name: "Ca Fe" }],
  creator: "Ca Fe",
  publisher: "Ca Fe",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    icon: "/images/ca_fe_logo.png",
    shortcut: "/images/ca_fe_logo.png",
    apple: "/images/ca_fe_logo.png",
  },
  openGraph: {
    title: "בתי קפה ספיישלטי בישראל | Ca-Fe",
    description:
      "בתי קפה ספיישלטי בישראל — בתי קפה, בתי קלייה וקפה ספיישלטי איכותי בתל אביב, ירושלים ובכל הארץ. גלו את המקומות הטובים ביותר לקפה ספיישלטי.",
    url: siteUrl,
    siteName: "בתי קפה ספיישלטי בישראל",
    locale: "he_IL",
    type: "website",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "בתי קפה ספיישלטי בישראל — קפה ספיישלטי",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "בתי קפה ספיישלטי בישראל | Ca-Fe",
    description:
      "בתי קפה ספיישלטי בישראל — בתי קפה, בתי קלייה וקפה ספיישלטי איכותי בכל הארץ.",
    images: ["/opengraph-image"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  // Google Search Console ownership verification.
  verification: {
    google: "WgtLTSIPhqhz7mxIRKzagvueSjos5g2jsJdC3CGYtA8",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/images/ca_fe_favicon.ico" sizes="any" />
        <link rel="shortcut icon" href="/images/ca_fe_favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/images/ca_fe_logo.png" />
        {/*
          Resource hints for third-party origins hit on first paint. The map
          is the default view, so warm the CartoDB basemap connection early
          (tiles are served from a/b/c/d.basemaps.cartocdn.com — preconnect one
          subdomain to share the TLS session, dns-prefetch covers the rest).
          Leaflet marker icons load from unpkg/cdnjs alongside the map.
        */}
        {/*
          The catalogue is fetched by usePlaceData, which lives inside the
          client-only guide chunk — so without a hint the browser can't even
          start that request until the whole bundle has downloaded, parsed and
          mounted. Preloading it here overlaps the JSON download with the JS
          download instead of chaining them.
        */}
        <link rel="preload" href="/data/cafes.json" as="fetch" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://a.basemaps.cartocdn.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://basemaps.cartocdn.com" />
        <link rel="dns-prefetch" href="https://unpkg.com" />
        <link rel="dns-prefetch" href="https://cdnjs.cloudflare.com" />
      </head>
      <body
        className={`${timeBurner.variable} ${aran.variable} antialiased bg-background text-foreground`}
      >
        {/* Skip link — first tabbable element; #main exists on the app shell
            and on every static page. */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:right-2 focus:z-[10100] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-foreground focus:shadow-lg dark:focus:bg-zinc-900"
        >
          דלג לתוכן
        </a>
        {/* `system` follows the OS preference on a first visit; an explicit
            choice from the toggle is remembered and wins from then on. */}
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
