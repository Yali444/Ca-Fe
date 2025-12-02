import localFont from "next/font/local";

// TimeBurner font for English text
export const timeBurner = localFont({
  src: [
    {
      path: "../../public/fonts/timeburnernormal.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../public/fonts/timeburnerbold.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-timeburner",
  display: "swap",
  fallback: ["Arial", "Helvetica", "sans-serif"],
  preload: true,
  adjustFontFallback: false,
});

// ARAN font for Hebrew text
export const aran = localFont({
  src: [
    {
      path: "../../public/fonts/os_aran_400ffc-webfont.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../public/fonts/os_aran_w_500ffc-webfont.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../../public/fonts/os_aran_r_600ffc-webfont.woff2",
      weight: "600",
      style: "normal",
    },
  ],
  variable: "--font-aran",
  display: "swap",
  fallback: ["sans-serif"],
});

