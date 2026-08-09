import type { MetadataRoute } from "next";

import { prisma } from "@/lib/prisma";

// Site haritası her istekte veritabanından üretiliyor. Ürün ve kategori
// sayısı (222 / 50) statik üretmeyi gerektirecek boyutta değil, buna karşılık
// panelden yapılan her değişiklik anında yansıyor.
export const dynamic = "force-dynamic";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = SITE_URL.replace(/\/+$/, "");

  const [categories, products, pages] = await Promise.all([
    prisma.category.findMany({
      where: { isActive: true },
      select: { slug: true, updatedAt: true },
    }),
    prisma.product.findMany({
      where: { isActive: true },
      select: { slug: true, updatedAt: true },
    }),
    prisma.page.findMany({
      where: { isActive: true },
      select: { slug: true, updatedAt: true },
    }),
  ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: "daily", priority: 1 },
    { url: `${base}/yeni-urunler`, changeFrequency: "daily", priority: 0.8 },
    { url: `${base}/bayi-basvurusu`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/bayi-girisi`, changeFrequency: "yearly", priority: 0.3 },
  ];

  return [
    ...staticRoutes,
    ...categories.map((category) => ({
      url: `${base}/kategori/${category.slug}`,
      lastModified: category.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...products.map((product) => ({
      url: `${base}/urun/${product.slug}`,
      lastModified: product.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
    ...pages.map((page) => ({
      url: `${base}/sayfa/${page.slug}`,
      lastModified: page.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.4,
    })),
  ];
}
