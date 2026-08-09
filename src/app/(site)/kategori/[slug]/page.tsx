import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ProductGrid } from "@/components/shop/product-card";
import { getCustomerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getCategoryBranchIds,
  getCategoryTrail,
  getProductCards,
  getViewerDiscount,
} from "@/lib/shop/catalog";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 24;

// Varsayılan "yeni": adres çubuğunda sirala parametresi yokken de en son
// eklenenler önce gelir. Panelde belirlenen sıraya dönmek için "onerilen".
const DEFAULT_SORT = "yeni";

const SORTS = [
  { key: "yeni", label: "Yeniler" },
  { key: "onerilen", label: "Önerilen" },
  { key: "ucuz", label: "Artan fiyat" },
  { key: "pahali", label: "Azalan fiyat" },
  { key: "ad", label: "İsme göre" },
] as const;

async function loadCategory(slug: string) {
  return prisma.category.findFirst({
    where: { slug, isActive: true },
    select: {
      id: true,
      name: true,
      slug: true,
      metaTitle: true,
      metaDescription: true,
      children: {
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: { id: true, name: true, slug: true },
      },
    },
  });
}

export async function generateMetadata({
  params,
}: PageProps<"/kategori/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const category = await loadCategory(slug);
  if (!category) return { title: "Kategori bulunamadı" };

  return {
    title: category.metaTitle || category.name,
    description:
      category.metaDescription ||
      `${category.name} — toptan çorap. Zengin Socks.`,
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: PageProps<"/kategori/[slug]">) {
  const { slug } = await params;
  const query = await searchParams;

  const category = await loadCategory(slug);
  if (!category) notFound();

  const page = Math.max(1, Number(query.sayfa) || 1);
  const sortParam = typeof query.sirala === "string" ? query.sirala : "";
  const sort = sortParam || DEFAULT_SORT;

  const session = await getCustomerSession();
  const { discountPercent } = await getViewerDiscount(session?.customerId);

  // Alt kategorilerdeki ürünler de üst kategoride görünmeli — müşteri
  // "Kadın Çorapları"na girip boş liste görmemeli.
  const branchIds = await getCategoryBranchIds(category.id);

  const [{ items, total }, trail] = await Promise.all([
    getProductCards({
      categoryIds: branchIds,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      sort:
        sort === "onerilen"
          ? undefined
          : (sort as "yeni" | "ucuz" | "pahali" | "ad"),
      discountPercent,
    }),
    getCategoryTrail(category.id),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function pageHref(next: number) {
    const params = new URLSearchParams();
    if (sortParam) params.set("sirala", sortParam);
    if (next > 1) params.set("sayfa", String(next));
    const qs = params.toString();
    return `/kategori/${category!.slug}${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
      <nav aria-label="Sayfa yolu" className="mb-4 text-sm text-muted">
        <Link href="/" className="hover:text-ink">
          Ana sayfa
        </Link>
        {trail.map((item, index) => (
          <span key={item.slug}>
            <span className="mx-1.5">/</span>
            {index === trail.length - 1 ? (
              <span className="text-ink">{item.name}</span>
            ) : (
              <Link href={`/kategori/${item.slug}`} className="hover:text-ink">
                {item.name}
              </Link>
            )}
          </span>
        ))}
      </nav>

      <h1 className="font-display text-3xl text-ink">{category.name}</h1>
      <p className="mt-1 text-sm text-muted">{total} ürün</p>

      {category.children.length > 0 ? (
        <div className="mt-5 flex flex-wrap gap-2">
          {category.children.map((child) => (
            <Link
              key={child.id}
              href={`/kategori/${child.slug}`}
              className="rounded-md border border-line px-3 py-1.5 text-sm text-ink-soft transition-colors hover:border-ink hover:text-ink"
            >
              {child.name}
            </Link>
          ))}
        </div>
      ) : null}

      <div className="mt-6 mb-5 flex flex-wrap items-center gap-2 border-y border-line py-3">
        <span className="text-sm text-muted">Sırala:</span>
        {SORTS.map((option) => {
          const active = sort === option.key;
          const params = new URLSearchParams();
          // Varsayılan seçenek için parametre yazmıyoruz, adres temiz kalsın
          if (option.key !== DEFAULT_SORT) params.set("sirala", option.key);
          const qs = params.toString();
          return (
            <Link
              key={option.key || "default"}
              href={`/kategori/${category.slug}${qs ? `?${qs}` : ""}`}
              aria-current={active ? "true" : undefined}
              className={
                active
                  ? "rounded bg-ink px-2.5 py-1 text-sm text-white"
                  : "rounded px-2.5 py-1 text-sm text-ink-soft hover:bg-surface-alt"
              }
            >
              {option.label}
            </Link>
          );
        })}
      </div>

      {items.length === 0 ? (
        <p className="py-16 text-center text-muted">
          Bu kategoride henüz ürün yok.
        </p>
      ) : (
        <ProductGrid products={items} />
      )}

      {totalPages > 1 ? (
        <nav
          aria-label="Sayfalar"
          className="mt-8 flex items-center justify-center gap-3 text-sm"
        >
          {page > 1 ? (
            <Link href={pageHref(page - 1)} className="text-ink-soft hover:text-ink">
              ← Önceki
            </Link>
          ) : (
            <span className="text-muted">← Önceki</span>
          )}
          <span className="text-muted">
            Sayfa {page} / {totalPages}
          </span>
          {page < totalPages ? (
            <Link href={pageHref(page + 1)} className="text-ink-soft hover:text-ink">
              Sonraki →
            </Link>
          ) : (
            <span className="text-muted">Sonraki →</span>
          )}
        </nav>
      ) : null}
    </div>
  );
}
