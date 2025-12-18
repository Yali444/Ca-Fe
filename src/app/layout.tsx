import type { Metadata } from "next";
import "./globals.css";
import { timeBurner, aran } from "@/lib/fonts";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { Analytics } from "@vercel/analytics/next";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.ca-fe.xyz";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Ca Fe",
  description:
    "מדריך בתי קפה ספשלטי בישראל - מפה ואינדקס מקיף של בתי קלייה ובתי קפה איכותיים",
  icons: {
    icon: "/images/favicon CA FE.ico",
    shortcut: "/images/favicon CA FE.ico",
    apple: "/images/favicon CA FE.ico",
  },
  openGraph: {
    title: "Ca Fe",
    description:
      "מדריך בתי קפה ספשלטי בישראל - מפה ואינדקס מקיף של בתי קלייה ובתי קפה איכותיים.",
    url: siteUrl,
    siteName: "Ca Fe",
    locale: "he_IL",
    type: "website",
    images: [
      {
        url: "/images/Ca Fe Logo.png",
        width: 1200,
        height: 630,
        alt: "Ca Fe guide logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Ca Fe",
    description:
      "מדריך בתי קפה ספשלטי בישראל - מפה ואינדקס מקיף של בתי קלייה ובתי קפה איכותיים.",
    images: ["/images/Ca Fe Logo.png"],
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
        <link rel="icon" href="/images/favicon CA FE.ico" sizes="any" />
        <link rel="shortcut icon" href="/images/favicon CA FE.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/images/favicon CA FE.ico" />
      </head>
      <body
        className={`${timeBurner.variable} ${aran.variable} antialiased bg-white dark:bg-black text-slate-900 dark:text-slate-100`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
