import "server-only";

import { calculatePrice, toBasisPoints, toKurus } from "@/lib/price";
import { prisma } from "@/lib/prisma";

// Vitrinde kullanılan okuma sorguları.
//
// Fiyat her zaman burada, sunucuda hesaplanır. Müşterinin iskonto yüzdesi
// hiçbir zaman istemciye gönderilmez — sadece hesaplanmış tutar gider.

export interface MenuCategory {
  id: string;
  name: string;
  slug: string;
  children: MenuCategory[];
}

export async function getMenuTree(): Promise<MenuCategory[]> {
  const rows = await prisma.category.findMany({
    where: { isActive: true, showInMenu: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, slug: true, parentId: true },
  });

  const nodes = new Map<string, MenuCategory>(
    rows.map((row) => [row.id, { ...row, children: [] }]),
  );
  const roots: MenuCategory[] = [];

  for (const row of rows) {
    const node = nodes.get(row.id)!;
    if (row.parentId) nodes.get(row.parentId)?.children.push(node);
    else roots.push(node);
  }

  return roots;
}

export interface ProductCardData {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  /** İndirim uygulanmış, KDV hariç, kuruş */
  netKurus: number;
  /** KDV dahil, kuruş */
  grossKurus: number;
  /** İndirim varsa üstü çizili gösterilecek liste fiyatı, KDV hariç */
  listNetKurus: number | null;
  /** İndirim varsa üstü çizili gösterilecek liste fiyatı, KDV dahil */
  listGrossKurus: number | null;
  /** Satılabilir varyantı kaldı mı */
  inStock: boolean;
  isNew: boolean;
}

/** Oturumdaki müşterinin iskontosu. Girişsizse 0. */
export async function getViewerDiscount(customerId?: string | null) {
  if (!customerId) return { discountPercent: 0, customerId: null };

  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { id: true, discountPercent: true, status: true },
  });

  // Pasife alınmış veya onay bekleyen bayi iskontodan yararlanamaz
  if (!customer || customer.status !== "aktif") {
    return { discountPercent: 0, customerId: null };
  }

  return {
    discountPercent: toBasisPoints(customer.discountPercent) / 100,
    customerId: customer.id,
  };
}

type VariantForPricing = {
  price: unknown;
  vatRate: unknown;
  stock: number;
  reserved: number;
  isActive: boolean;
};

/** Bir ürünün kart üzerinde gösterilecek en düşük fiyatını hesaplar. */
function cardPricing(variants: VariantForPricing[], discountPercent: number) {
  const active = variants.filter((variant) => variant.isActive);
  const source = active.length > 0 ? active : variants;

  let best: ReturnType<typeof calculatePrice> | null = null;
  let bestList = 0;

  for (const variant of source) {
    const result = calculatePrice({
      listPrice: toKurus(variant.price),
      discountPercent,
      vatRate: variant.vatRate,
    });
    if (!best || result.net < best.net) {
      best = result;
      bestList = result.listNet;
    }
  }

  const inStock = source.some(
    (variant) => variant.isActive && variant.stock - variant.reserved > 0,
  );

  if (!best) {
    return {
      netKurus: 0,
      grossKurus: 0,
      listNetKurus: null,
      listGrossKurus: null,
      inStock: false,
    };
  }

  const vatBp = source[0] ? toBasisPoints(source[0].vatRate) : 0;
  const listGross = bestList + Math.round((bestList * vatBp) / 10_000);

  return {
    netKurus: best.net,
    grossKurus: best.gross,
    listNetKurus: best.discount > 0 ? bestList : null,
    listGrossKurus: best.discount > 0 ? listGross : null,
    inStock,
  };
}

export async function getProductCards(options: {
  categoryId?: string;
  categoryIds?: string[];
  isNew?: boolean;
  isFeatured?: boolean;
  search?: string;
  skip?: number;
  take?: number;
  sort?: "yeni" | "ucuz" | "pahali" | "ad";
  discountPercent: number;
}): Promise<{ items: ProductCardData[]; total: number }> {
  const where = {
    isActive: true,
    ...(options.categoryIds && options.categoryIds.length > 0
      ? { categories: { some: { categoryId: { in: options.categoryIds } } } }
      : {}),
    ...(options.isNew ? { isNew: true } : {}),
    ...(options.isFeatured ? { isFeatured: true } : {}),
    ...(options.search
      ? {
          OR: [
            { name: { contains: options.search, mode: "insensitive" as const } },
            {
              variants: {
                some: {
                  sku: { contains: options.search, mode: "insensitive" as const },
                },
              },
            },
          ],
        }
      : {}),
  };

  const orderBy =
    options.sort === "ad"
      ? [{ name: "asc" as const }]
      : options.sort === "yeni"
        ? [{ createdAt: "desc" as const }]
        : [{ sortOrder: "asc" as const }, { name: "asc" as const }];

  const [total, products] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      orderBy,
      skip: options.skip ?? 0,
      take: options.take ?? 24,
      select: {
        id: true,
        name: true,
        slug: true,
        isNew: true,
        images: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true } },
        variants: {
          select: {
            price: true,
            vatRate: true,
            stock: true,
            reserved: true,
            isActive: true,
          },
        },
      },
    }),
  ]);

  const items = products.map((product) => ({
    id: product.id,
    name: product.name,
    slug: product.slug,
    imageUrl: product.images[0]?.url ?? null,
    isNew: product.isNew,
    ...cardPricing(product.variants, options.discountPercent),
  }));

  // Fiyata göre sıralama hesaplanmış tutara göre yapılmalı; veritabanında
  // iskonto uygulanmamış fiyat var, ona göre sıralamak yanlış sonuç verir.
  if (options.sort === "ucuz") items.sort((a, b) => a.netKurus - b.netKurus);
  if (options.sort === "pahali") items.sort((a, b) => b.netKurus - a.netKurus);

  return { items, total };
}

/** Bir kategorinin kendisi ve tüm alt kategorilerinin id'leri. */
export async function getCategoryBranchIds(categoryId: string): Promise<string[]> {
  const all = await prisma.category.findMany({
    select: { id: true, parentId: true },
  });

  const childrenOf = new Map<string, string[]>();
  for (const row of all) {
    if (!row.parentId) continue;
    const list = childrenOf.get(row.parentId) ?? [];
    list.push(row.id);
    childrenOf.set(row.parentId, list);
  }

  const result: string[] = [];
  const queue = [categoryId];
  const seen = new Set<string>();

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (seen.has(current)) continue;
    seen.add(current);
    result.push(current);
    queue.push(...(childrenOf.get(current) ?? []));
  }

  return result;
}

/** Kategori yolu (breadcrumb için), kökten aşağıya. */
export async function getCategoryTrail(
  categoryId: string,
): Promise<Array<{ name: string; slug: string }>> {
  const all = await prisma.category.findMany({
    select: { id: true, name: true, slug: true, parentId: true },
  });
  const byId = new Map(all.map((row) => [row.id, row]));

  const trail: Array<{ name: string; slug: string }> = [];
  let cursor: string | null = categoryId;

  for (let depth = 0; depth < 20 && cursor; depth += 1) {
    const node = byId.get(cursor);
    if (!node) break;
    trail.unshift({ name: node.name, slug: node.slug });
    cursor = node.parentId;
  }

  return trail;
}

export interface ProductDetailVariant {
  id: string;
  sku: string | null;
  optionValueIds: string[];
  label: string;
  netKurus: number;
  grossKurus: number;
  listNetKurus: number | null;
  listGrossKurus: number | null;
  available: number;
}

/**
 * Vitrinde gösterilen görsel. `optionValueId` doluysa görsel belirli bir
 * seçenek değerine (pratikte renge) aittir; o renk seçildiğinde gösterilir.
 */
export interface ProductDetailImage {
  url: string;
  alt: string | null;
  optionValueId: string | null;
}

export interface ProductDetail {
  id: string;
  name: string;
  slug: string;
  shortDesc: string | null;
  description: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  images: ProductDetailImage[];
  optionTypes: Array<{
    id: string;
    name: string;
    values: Array<{ id: string; value: string }>;
  }>;
  variants: ProductDetailVariant[];
  primaryCategoryId: string | null;
}

export async function getProductDetail(
  slug: string,
  discountPercent: number,
): Promise<ProductDetail | null> {
  const product = await prisma.product.findFirst({
    where: { slug, isActive: true },
    select: {
      id: true,
      name: true,
      slug: true,
      shortDesc: true,
      description: true,
      metaTitle: true,
      metaDescription: true,
      images: {
        orderBy: { sortOrder: "asc" },
        select: { url: true, alt: true, optionValueId: true },
      },
      categories: { select: { categoryId: true, isPrimary: true } },
      variants: {
        where: { isActive: true },
        orderBy: { id: "asc" },
        select: {
          id: true,
          sku: true,
          price: true,
          vatRate: true,
          stock: true,
          reserved: true,
          optionValues: {
            select: {
              optionValue: {
                select: {
                  id: true,
                  value: true,
                  sortOrder: true,
                  optionType: { select: { id: true, name: true, sortOrder: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!product) return null;

  // Seçenek tiplerini varyantlardan topluyoruz: ürünün gerçekten sahip
  // olduğu değerler gösterilmeli, katalogdaki tüm bedenler değil.
  const typeMap = new Map<
    string,
    { id: string; name: string; sortOrder: number; values: Map<string, { id: string; value: string; sortOrder: number }> }
  >();

  for (const variant of product.variants) {
    for (const link of variant.optionValues) {
      const { optionType } = link.optionValue;
      const entry =
        typeMap.get(optionType.id) ??
        {
          id: optionType.id,
          name: optionType.name,
          sortOrder: optionType.sortOrder,
          values: new Map(),
        };
      entry.values.set(link.optionValue.id, {
        id: link.optionValue.id,
        value: link.optionValue.value,
        sortOrder: link.optionValue.sortOrder,
      });
      typeMap.set(optionType.id, entry);
    }
  }

  const optionTypes = [...typeMap.values()]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((type) => ({
      id: type.id,
      name: type.name,
      values: [...type.values.values()].sort((a, b) => a.sortOrder - b.sortOrder),
    }));

  const variants: ProductDetailVariant[] = product.variants.map((variant) => {
    const price = calculatePrice({
      listPrice: toKurus(variant.price),
      discountPercent,
      vatRate: variant.vatRate,
    });
    const vatBp = toBasisPoints(variant.vatRate);
    const listGross =
      price.listNet + Math.round((price.listNet * vatBp) / 10_000);

    return {
      id: variant.id,
      sku: variant.sku,
      optionValueIds: variant.optionValues.map((link) => link.optionValue.id),
      label:
        variant.optionValues.map((link) => link.optionValue.value).join(" / ") ||
        "Tek seçenek",
      netKurus: price.net,
      grossKurus: price.gross,
      listNetKurus: price.discount > 0 ? price.listNet : null,
      listGrossKurus: price.discount > 0 ? listGross : null,
      available: Math.max(0, variant.stock - variant.reserved),
    };
  });

  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    shortDesc: product.shortDesc,
    description: product.description,
    metaTitle: product.metaTitle,
    metaDescription: product.metaDescription,
    images: product.images,
    optionTypes,
    variants,
    primaryCategoryId:
      product.categories.find((row) => row.isPrimary)?.categoryId ??
      product.categories[0]?.categoryId ??
      null,
  };
}
