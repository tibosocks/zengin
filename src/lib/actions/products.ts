"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth";
import { kurusToDecimalString, toKurus } from "@/lib/price";
import { prisma } from "@/lib/prisma";
import { uniqueSlug } from "@/lib/slug";

export interface ActionResult<T = undefined> {
  ok: boolean;
  error?: string;
  data?: T;
}

// Kullanıcı fiyatı "340", "340,50" veya "340.50" olarak girebilir.
const priceText = z
  .string()
  .trim()
  .refine((value) => value === "" || /^\d+([.,]\d{1,2})?$/.test(value), {
    message: "Fiyat sayı olmalı (örn. 340 veya 340,50)",
  });

const variantSchema = z.object({
  id: z.string().optional(),
  optionValueIds: z.array(z.string()),
  sku: z.string().trim().max(64).optional(),
  barcode: z.string().trim().max(64).optional(),
  price: priceText,
  vatRate: priceText,
  stock: z.number().int().min(0).max(1_000_000),
  lowStockThreshold: z.number().int().min(0).max(100_000).default(0),
  isActive: z.boolean().default(true),
});

const productSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "Ürün adı gerekli").max(200),
  slug: z.string().trim().max(220).optional(),
  shortDesc: z.string().trim().max(400).optional(),
  description: z.string().max(20_000).optional(),
  isActive: z.boolean().default(true),
  isNew: z.boolean().default(false),
  isFeatured: z.boolean().default(false),
  metaTitle: z.string().trim().max(200).optional(),
  metaDescription: z.string().trim().max(400).optional(),
  categoryIds: z.array(z.string()).default([]),
  primaryCategoryId: z.string().nullable().optional(),
  images: z
    .array(
      z.object({
        id: z.string().optional(),
        url: z.string().trim().min(1).max(600),
        alt: z.string().trim().max(200).optional(),
      }),
    )
    .default([]),
  variants: z.array(variantSchema).min(1, "En az bir varyant gerekli"),
});

export type ProductInput = z.input<typeof productSchema>;

export async function saveProduct(
  input: ProductInput,
): Promise<ActionResult<{ id: string }>> {
  await requireAdmin();

  const parsed = productSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message };
  }
  const data = parsed.data;

  // Aynı seçenek kombinasyonundan iki varyant olamaz — olursa vitrinde
  // hangisinin seçildiği belirsizleşir.
  const seen = new Set<string>();
  for (const variant of data.variants) {
    const key = [...variant.optionValueIds].sort().join("|");
    if (seen.has(key)) {
      return {
        ok: false,
        error: "Aynı beden/seçenek birden fazla varyantta tanımlanmış.",
      };
    }
    seen.add(key);
  }

  // Boş olmayan SKU'lar kendi içinde de benzersiz olmalı
  const skus = data.variants
    .map((variant) => variant.sku?.trim())
    .filter((sku): sku is string => Boolean(sku));
  if (new Set(skus).size !== skus.length) {
    return { ok: false, error: "Aynı SKU birden fazla varyantta kullanılmış." };
  }

  const slug = await uniqueSlug(data.slug?.trim() || data.name, async (candidate) => {
    const found = await prisma.product.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    return found !== null && found.id !== data.id;
  });

  const primaryCategoryId =
    data.primaryCategoryId && data.categoryIds.includes(data.primaryCategoryId)
      ? data.primaryCategoryId
      : (data.categoryIds[0] ?? null);

  const brand = await prisma.brand.findFirst({ select: { id: true } });

  try {
    const productId = await prisma.$transaction(async (tx) => {
      const base = {
        name: data.name,
        slug,
        shortDesc: data.shortDesc || null,
        description: data.description || null,
        isActive: data.isActive,
        isNew: data.isNew,
        isFeatured: data.isFeatured,
        metaTitle: data.metaTitle || null,
        metaDescription: data.metaDescription || null,
      };

      const product = data.id
        ? await tx.product.update({ where: { id: data.id }, data: base })
        : await tx.product.create({ data: { ...base, brandId: brand?.id ?? null } });

      // --- kategoriler: tamamını yeniden yaz ---------------------------
      await tx.productCategory.deleteMany({ where: { productId: product.id } });
      if (data.categoryIds.length > 0) {
        await tx.productCategory.createMany({
          data: data.categoryIds.map((categoryId) => ({
            productId: product.id,
            categoryId,
            isPrimary: categoryId === primaryCategoryId,
          })),
        });
      }

      // --- görseller ---------------------------------------------------
      const keptImageIds = data.images
        .map((image) => image.id)
        .filter((id): id is string => Boolean(id));

      await tx.productImage.deleteMany({
        where: { productId: product.id, id: { notIn: keptImageIds } },
      });

      for (const [index, image] of data.images.entries()) {
        if (image.id) {
          await tx.productImage.update({
            where: { id: image.id },
            data: { sortOrder: index, alt: image.alt || null },
          });
        } else {
          await tx.productImage.create({
            data: {
              productId: product.id,
              url: image.url,
              alt: image.alt || null,
              sortOrder: index,
            },
          });
        }
      }

      // --- varyantlar ---------------------------------------------------
      const existing = await tx.variant.findMany({
        where: { productId: product.id },
        select: { id: true, stock: true, _count: { select: { orderItems: true } } },
      });
      const existingById = new Map(existing.map((variant) => [variant.id, variant]));
      const keptVariantIds = new Set(
        data.variants.map((variant) => variant.id).filter(Boolean) as string[],
      );

      for (const variant of existing) {
        if (keptVariantIds.has(variant.id)) continue;

        // Siparişi olan varyantı silmiyoruz: sipariş kalemi snapshot tutsa da
        // varyant bağlantısını koparmak geçmişi izlenemez hale getiriyor.
        if (variant._count.orderItems > 0) {
          await tx.variant.update({
            where: { id: variant.id },
            data: { isActive: false },
          });
        } else {
          await tx.variant.delete({ where: { id: variant.id } });
        }
      }

      for (const variant of data.variants) {
        const payload = {
          sku: variant.sku?.trim() || null,
          barcode: variant.barcode?.trim() || null,
          price: kurusToDecimalString(toKurus(variant.price || "0")),
          vatRate: kurusToDecimalString(toKurus(variant.vatRate || "0")),
          stock: variant.stock,
          lowStockThreshold: variant.lowStockThreshold,
          isActive: variant.isActive,
        };

        let variantId: string;

        if (variant.id && existingById.has(variant.id)) {
          const before = existingById.get(variant.id)!;
          await tx.variant.update({ where: { id: variant.id }, data: payload });
          variantId = variant.id;

          // Stok elle değiştirildiyse iz bırak
          if (before.stock !== variant.stock) {
            await tx.stockMovement.create({
              data: {
                variantId,
                delta: variant.stock - before.stock,
                reason: "duzeltme",
                note: "Ürün düzenleme ekranından",
              },
            });
          }
        } else {
          const created = await tx.variant.create({
            data: { ...payload, productId: product.id },
          });
          variantId = created.id;

          if (variant.stock > 0) {
            await tx.stockMovement.create({
              data: {
                variantId,
                delta: variant.stock,
                reason: "giris",
                note: "Varyant oluşturuldu",
              },
            });
          }
        }

        await tx.variantOptionValue.deleteMany({ where: { variantId } });
        if (variant.optionValueIds.length > 0) {
          await tx.variantOptionValue.createMany({
            data: variant.optionValueIds.map((optionValueId) => ({
              variantId,
              optionValueId,
            })),
          });
        }
      }

      return product.id;
    });

    revalidatePath("/panel/urunler");
    return { ok: true, data: { id: productId } };
  } catch (error) {
    // En sık sebep: başka bir üründe kullanılan SKU
    if (
      error instanceof Error &&
      "code" in error &&
      (error as { code?: string }).code === "P2002"
    ) {
      return {
        ok: false,
        error: "Bu SKU başka bir varyantta kullanılıyor. Farklı bir SKU girin.",
      };
    }
    console.error("Ürün kaydetme hatası:", error);
    return { ok: false, error: "Ürün kaydedilemedi." };
  }
}

export async function deleteProduct(id: string): Promise<ActionResult> {
  await requireAdmin();

  const orderCount = await prisma.orderItem.count({
    where: { variant: { productId: id } },
  });

  if (orderCount > 0) {
    // Siparişi olan ürünü silmek yerine pasife alıyoruz: sipariş geçmişi
    // okunur kalmalı.
    await prisma.product.update({ where: { id }, data: { isActive: false } });
    revalidatePath("/panel/urunler");
    return {
      ok: true,
      error:
        "Bu ürünün siparişleri olduğu için silinmedi, pasife alındı. Vitrinde görünmeyecek.",
    };
  }

  await prisma.product.delete({ where: { id } });
  revalidatePath("/panel/urunler");
  return { ok: true };
}

/** Ürün listesindeki satır içi fiyat/stok düzenlemesi. */
export async function updateVariantInline(
  variantId: string,
  patch: { price?: string; stock?: number },
): Promise<ActionResult<{ price: string; stock: number }>> {
  const session = await requireAdmin();

  const current = await prisma.variant.findUnique({
    where: { id: variantId },
    select: { stock: true, price: true },
  });
  if (!current) return { ok: false, error: "Varyant bulunamadı." };

  const data: { price?: string; stock?: number } = {};

  if (patch.price !== undefined) {
    const parsed = priceText.safeParse(patch.price);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message };
    }
    data.price = kurusToDecimalString(toKurus(patch.price));
  }

  if (patch.stock !== undefined) {
    if (!Number.isInteger(patch.stock) || patch.stock < 0) {
      return { ok: false, error: "Stok 0 veya daha büyük tam sayı olmalı." };
    }
    data.stock = patch.stock;
  }

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.variant.update({
      where: { id: variantId },
      data,
      select: { price: true, stock: true },
    });

    if (data.stock !== undefined && data.stock !== current.stock) {
      await tx.stockMovement.create({
        data: {
          variantId,
          delta: data.stock - current.stock,
          reason: "duzeltme",
          userId: session.userId,
          note: "Ürün listesinden satır içi düzenleme",
        },
      });
    }

    return result;
  });

  revalidatePath("/panel/urunler");
  return {
    ok: true,
    data: { price: updated.price.toString(), stock: updated.stock },
  };
}

/** Seçili ürünlerin tüm varyantlarına yüzdelik zam/indirim uygular. */
export async function bulkAdjustPrices(
  productIds: string[],
  percent: number,
): Promise<ActionResult<{ updated: number }>> {
  await requireAdmin();

  if (productIds.length === 0) return { ok: false, error: "Ürün seçilmedi." };
  if (!Number.isFinite(percent) || percent < -90 || percent > 500) {
    return { ok: false, error: "Oran -90 ile 500 arasında olmalı." };
  }

  const variants = await prisma.variant.findMany({
    where: { productId: { in: productIds } },
    select: { id: true, price: true },
  });

  const factorBp = Math.round((100 + percent) * 100);

  await prisma.$transaction(
    variants.map((variant) => {
      const current = toKurus(variant.price);
      // Kuruş bazında hesaplayıp yuvarlıyoruz; ondalıklı çarpımda
      // 340 * 1.15 gibi işlemler 390.99999 üretebiliyor.
      const next = Math.round((current * factorBp) / 10_000);
      return prisma.variant.update({
        where: { id: variant.id },
        data: { price: kurusToDecimalString(Math.max(0, next)) },
      });
    }),
  );

  revalidatePath("/panel/urunler");
  return { ok: true, data: { updated: variants.length } };
}

export async function bulkSetActive(
  productIds: string[],
  isActive: boolean,
): Promise<ActionResult<{ updated: number }>> {
  await requireAdmin();
  if (productIds.length === 0) return { ok: false, error: "Ürün seçilmedi." };

  const result = await prisma.product.updateMany({
    where: { id: { in: productIds } },
    data: { isActive },
  });

  revalidatePath("/panel/urunler");
  return { ok: true, data: { updated: result.count } };
}

export async function bulkAssignCategory(
  productIds: string[],
  categoryId: string,
): Promise<ActionResult<{ updated: number }>> {
  await requireAdmin();
  if (productIds.length === 0) return { ok: false, error: "Ürün seçilmedi." };

  const existing = await prisma.productCategory.findMany({
    where: { productId: { in: productIds }, categoryId },
    select: { productId: true },
  });
  const already = new Set(existing.map((row) => row.productId));
  const toAdd = productIds.filter((id) => !already.has(id));

  if (toAdd.length > 0) {
    await prisma.productCategory.createMany({
      data: toAdd.map((productId) => ({ productId, categoryId })),
    });
  }

  revalidatePath("/panel/urunler");
  return { ok: true, data: { updated: toAdd.length } };
}
