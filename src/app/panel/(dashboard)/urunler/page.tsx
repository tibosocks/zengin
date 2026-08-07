import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";

import { buttonStyles } from "@/components/ui/button";
import { buildCategoryOptions } from "@/lib/category-tree";
import { PageHeader } from "@/components/ui/surface";
import { toKurus } from "@/lib/price";
import { prisma } from "@/lib/prisma";

import { ProductFilters } from "./product-filters";
import { ProductTable, type ProductRow } from "./product-table";

export const metadata: Metadata = { title: "Ürünler" };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

export default async function ProductsPage({
  searchParams,
}: PageProps<"/panel/urunler">) {
  const params = await searchParams;

  const query = typeof params.q === "string" ? params.q.trim() : "";
  const categoryId = typeof params.kategori === "string" ? params.kategori : "";
  const stockFilter = typeof params.stok === "string" ? params.stok : "";
  const statusFilter = typeof params.durum === "string" ? params.durum : "";
  const page = Math.max(1, Number(params.sayfa) || 1);

  const where = {
    ...(query
      ? {
          OR: [
            { name: { contains: query, mode: "insensitive" as const } },
            { variants: { some: { sku: { contains: query, mode: "insensitive" as const } } } },
          ],
        }
      : {}),
    ...(categoryId ? { categories: { some: { categoryId } } } : {}),
    ...(statusFilter === "aktif" ? { isActive: true } : {}),
    ...(statusFilter === "pasif" ? { isActive: false } : {}),
    ...(stockFilter === "bitti"
      ? { variants: { every: { stock: { lte: 0 } } } }
      : {}),
    ...(stockFilter === "kritik"
      ? { variants: { some: { stock: { gt: 0, lte: 5 } } } }
      : {}),
  };

  const [total, products, categories] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        name: true,
        slug: true,
        isActive: true,
        images: {
          orderBy: { sortOrder: "asc" },
          take: 1,
          select: { url: true },
        },
        categories: {
          where: { isPrimary: true },
          take: 1,
          select: { category: { select: { name: true } } },
        },
        variants: {
          orderBy: { id: "asc" },
          select: {
            id: true,
            sku: true,
            price: true,
            stock: true,
            reserved: true,
            isActive: true,
            optionValues: {
              select: { optionValue: { select: { value: true } } },
            },
          },
        },
      },
    }),
    prisma.category.findMany({
      select: { id: true, name: true, parentId: true, sortOrder: true },
    }),
  ]);

  const rows: ProductRow[] = products.map((product) => ({
    id: product.id,
    name: product.name,
    slug: product.slug,
    isActive: product.isActive,
    imageUrl: product.images[0]?.url ?? null,
    categoryName: product.categories[0]?.category.name ?? null,
    variants: product.variants.map((variant) => ({
      id: variant.id,
      sku: variant.sku,
      priceKurus: toKurus(variant.price),
      stock: variant.stock,
      reserved: variant.reserved,
      isActive: variant.isActive,
      label:
        variant.optionValues
          .map((option) => option.optionValue.value)
          .join(" / ") || "Tek varyant",
    })),
  }));

  const categoryOptions = buildCategoryOptions(categories);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <PageHeader
        title="Ürünler"
        description={`${total} ürün. Fiyat ve stok kutularına tıklayıp doğrudan düzenleyebilirsiniz.`}
        action={
          <Link href="/panel/urunler/yeni" className={buttonStyles()}>
            <Plus className="size-4" />
            Yeni ürün
          </Link>
        }
      />

      <ProductFilters categories={categoryOptions} />

      <ProductTable
        rows={rows}
        categories={categoryOptions}
        page={page}
        totalPages={totalPages}
      />
    </>
  );
}
