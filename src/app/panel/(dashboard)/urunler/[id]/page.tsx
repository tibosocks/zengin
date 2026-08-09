import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";

import { loadFormContext, priceToInput } from "../form-data";
import { ProductForm } from "../product-form";

export const metadata: Metadata = { title: "Ürünü düzenle" };
export const dynamic = "force-dynamic";

export default async function EditProductPage({
  params,
}: PageProps<"/panel/urunler/[id]">) {
  const { id } = await params;

  const [product, context] = await Promise.all([
    prisma.product.findUnique({
      where: { id },
      include: {
        categories: { select: { categoryId: true, isPrimary: true } },
        images: { orderBy: { sortOrder: "asc" } },
        variants: {
          orderBy: { id: "asc" },
          include: {
            optionValues: {
              include: { optionValue: { select: { id: true, value: true } } },
            },
          },
        },
      },
    }),
    loadFormContext(),
  ]);

  if (!product) notFound();

  return (
    <ProductForm
      categories={context.categories}
      optionTypes={context.optionTypes}
      defaultVatRate={context.defaultVatRate}
      initial={{
        id: product.id,
        name: product.name,
        slug: product.slug,
        shortDesc: product.shortDesc ?? "",
        description: product.description ?? "",
        isActive: product.isActive,
        isNew: product.isNew,
        isFeatured: product.isFeatured,
        metaTitle: product.metaTitle ?? "",
        metaDescription: product.metaDescription ?? "",
        categoryIds: product.categories.map((row) => row.categoryId),
        primaryCategoryId:
          product.categories.find((row) => row.isPrimary)?.categoryId ?? null,
        images: product.images.map((image) => ({
          key: image.id,
          id: image.id,
          url: image.url,
          alt: image.alt ?? undefined,
          optionValueId: image.optionValueId,
        })),
        variants: product.variants.map((variant) => ({
          key: variant.id,
          id: variant.id,
          optionValueIds: variant.optionValues.map((row) => row.optionValue.id),
          optionLabel:
            variant.optionValues.map((row) => row.optionValue.value).join(" / ") ||
            "Tek varyant",
          sku: variant.sku ?? "",
          price: priceToInput(variant.price),
          vatRate: priceToInput(variant.vatRate),
          stock: variant.stock,
          lowStockThreshold: variant.lowStockThreshold,
          isActive: variant.isActive,
        })),
      }}
    />
  );
}
