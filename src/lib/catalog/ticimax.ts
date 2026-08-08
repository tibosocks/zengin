// Ticimax XML servisinden katalog okuma.
//
// Servis dört ayrı dosya veriyor ve hepsi UrunKartiID üzerinden bağlanıyor:
//   Kategoriler.xml       KategoriID / ParentID / Tanim  (ParentID=0 -> kök)
//   Urunler.xml           Urun > UrunSecenek > Secenek
//   UrunKategorileri.xml  UrunKartiID -> KategoriID (çoka-çok)
//   UrunResimleri.xml     UrunKartiID + VaryasyonID + ResimAdresi
//
// Bu modül dördünü birleştirip ortak GroupedProduct modeline çeviriyor;
// veritabanına yazma işi Excel yoluyla ortak (import.ts).

import { XMLParser } from "fast-xml-parser";

import { toBasisPoints, toKurus } from "@/lib/price";
import { slugify } from "@/lib/slug";

import type { CatalogRow, GroupedProduct, RowIssue } from "./types";

export interface TicimaxOptions {
  /** XML adreslerinin ortak kökü (sondaki / olsun ya da olmasın). */
  baseUrl: string;
  /** Ürün başına en fazla kaç görsel alınsın. */
  imageLimit?: number;
  onProgress?: (message: string) => void;
}

export interface TicimaxResult {
  products: GroupedProduct[];
  issues: RowIssue[];
  stats: {
    categories: number;
    products: number;
    variants: number;
    categoryLinks: number;
    imageRecords: number;
    orphanImages: number;
    orphanCategoryLinks: number;
    imagesSelected: number;
    totalStock: number;
    priceSumKurus: number;
    renamedSkus: number;
  };
}

/**
 * Ticimax seçenek tipi adlarını bizim tiplerimize eşler.
 *
 * "YAŞ" aslında çocuk/bebe ürünlerinde beden ekseni; panelde "Beden" olarak
 * göstermek hem tutarlı hem de mevcut seed verisiyle uyumlu.
 */
const OPTION_TYPE_MAP: Record<string, string> = {
  YAŞ: "Beden",
  YAS: "Beden",
  BEDEN: "Beden",
  NUMARA: "Beden",
  RENK: "Renk",
};

function mapOptionType(name: string): string {
  return OPTION_TYPE_MAP[name.toLocaleUpperCase("tr")] ?? name;
}

function asArray<T>(value: T | T[] | undefined | null): T[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function text(value: unknown): string {
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

async function fetchXml(url: string, parser: XMLParser): Promise<unknown> {
  const response = await fetch(url, {
    // Katalog dosyaları büyük; Ticimax bazen yavaş yanıt veriyor
    signal: AbortSignal.timeout(180_000),
  });
  if (!response.ok) {
    throw new Error(`${url} okunamadı (HTTP ${response.status})`);
  }
  return parser.parse(await response.text());
}

/** UrunUrl'den okunabilir slug çıkarır: ".../aksesuarli-kadin-babet-986" */
function slugFromUrl(url: string, productId: string): string | undefined {
  const last = url.split("/").filter(Boolean).pop();
  if (!last) return undefined;
  // Ticimax slug'ın sonuna ürün id'sini ekliyor; okunabilirlik için atıyoruz
  const cleaned = last.replace(new RegExp(`-${productId}$`), "");
  const slug = slugify(cleaned);
  return slug || undefined;
}

export async function fetchTicimaxCatalog(
  options: TicimaxOptions,
): Promise<TicimaxResult> {
  const base = options.baseUrl.replace(/\/+$/, "");
  const imageLimit = options.imageLimit ?? 8;
  const issues: RowIssue[] = [];

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@",
    trimValues: true,
    // Sayı gibi görünen stok kodlarının (0012) başındaki sıfırı kaybetmeyelim
    parseTagValue: false,
    parseAttributeValue: false,
  });

  options.onProgress?.("Kategoriler.xml indiriliyor…");
  const categoriesXml = (await fetchXml(`${base}/Kategoriler.xml`, parser)) as {
    Kategoriler?: { Kategori?: unknown };
  };

  options.onProgress?.("Urunler.xml indiriliyor…");
  const productsXml = (await fetchXml(`${base}/Urunler.xml`, parser)) as {
    Root?: { Urunler?: { Urun?: unknown } };
  };

  options.onProgress?.("UrunKategorileri.xml indiriliyor…");
  const linksXml = (await fetchXml(`${base}/UrunKategorileri.xml`, parser)) as {
    UrunKategorileri?: { UrunKategori?: unknown };
  };

  options.onProgress?.("UrunResimleri.xml indiriliyor…");
  const imagesXml = (await fetchXml(`${base}/UrunResimleri.xml`, parser)) as {
    Resimler?: { Resim?: unknown };
  };

  // --- kategori ağacı -------------------------------------------------
  interface RawCategory {
    KategoriID?: string;
    ParentID?: string;
    Tanim?: string;
  }

  const rawCategories = asArray<RawCategory>(
    categoriesXml.Kategoriler?.Kategori as RawCategory[],
  );

  const categoryById = new Map<string, { name: string; parentId: string }>();
  for (const category of rawCategories) {
    const id = text(category.KategoriID);
    if (id === "") continue;
    categoryById.set(id, {
      name: text(category.Tanim),
      parentId: text(category.ParentID),
    });
  }

  /** "Kadın Çorapları > Kadın Patik Çorap > Bambu Patik" */
  function pathOf(categoryId: string): string | null {
    const parts: string[] = [];
    let cursor = categoryId;

    for (let depth = 0; depth < 20; depth += 1) {
      const node = categoryById.get(cursor);
      if (!node) break;
      parts.unshift(node.name);
      if (node.parentId === "0" || node.parentId === "") break;
      cursor = node.parentId;
    }

    return parts.length > 0 ? parts.join(" > ") : null;
  }

  // --- ürün -> kategori bağları ---------------------------------------
  interface RawLink {
    UrunKartiID?: string;
    KategoriID?: string;
  }

  const rawLinks = asArray<RawLink>(
    linksXml.UrunKategorileri?.UrunKategori as RawLink[],
  );
  const linksByProduct = new Map<string, string[]>();
  for (const link of rawLinks) {
    const productId = text(link.UrunKartiID);
    const categoryId = text(link.KategoriID);
    if (productId === "" || categoryId === "") continue;
    const list = linksByProduct.get(productId) ?? [];
    list.push(categoryId);
    linksByProduct.set(productId, list);
  }

  // --- görseller --------------------------------------------------------
  interface RawImage {
    UrunKartiID?: string;
    VaryasyonID?: string;
    ResimAdresi?: string;
  }

  const rawImages = asArray<RawImage>(imagesXml.Resimler?.Resim as RawImage[]);
  const imagesByProduct = new Map<string, string[]>();
  for (const image of rawImages) {
    const productId = text(image.UrunKartiID);
    const url = text(image.ResimAdresi);
    if (productId === "" || !/^https?:\/\//i.test(url)) continue;
    const list = imagesByProduct.get(productId) ?? [];
    if (!list.includes(url)) list.push(url);
    imagesByProduct.set(productId, list);
  }

  // --- ürünler ----------------------------------------------------------
  interface RawOption {
    "@Tanim"?: string;
    "@Deger"?: string;
  }
  interface RawVariant {
    VaryasyonID?: string;
    StokKodu?: string;
    Barkod?: string;
    StokAdedi?: string;
    SatisFiyati?: string;
    IndirimliFiyat?: string;
    KDVDahil?: string;
    KdvOrani?: string;
    EkSecenekOzellik?: { Ozellik?: RawOption | RawOption[] };
  }
  interface RawProduct {
    UrunKartiID?: string;
    UrunAdi?: string;
    OnYazi?: string;
    Aciklama?: string;
    KategoriID?: string;
    UrunUrl?: string;
    UrunSecenek?: { Secenek?: RawVariant | RawVariant[] };
  }

  const rawProducts = asArray<RawProduct>(
    productsXml.Root?.Urunler?.Urun as RawProduct[],
  );

  const productIds = new Set(
    rawProducts.map((product) => text(product.UrunKartiID)).filter((id) => id !== ""),
  );

  const products: GroupedProduct[] = [];
  let rowNumber = 1;
  let variantCount = 0;
  let totalStock = 0;
  let priceSumKurus = 0;
  let imagesSelected = 0;
  let renamedSkus = 0;

  for (const raw of rawProducts) {
    const productId = text(raw.UrunKartiID);
    const name = text(raw.UrunAdi);

    if (productId === "" || name === "") {
      issues.push({
        rowNumber: rowNumber++,
        level: "hata",
        message: `Ürün id veya adı boş (id: "${productId}"), atlandı.`,
      });
      continue;
    }

    // Ana kategori önce ürünün kendi KategoriID'si, sonra bağ tablosu
    const categoryIds: string[] = [];
    const primary = text(raw.KategoriID);
    if (primary !== "" && primary !== "0") categoryIds.push(primary);
    for (const id of linksByProduct.get(productId) ?? []) {
      if (!categoryIds.includes(id)) categoryIds.push(id);
    }

    const categoryPaths: string[] = [];
    for (const id of categoryIds) {
      const path = pathOf(id);
      if (path && !categoryPaths.includes(path)) categoryPaths.push(path);
    }

    const allImages = imagesByProduct.get(productId) ?? [];
    const imageUrls = allImages.slice(0, imageLimit);
    imagesSelected += imageUrls.length;

    const rawVariants = asArray<RawVariant>(raw.UrunSecenek?.Secenek);

    // Ticimax StokKodu'nu ÜRÜN kodu gibi kullanıyor: aynı ürünün renk
    // varyantları aynı kodu paylaşabiliyor. Bizim şemada SKU benzersiz,
    // o yüzden ürün içinde tekrar eden kodları seçenekle ayrıştırıyoruz.
    const skuCounts = new Map<string, number>();
    for (const variant of rawVariants) {
      const sku = text(variant.StokKodu);
      if (sku !== "") skuCounts.set(sku, (skuCounts.get(sku) ?? 0) + 1);
    }

    const variants: CatalogRow[] = [];

    for (const variant of rawVariants) {
      const options = asArray<RawOption>(variant.EkSecenekOzellik?.Ozellik)
        .map((option) => ({
          type: mapOptionType(text(option["@Tanim"])),
          value: text(option["@Deger"]),
        }))
        .filter((option) => option.type !== "" && option.value !== "");

      let sku = text(variant.StokKodu) || undefined;
      if (sku && (skuCounts.get(sku) ?? 0) > 1) {
        const suffix = options.map((option) => option.value).join("-");
        const next = suffix ? `${sku}-${slugify(suffix)}` : `${sku}-${text(variant.VaryasyonID)}`;
        issues.push({
          rowNumber,
          level: "uyari",
          field: "SKU",
          message:
            `"${name}" ürününde "${sku}" stok kodu birden fazla varyantta kullanılmış. ` +
            `Bu varyant "${next}" olarak kaydedilecek.`,
        });
        sku = next;
        renamedSkus += 1;
      }

      const gross = text(variant.KDVDahil).toLowerCase() === "true";
      const vatRateBp = toBasisPoints(text(variant.KdvOrani) || "10");
      const listed = toKurus(text(variant.SatisFiyati));
      const discounted = toKurus(text(variant.IndirimliFiyat));
      const chosen = discounted > 0 && discounted < listed ? discounted : listed;

      // Bizim modelde fiyat her zaman KDV HARİÇ tutuluyor
      const priceKurus = gross
        ? Math.round((chosen * 10_000) / (10_000 + vatRateBp))
        : chosen;

      if (priceKurus <= 0) {
        issues.push({
          rowNumber: rowNumber++,
          level: "hata",
          field: "Fiyat",
          message: `"${name}" varyantının fiyatı 0, atlandı.`,
        });
        continue;
      }

      const stock = Math.max(0, Math.floor(Number(text(variant.StokAdedi)) || 0));

      variants.push({
        rowNumber: rowNumber++,
        externalId: `ticimax:${productId}`,
        productName: name,
        isActive: true,
        options,
        sku,
        barcode: text(variant.Barkod) || undefined,
        priceKurus,
        vatRateBp,
        stock,
        imageUrls: [],
      });

      variantCount += 1;
      totalStock += stock;
      priceSumKurus += priceKurus;
    }

    // Aynı seçenek kombinasyonuna sahip iki varyant, vitrinde ayırt
    // edilemez: müşteri "Çok Renkli" seçtiğinde hangisi olduğu belirsiz.
    // Yazma aşaması ikincisini düşürüyor; burada görünür kılıyoruz.
    const comboSeen = new Map<string, string | undefined>();
    for (const variant of variants) {
      const comboKey = variant.options
        .map((option) => `${option.type}=${option.value}`)
        .sort()
        .join(", ");
      if (comboSeen.has(comboKey)) {
        issues.push({
          rowNumber: variant.rowNumber,
          level: "uyari",
          field: "Varyant",
          message:
            `"${name}" ürününde "${comboKey || "seçeneksiz"}" seçeneği iki varyantta var ` +
            `(${comboSeen.get(comboKey) ?? "?"} ve ${variant.sku ?? "?"}). ` +
            "Vitrinde ayırt edilemeyeceği için ikincisi aktarılmayacak.",
        });
      } else {
        comboSeen.set(comboKey, variant.sku);
      }
    }

    if (variants.length === 0) {
      issues.push({
        rowNumber: rowNumber++,
        level: "uyari",
        message: `"${name}" ürününün geçerli varyantı yok, atlandı.`,
      });
      continue;
    }

    products.push({
      key: `ticimax:${productId}`,
      externalId: `ticimax:${productId}`,
      name,
      slug: slugFromUrl(text(raw.UrunUrl), productId) ?? slugify(name),
      shortDesc: text(raw.OnYazi) || undefined,
      description: text(raw.Aciklama) || undefined,
      categoryPaths,
      isActive: true,
      imageUrls,
      variants,
    });
  }

  const orphanImages = rawImages.filter(
    (image) => !productIds.has(text(image.UrunKartiID)),
  ).length;
  const orphanCategoryLinks = rawLinks.filter(
    (link) => !productIds.has(text(link.UrunKartiID)),
  ).length;

  return {
    products,
    issues,
    stats: {
      categories: rawCategories.length,
      products: products.length,
      variants: variantCount,
      categoryLinks: rawLinks.length,
      imageRecords: rawImages.length,
      orphanImages,
      orphanCategoryLinks,
      imagesSelected,
      totalStock,
      priceSumKurus,
      renamedSkus,
    },
  };
}
