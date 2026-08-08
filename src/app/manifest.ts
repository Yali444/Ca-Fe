import type { MetadataRoute } from "next";

/**
 * Web App Manifest — makes Ca-Fe installable as a PWA (the service worker in
 * public/sw.js already handles offline caching). Next serves this at
 * /manifest.webmanifest and injects the <link rel="manifest"> automatically,
 * so no change to layout.tsx is needed.
 *
 * Colors mirror the app's tokens: the brand blue (#0071E3) and the dark
 * surface (#0B1120) used across the interactive shell and static pages.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "בתי קפה ספיישלטי בישראל | Ca-Fe",
    short_name: "Ca-Fe",
    description:
      "מדריך אינטראקטיבי לבתי קפה ובתי קלייה של קפה ספיישלטי בישראל.",
    lang: "he",
    dir: "rtl",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#0B1120",
    theme_color: "#0071E3",
    icons: [
      {
        src: "/images/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/images/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/images/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
