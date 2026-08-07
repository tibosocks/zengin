import { NextResponse } from "next/server";

import { buildWorkbook, type ExportRow } from "@/lib/catalog/excel";
import { getAdminSession } from "@/lib/auth";
import { toBasisPoints, toKurus } from "@/lib/price";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Kategori ağacındaki tam yolu üretir: "Kadın Çorapları > Kadın Patik Çorap" */
function categoryPath(
  categoryId: string | null,
  lookup: Map<string, { name: string; parentId: string | null }>,
): string {
  const parts: string[] = [];
  let cursor = categoryId;

  for (let depth = 0; depth < 20 && cursor; depth += 1) {
    const node = lookup.get(cursor);
    if (!node) break;
    parts.unshift(node.name);
    cursor = node.parentId;
  }

  return parts.join(" > ");
}

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  const [categories, products] = await Promise.all([
    prisma.category.findMany({ select: { id: true, name: true, parentId: true } }),
    prisma.product.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        shortDesc: true,
        isActive: true,
        externalId: true,
        images: { orderBy: { sortOrder: "asc" }, select: { url: true } },
        categories: {
          select: { categoryId: true, isPrimary: true },
        },
        variants: {
          orderBy: { id: "asc" },
          select: {
            sku: true,
            barcode: true,
            price: true,
            vatRate: true,
            stock: true,
            isActive: true,
            optionValues: {
              select: {
                optionValue: {
                  select: { value: true, optionType: { select: { name: true } } },
                },
              },
            },
          },
        },
      },
    }),
  ]);

  const lookup = new Map(
    categories.map((category) => [
      category.id,
      { name: category.name, parentId: category.parentId },
    ]),
  );

  const rows: ExportRow[] = [];

  for (const product of products) {
    const primary =
      product.categories.find((row) => row.isPrimary)?.categoryId ??
      product.categories[0]?.categoryId ??
      null;
    const path = categoryPath(primary, lookup);
    const imageUrls = product.images.map((image) => image.url);

    // Varyantı olmayan ürün de dışa aktarılsın; aksi halde kullanıcı
    // dosyada göremediği ürünü kaybolmuş sanıyor.
    const variants = product.variants.length > 0 ? product.variants : [null];

    for (const variant of variants) {
      const options = variant?.optionValues ?? [];
      const size =
        options.find((item) => item.optionValue.optionType.name === "Beden")
          ?.optionValue.value ?? "";
      const color =
        options.find((item) => item.optionValue.optionType.name === "Renk")
          ?.optionValue.value ?? "";

      rows.push({
        externalId: product.externalId ?? "",
        productName: product.name,
        slug: product.slug,
        categoryPath: path,
        shortDesc: product.shortDesc ?? "",
        size,
        color,
        sku: variant?.sku ?? "",
        barcode: variant?.barcode ?? "",
        priceKurus: variant ? toKurus(variant.price) : 0,
        vatRateBp: variant ? toBasisPoints(variant.vatRate) : 1000,
        stock: variant?.stock ?? 0,
        isActive: product.isActive && (variant?.isActive ?? true),
        imageUrls,
      });
    }
  }

  const buffer = await buildWorkbook(rows);
  const today = new Date().toISOString().slice(0, 10);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="zengin-katalog-${today}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
