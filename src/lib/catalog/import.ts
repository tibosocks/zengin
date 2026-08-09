// NOT: burada `import "server-only"` YOK.
// O paket react-server koşulu dışında bilerek hata fırlatıyor ve bu modül
// aktarım CLI'ından (scripts/import-catalog.ts, düz Node) da kullanılıyor.
// Yanlışlıkla istemciye sızma riski düşük: modül sharp / node:fs / pg gibi
// sunucuya özel bağımlılıklar taşıdığı için istemci derlemesi zaten kırılır.
import { kurusToDecimalString } from "@/lib/price";
import { prisma } from "@/lib/prisma";
import { categorySlugCandidates, slugify, uniqueSlug } from "@/lib/slug";
import { UploadError, storeImageFromUrl } from "@/lib/storage";

import type { GroupedProduct, ImportPlan, RowIssue } from "./types";

export interface ImportOptions {
  /** true ise veritabanına hiçbir şey yazılmaz, sadece plan çıkarılır. */
  dryRun: boolean;
  /** Görseller indirilsin mi. Kapatmak aktarımı çok hızlandırır. */
  downloadImages: boolean;
  onProgress?: (message: string) => void;
}

export interface ImportReport {
  plan: ImportPlan;
  issues: RowIssue[];
  applied: boolean;
  imagesDownloaded: number;
  imagesFailed: number;
  /** Hata yüzünden atlanan ürün sayısı; tekrar çalıştırınca denenirler. */
  failedProducts: number;
}

/** "Kadın Çorapları > Kadın Patik Çorap" -> ["Kadın Çorapları", "Kadın Patik Çorap"] */
function splitCategoryPath(path: string): string[] {
  return path
    .split(/[>/›»]/)
    .map((part) => part.trim())
    .filter((part) => part !== "");
}

/**
 * Kategori yolunu çözer, eksik seviyeleri açar ve en alttaki kategorinin
 * id'sini döner. Aynı yol tekrar geldiğinde önbellekten okunur.
 */
async function resolveCategoryPath(
  path: string,
  cache: Map<string, string>,
  created: Set<string>,
  dryRun: boolean,
): Promise<string | null> {
  const parts = splitCategoryPath(path);
  if (parts.length === 0) return null;

  let parentId: string | null = null;
  let cacheKey = "";
  const ancestors: string[] = [];

  for (const name of parts) {
    cacheKey = cacheKey === "" ? name : `${cacheKey} > ${name}`;

    const cached = cache.get(cacheKey);
    if (cached) {
      parentId = cached;
      continue;
    }

    // Açık tip şart: parentId bu döngüde yeniden atandığı için TypeScript
    // çıkarımı kendine referans veriyor ve `any`e düşüyor.
    const existing: { id: string } | null = await prisma.category.findFirst({
      where: { name, parentId },
      select: { id: true },
    });

    if (existing) {
      cache.set(cacheKey, existing.id);
      parentId = existing.id;
      ancestors.push(name);
      continue;
    }

    created.add(cacheKey);

    if (dryRun) {
      // Kuru çalışmada gerçek id yok; sonraki seviyelerin de "yeni" sayılması
      // için sahte bir anahtar koyuyoruz.
      const placeholder = `yeni:${cacheKey}`;
      cache.set(cacheKey, placeholder);
      parentId = placeholder;
      ancestors.push(name);
      continue;
    }

    const last = await prisma.category.findFirst({
      where: { parentId },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });

    const taken = async (candidate: string) => {
      const found = await prisma.category.findUnique({
        where: { slug: candidate },
        select: { id: true },
      });
      return found !== null;
    };

    // Önce "bambu-patik", çakışırsa "kadin-bambu-patik", sonra tam yol,
    // en son çare sayı eki.
    let slug: string | null = null;
    for (const candidate of categorySlugCandidates(name, ancestors)) {
      if (!(await taken(candidate))) {
        slug = candidate;
        break;
      }
    }
    slug ??= await uniqueSlug(name, taken);

    const category: { id: string } = await prisma.category.create({
      data: { name, slug, parentId, sortOrder: (last?.sortOrder ?? -1) + 1 },
      select: { id: true },
    });

    cache.set(cacheKey, category.id);
    parentId = category.id;
    ancestors.push(name);
  }

  return parentId;
}

async function resolveOptionValue(
  typeName: string,
  value: string,
  cache: Map<string, string>,
  created: Set<string>,
  dryRun: boolean,
): Promise<string | null> {
  const key = `${typeName}:${value}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const optionType = await prisma.optionType.findUnique({
    where: { name: typeName },
    select: { id: true },
  });

  // Beden ve Renk seed'de açılıyor; başka bir tip gelirse onu da açalım
  let typeId = optionType?.id;
  if (!typeId) {
    if (dryRun) {
      created.add(key);
      cache.set(key, `yeni:${key}`);
      return `yeni:${key}`;
    }
    const createdType = await prisma.optionType.create({
      data: { name: typeName, displayType: "button" },
    });
    typeId = createdType.id;
  }

  const existing = await prisma.optionValue.findUnique({
    where: { optionTypeId_value: { optionTypeId: typeId, value } },
    select: { id: true },
  });

  if (existing) {
    cache.set(key, existing.id);
    return existing.id;
  }

  created.add(key);
  if (dryRun) {
    cache.set(key, `yeni:${key}`);
    return `yeni:${key}`;
  }

  const last = await prisma.optionValue.findFirst({
    where: { optionTypeId: typeId },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });

  const optionValue = await prisma.optionValue.create({
    data: {
      optionTypeId: typeId,
      value,
      sortOrder: (last?.sortOrder ?? -1) + 1,
    },
  });

  cache.set(key, optionValue.id);
  return optionValue.id;
}

export async function runImport(
  products: GroupedProduct[],
  options: ImportOptions,
): Promise<ImportReport> {
  const issues: RowIssue[] = [];
  const categoryCache = new Map<string, string>();
  const optionCache = new Map<string, string>();
  const newCategories = new Set<string>();
  const newOptionValues = new Set<string>();

  const counts = {
    productsToCreate: 0,
    productsToUpdate: 0,
    variantsToCreate: 0,
    variantsToUpdate: 0,
    imagesToDownload: 0,
  };

  let imagesDownloaded = 0;
  let imagesFailed = 0;
  let failedProducts = 0;

  const brand = await prisma.brand.findFirst({ select: { id: true } });

  for (const [index, product] of products.entries()) {
    options.onProgress?.(
      `[${index + 1}/${products.length}] ${product.name}`,
    );

    // Tek bir ürünün hatası tüm aktarımı öldürmemeli. 200+ ürünlük bir
    // aktarım uzak veritabanına dakikalarca sorgu atıyor; arada bir
    // bağlantı düşmesi normal ve tekrar denenebilir bir durum.
    try {

    // --- ürünü bul -----------------------------------------------------
    const slugCandidate = product.slug ?? slugify(product.name);

    const existing = product.externalId
      ? await prisma.product.findUnique({
          where: { externalId: product.externalId },
          select: { id: true },
        })
      : await prisma.product.findUnique({
          where: { slug: slugCandidate },
          select: { id: true },
        });

    if (existing) counts.productsToUpdate += 1;
    else counts.productsToCreate += 1;

    // Ticimax'te bir ürün ortalama 5-6 kategoriye bağlı. İlki ana kategori
    // sayılıyor (breadcrumb ondan kuruluyor), diğerleri ek bağ olarak duruyor.
    const categoryIds: string[] = [];
    for (const path of product.categoryPaths) {
      const id = await resolveCategoryPath(
        path,
        categoryCache,
        newCategories,
        options.dryRun,
      );
      if (id) {
        if (!categoryIds.includes(id)) categoryIds.push(id);
      } else {
        issues.push({
          rowNumber: product.variants[0]?.rowNumber ?? 0,
          level: "uyari",
          field: "Kategori",
          message: `"${product.name}" için kategori çözülemedi: "${path}"`,
        });
      }
    }

    // --- varyant seçeneklerini çöz -------------------------------------
    const variantPlans: Array<{
      row: (typeof product.variants)[number];
      optionValueIds: string[];
    }> = [];
    const seenCombos = new Set<string>();

    for (const row of product.variants) {
      const optionValueIds: string[] = [];
      for (const option of row.options) {
        const id = await resolveOptionValue(
          option.type,
          option.value,
          optionCache,
          newOptionValues,
          options.dryRun,
        );
        if (id) optionValueIds.push(id);
      }

      const comboKey = [...optionValueIds].sort().join("|");
      if (seenCombos.has(comboKey)) continue; // gruplama aşamasında uyarı verildi
      seenCombos.add(comboKey);

      variantPlans.push({ row, optionValueIds });
    }

    // --- yazma ----------------------------------------------------------
    let productId: string | null = existing?.id ?? null;

    if (!options.dryRun) {
      const slug = existing
        ? slugCandidate
        : await uniqueSlug(slugCandidate, async (candidate) => {
            const found = await prisma.product.findUnique({
              where: { slug: candidate },
              select: { id: true },
            });
            return found !== null;
          });

      const base = {
        name: product.name,
        shortDesc: product.shortDesc ?? null,
        description: product.description ?? null,
        isActive: product.isActive,
        externalId: product.externalId ?? null,
      };

      if (existing) {
        await prisma.product.update({ where: { id: existing.id }, data: base });
        productId = existing.id;
      } else {
        const record = await prisma.product.create({
          data: { ...base, slug, brandId: brand?.id ?? null },
        });
        productId = record.id;
      }

      for (const [position, categoryId] of categoryIds.entries()) {
        if (categoryId.startsWith("yeni:")) continue;
        await prisma.productCategory.upsert({
          where: { productId_categoryId: { productId, categoryId } },
          update: { isPrimary: position === 0 },
          create: { productId, categoryId, isPrimary: position === 0 },
        });
      }
    }

    // --- varyantlar ------------------------------------------------------
    for (const plan of variantPlans) {
      const { row, optionValueIds } = plan;

      let variantId: string | null = null;

      if (productId) {
        // Önce SKU, yoksa seçenek kombinasyonu üzerinden eşleştir
        const bySku = row.sku
          ? await prisma.variant.findUnique({
              where: { sku: row.sku },
              select: { id: true, productId: true },
            })
          : null;

        if (bySku && bySku.productId === productId) {
          variantId = bySku.id;
        } else if (bySku) {
          issues.push({
            rowNumber: row.rowNumber,
            level: "uyari",
            field: "SKU",
            message: `"${row.sku}" başka bir üründe kullanılıyor, bu satırda SKU boş bırakılacak.`,
          });
        } else if (optionValueIds.length > 0) {
          const candidates = await prisma.variant.findMany({
            where: {
              productId,
              optionValues: { some: { optionValueId: { in: optionValueIds } } },
            },
            select: {
              id: true,
              optionValues: { select: { optionValueId: true } },
            },
          });
          const target = [...optionValueIds].sort().join("|");
          variantId =
            candidates.find(
              (candidate) =>
                candidate.optionValues
                  .map((item) => item.optionValueId)
                  .sort()
                  .join("|") === target,
            )?.id ?? null;
        } else {
          const single = await prisma.variant.findFirst({
            where: { productId },
            select: { id: true },
          });
          variantId = single?.id ?? null;
        }
      }

      if (variantId) counts.variantsToUpdate += 1;
      else counts.variantsToCreate += 1;

      if (options.dryRun || !productId) continue;

      const payload = {
        sku: row.sku ?? null,
        barcode: row.barcode ?? null,
        price: kurusToDecimalString(row.priceKurus),
        vatRate: kurusToDecimalString(row.vatRateBp),
        stock: row.stock,
        isActive: row.isActive,
      };

      if (variantId) {
        const before = await prisma.variant.findUnique({
          where: { id: variantId },
          select: { stock: true },
        });
        await prisma.variant.update({ where: { id: variantId }, data: payload });

        if (before && before.stock !== row.stock) {
          await prisma.stockMovement.create({
            data: {
              variantId,
              delta: row.stock - before.stock,
              reason: "aktarim",
              note: "Katalog aktarımı",
            },
          });
        }
      } else {
        const created = await prisma.variant.create({
          data: { ...payload, productId },
        });
        variantId = created.id;

        if (row.stock > 0) {
          await prisma.stockMovement.create({
            data: {
              variantId,
              delta: row.stock,
              reason: "aktarim",
              note: "Katalog aktarımı",
            },
          });
        }
      }

      const realOptionIds = optionValueIds.filter((id) => !id.startsWith("yeni:"));
      await prisma.variantOptionValue.deleteMany({ where: { variantId } });
      if (realOptionIds.length > 0) {
        await prisma.variantOptionValue.createMany({
          data: realOptionIds.map((optionValueId) => ({ variantId, optionValueId })),
          skipDuplicates: true,
        });
      }
    }

    // --- görseller --------------------------------------------------------
    if (product.imageUrls.length > 0) {
      const already = productId
        ? await prisma.productImage.findMany({
            where: { productId },
            select: { sourceUrl: true, sortOrder: true },
          })
        : [];
      const havePairs = new Set(
        already.map((image) => image.sourceUrl).filter(Boolean) as string[],
      );
      const missing = product.imageUrls.filter((url) => !havePairs.has(url));
      counts.imagesToDownload += missing.length;

      if (!options.dryRun && options.downloadImages && productId) {
        let sortOrder = already.length;
        for (const url of missing) {
          try {
            const stored = await storeImageFromUrl(url);
            await prisma.productImage.create({
              data: {
                productId,
                url: stored.url,
                sourceUrl: url,
                sortOrder: sortOrder++,
              },
            });
            imagesDownloaded += 1;
          } catch (error) {
            imagesFailed += 1;
            issues.push({
              rowNumber: product.variants[0]?.rowNumber ?? 0,
              level: "uyari",
              field: "Görsel",
              message:
                error instanceof UploadError
                  ? error.message
                  : `Görsel alınamadı: ${url}`,
            });
          }
        }
      }
    }
    } catch (error) {
      failedProducts += 1;
      issues.push({
        rowNumber: product.variants[0]?.rowNumber ?? 0,
        level: "hata",
        message:
          `"${product.name}" aktarılamadı: ` +
          (error instanceof Error ? error.message : "bilinmeyen hata") +
          ". Aktarımı tekrar çalıştırdığınızda bu ürün yeniden denenecek.",
      });
    }
  }

  return {
    plan: {
      products,
      newCategories: [...newCategories],
      newOptionValues: [...newOptionValues],
      counts,
    },
    issues,
    applied: !options.dryRun,
    imagesDownloaded,
    imagesFailed,
    failedProducts,
  };
}
