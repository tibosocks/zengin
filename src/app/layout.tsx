import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";

import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "latin-ext"], // latin-ext: ş ğ ı İ ç ö ü
  display: "swap",
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Zengin Socks — Toptan Çorap",
    template: "%s | Zengin Socks",
  },
  description:
    "Kadın, erkek, çocuk ve bebe çorapları. Toptan satış — sipariş verin, ödemeyi mağazada yapın.",
  openGraph: {
    type: "website",
    locale: "tr_TR",
    siteName: "Zengin Socks",
    images: ["/brand/og-image.png"],
  },
  icons: {
    icon: [
      { url: "/brand/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/brand/favicon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="tr"
      className={`${inter.variable} ${playfair.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
