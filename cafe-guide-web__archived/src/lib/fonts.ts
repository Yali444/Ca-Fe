import localFont from "next/font/local";
import { Inter } from "next/font/google";

// Inter for Latin/English text
export const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  weight: ["400", "500", "600", "700"],
  fallback: ["Arial", "Helvetica", "sans-serif"],
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

