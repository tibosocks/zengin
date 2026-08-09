import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ProductGrid } from "@/components/shop/product-card";
import { ProductView } from "@/components/shop/product-view";
import { getCustomerSession } from "@/lib/auth";
import { formatKurus } from "@/lib/price";
import { prisma } from "@/lib/prisma";
import {
  getCategoryTrail,
  getProductCards,
  getProductDetail,
  getViewerDiscount,
} from "@/lib/shop/catalog";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps<"/urun/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductDetail(slug, 0);
  if (!product) return { title: "Ürün bulunamadı" };

  return {
    title: product.metaTitle || product.name,
    description:
      product.metaDescription ||
      product.shortDesc ||
      `${product.name} — toptan çorap. Zengin Socks.`,
    openGraph: {
      title: product.name,
      images: product.images[0] ? [product.images[0].url] : undefined,
    },
  };
}

export default async function ProductPage({ params }: PageProps<"/urun/[slug]">) {
  const { slug } = await params;

  const session = await getCustomerSession();
  const { discountPercent } = await getViewerDiscount(session?.customerId);

  const product = await getProductDetail(slug, discountPercent);
  if (!product) notFound();

  const [trail, whatsapp, related] = await Promise.all([
    product.primaryCategoryId
      ? getCategoryTrail(product.primaryCategoryId)
      : Promise.resolve([]),
    prisma.setting.findUnique({ where: { key: "whatsappNumber" } }),
    product.primaryCategoryId
      ? getProductCards({
          categoryIds: [product.primaryCategoryId],
          take: 4,
          discountPercent,
        })
      : Promise.resolve({ items: [], total: 0 }),
  ]);

  const cheapest = product.variants.reduce(
    (min, variant) => (variant.grossKurus < min ? variant.grossKurus : min),
    product.variants[0]?.grossKurus ?? 0,
  );
  const inStock = product.variants.some((variant) => variant.available > 0);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
      <nav aria-label="Sayfa yolu" className="mb-6 text-sm text-muted">
        <Link href="/" className="hover:text-ink">
          Ana sayfa
        </Link>
        {trail.map((item) => (
          <span key={item.slug}>
            <span className="mx-1.5">/</span>
            <Link href={`/kategori/${item.slug}`} className="hover:text-ink">
              {item.name}
            </Link>
          </span>
        ))}
        <span className="mx-1.5">/</span>
        <span className="text-ink">{product.name}</span>
      </nav>

      <ProductView product={product} whatsappNumber={whatsapp?.value ?? null} />

      {product.description ? (
        <section className="mt-12 max-w-3xl">
          <h2 className="mb-3 font-display text-xl text-ink">Ürün açıklaması</h2>
          {/* Açıklama Ticimax'ten HTML olarak geliyor; kendi panelimizden
              girilen içerikle birlikte yönetici kaynaklı sayılıyor. */}
          <div
            className="prose-sm space-y-2 text-ink-soft [&_li]:ml-4 [&_li]:list-disc [&_p]:leading-relaxed"
            dangerouslySetInnerHTML={{ __html: product.description }}
          />
        </section>
      ) : null}

      {related.items.length > 1 ? (
        <section className="mt-14">
          <h2 className="mb-5 font-display text-xl text-ink">Benzer ürünler</h2>
          <ProductGrid
            products={related.items.filter((item) => item.id !== product.id).slice(0, 4)}
          />
        </section>
      ) : null}

      {/* Arama motorlarının fiyat ve stok durumunu okuyabilmesi için */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            name: product.name,
            image: product.images.map((image) => image.url),
            description: product.shortDesc ?? undefined,
            brand: { "@type": "Brand", name: "Zengin" },
            offers: {
              "@type": "Offer",
              priceCurrency: "TRY",
              price: (cheapest / 100).toFixed(2),
              availability: inStock
                ? "https://schema.org/InStock"
                : "https://schema.org/OutOfStock",
            },
          }),
        }}
      />
      <span className="sr-only">{formatKurus(cheapest)}</span>
    </div>
  );
}
