import type { Metadata } from "next";
import "./globals.css";
import { timeBurner, aran } from "@/lib/fonts";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { Analytics } from "@vercel/analytics/next";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.ca-fe.xyz";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Israel Specialty Coffee Guide",
    template: "%s | Israel Specialty Coffee Guide",
  },
  description:
    "A curated guide to the best specialty coffee shops in Israel. Discover independent roasteries and specialty cafes across Tel Aviv, Jerusalem, and throughout the country.",
  keywords: [
    "specialty coffee",
    "coffee guide",
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
    title: "Israel Specialty Coffee Guide",
    description:
      "A curated guide to the best specialty coffee shops in Israel. Discover independent roasteries and specialty cafes across Tel Aviv, Jerusalem, and throughout the country.",
    url: siteUrl,
    siteName: "Israel Specialty Coffee Guide",
    locale: "he_IL",
    type: "website",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Israel Specialty Coffee Guide - Discover the best specialty coffee shops in Israel",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Israel Specialty Coffee Guide",
    description:
      "A curated guide to the best specialty coffee shops in Israel. Discover independent roasteries and specialty cafes.",
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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <link rel="icon" href="/images/ca_fe_favicon.ico" sizes="any" />
        <link rel="shortcut icon" href="/images/ca_fe_favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/images/ca_fe_logo.png" />
      </head>
      <body
        className={`${timeBurner.variable} ${aran.variable} antialiased bg-white dark:bg-black text-slate-900 dark:text-slate-100`}
      >
        <ThemeProvider
          attribute="class"
          enableSystem
        >
          {children}
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
