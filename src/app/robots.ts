import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  const base = SITE_URL.replace(/\/+$/, "");

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Panel ve müşteriye özel sayfalar dizine girmemeli: içerikleri
      // oturuma bağlı, arama sonucunda görünmelerinin anlamı yok.
      disallow: ["/panel", "/hesabim", "/sepet", "/siparis", "/siparis-alindi", "/arama"],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
