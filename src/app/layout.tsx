import type { Metadata } from "next";
import "./globals.css";
import { timeBurner, aran } from "@/lib/fonts";
import { ThemeProvider } from "@/components/ui/theme-provider";

export const metadata: Metadata = {
  title: "Ca Fe",
  description:
    "מדריך בתי קפה ספשלטי בישראל - מפה ואינדקס מקיף של בתי קלייה ובתי קפה איכותיים",
  icons: {
    icon: "/images/favicon CA FE.ico",
    shortcut: "/images/favicon CA FE.ico",
    apple: "/images/favicon CA FE.ico",
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
        className={`${timeBurner.variable} ${aran.variable} antialiased bg-gradient-to-br from-[#E0F2FE] via-[#F0F9FF] to-[#DBEAFE] dark:bg-[#0B1120] dark:text-slate-200`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
