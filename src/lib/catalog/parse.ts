import { toBasisPoints, toKurus } from "@/lib/price";
import { slugify } from "@/lib/slug";

import { firstIndex, mapColumns, type ColumnMap } from "./columns";
import type {
  CatalogRow,
  GroupedProduct,
  ParseResult,
  ParsedOption,
  RowIssue,
} from "./types";

/** Excel'den gelen ham tablo: ilk satır başlık, gerisi veri. */
export type RawTable = Array<Array<string | number | boolean | Date | null>>;

function cell(row: RawTable[number], index: number | undefined): string {
  if (index === undefined) return "";
  const value = row[index];
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  return String(value).trim();
}

function parseBoolean(text: string, fallback: boolean): boolean {
  if (text === "") return fallback;
  const normalized = text.toLocaleLowerCase("tr");
  if (["1", "evet", "aktif", "true", "yes", "var", "acik", "açık"].includes(normalized)) {
    return true;
  }
  if (
    ["0", "hayir", "hayır", "pasif", "false", "no", "yok", "kapali", "kapalı"].includes(
      normalized,
    )
  ) {
    return false;
  }
  return fallback;
}

/**
 * Görsel hücresi tek adres de olabilir, ayraçlı liste de.
 * Ticimax export'unda genelde virgül veya dikey çizgi ile ayrılıyor.
 */
function parseImageUrls(values: string[]): string[] {
  const urls = values
    .flatMap((value) => value.split(/[|,;\n]/))
    .map((url) => url.trim())
    .filter((url) => url !== "");

  // Aynı görsel iki sütunda tekrar edebiliyor
  return [...new Set(urls)].filter((url) => /^https?:\/\//i.test(url));
}

export function parseTable(table: RawTable): ParseResult {
  const issues: RowIssue[] = [];

  if (table.length === 0) {
    return {
      rows: [],
      issues: [{ rowNumber: 0, level: "hata", message: "Dosya boş." }],
      unknownColumns: [],
      skipped: 0,
    };
  }

  const headers = table[0].map((value) => String(value ?? ""));
  const columns = mapColumns(headers);

  const missing: string[] = [];
  if (firstIndex(columns, "productName") === undefined) missing.push("Ürün adı");
  if (firstIndex(columns, "price") === undefined) missing.push("Fiyat");

  if (missing.length > 0) {
    return {
      rows: [],
      issues: [
        {
          rowNumber: 1,
          level: "hata",
          message: `Zorunlu sütun bulunamadı: ${missing.join(", ")}. Başlık satırını kontrol edin.`,
        },
      ],
      unknownColumns: columns.unknown.map((item) => item.header),
      skipped: table.length - 1,
    };
  }

  const rows: CatalogRow[] = [];
  let skipped = 0;

  for (let index = 1; index < table.length; index += 1) {
    const raw = table[index];
    const rowNumber = index + 1; // Excel'de başlık 1. satır

    // Tamamen boş satırları sessizce atla — Excel dosyalarının sonunda çok oluyor
    if (raw.every((value) => value === null || value === undefined || String(value).trim() === "")) {
      continue;
    }

    const parsed = parseRow(raw, rowNumber, columns, issues);
    if (parsed) rows.push(parsed);
    else skipped += 1;
  }

  return {
    rows,
    issues,
    unknownColumns: columns.unknown.map((item) => item.header),
    skipped,
  };
}

function parseRow(
  raw: RawTable[number],
  rowNumber: number,
  columns: ColumnMap,
  issues: RowIssue[],
): CatalogRow | null {
  const productName = cell(raw, firstIndex(columns, "productName"));

  if (productName === "") {
    issues.push({
      rowNumber,
      level: "hata",
      field: "Ürün adı",
      message: "Ürün adı boş, satır atlandı.",
    });
    return null;
  }

  const priceText = cell(raw, firstIndex(columns, "price"));
  const priceKurus = toKurus(priceText);

  if (priceText === "" || priceKurus <= 0) {
    issues.push({
      rowNumber,
      level: "hata",
      field: "Fiyat",
      message: `"${productName}" için fiyat okunamadı ("${priceText}"), satır atlandı.`,
    });
    return null;
  }

  const options: ParsedOption[] = [];
  const size = cell(raw, firstIndex(columns, "size"));
  const color = cell(raw, firstIndex(columns, "color"));
  if (size !== "") options.push({ type: "Beden", value: size });
  if (color !== "") options.push({ type: "Renk", value: color });

  const stockText = cell(raw, firstIndex(columns, "stock"));
  let stock = 0;
  if (stockText !== "") {
    const parsedStock = Number(stockText.replace(",", "."));
    if (!Number.isFinite(parsedStock) || parsedStock < 0) {
      issues.push({
        rowNumber,
        level: "uyari",
        field: "Stok",
        message: `"${productName}" stok değeri okunamadı ("${stockText}"), 0 kabul edildi.`,
      });
    } else {
      stock = Math.floor(parsedStock);
    }
  }

  const vatText = cell(raw, firstIndex(columns, "vatRate"));
  const vatRateBp = vatText === "" ? 1000 : toBasisPoints(vatText);

  const imageUrls = parseImageUrls(
    (columns.byKey.images ?? []).map((index) => cell(raw, index)),
  );

  const slugText = cell(raw, firstIndex(columns, "slug"));

  return {
    rowNumber,
    externalId: cell(raw, firstIndex(columns, "externalId")) || undefined,
    productName,
    slug: slugText ? slugify(slugText) : undefined,
    shortDesc: cell(raw, firstIndex(columns, "shortDesc")) || undefined,
    description: cell(raw, firstIndex(columns, "description")) || undefined,
    categoryPath: cell(raw, firstIndex(columns, "categoryPath")) || undefined,
    isActive: parseBoolean(cell(raw, firstIndex(columns, "isActive")), true),
    options,
    sku: cell(raw, firstIndex(columns, "sku")) || undefined,
    barcode: cell(raw, firstIndex(columns, "barcode")) || undefined,
    priceKurus,
    vatRateBp,
    stock,
    imageUrls,
  };
}

/**
 * Satırları ürünlere göre gruplar. Aynı ürünün farklı bedenleri ayrı
 * satırlarda geldiği için, hangi satırların aynı ürüne ait olduğunu
 * belirlemek gerekiyor.
 *
 * Öncelik sırası: externalId > slug > ürün adı. Ticimax export'unda ürün id
 * varsa en güvenilir o; yoksa isim üzerinden gruplamak zorundayız ve aynı
 * isimli iki farklı ürün varsa birleşirler — bu yüzden rapora uyarı düşüyoruz.
 */
export function groupRows(rows: CatalogRow[]): {
  products: GroupedProduct[];
  issues: RowIssue[];
} {
  const issues: RowIssue[] = [];
  const byKey = new Map<string, GroupedProduct>();

  for (const row of rows) {
    const key = row.externalId ?? row.slug ?? slugify(row.productName);

    let product = byKey.get(key);
    if (!product) {
      product = {
        key,
        externalId: row.externalId,
        name: row.productName,
        slug: row.slug,
        shortDesc: row.shortDesc,
        description: row.description,
        categoryPath: row.categoryPath,
        isActive: row.isActive,
        imageUrls: [],
        variants: [],
      };
      byKey.set(key, product);
    }

    // Ürün görselleri satır bazında tekrar edebiliyor; birleştirip tekilleştir
    for (const url of row.imageUrls) {
      if (!product.imageUrls.includes(url)) product.imageUrls.push(url);
    }

    product.variants.push(row);
  }

  for (const product of byKey.values()) {
    // Seçeneksiz birden fazla satır: hangisinin hangi varyant olduğu belirsiz
    const withoutOptions = product.variants.filter((row) => row.options.length === 0);
    if (withoutOptions.length > 1) {
      issues.push({
        rowNumber: withoutOptions[1].rowNumber,
        level: "uyari",
        message:
          `"${product.name}" için beden/renk bilgisi olmayan ${withoutOptions.length} satır var. ` +
          "Bunlar tek varyanta indirgenecek, ilki kullanılacak.",
      });
    }

    // Aynı seçenek kombinasyonu iki kez
    const seen = new Map<string, number>();
    for (const variant of product.variants) {
      const comboKey = variant.options
        .map((option) => `${option.type}:${option.value}`)
        .sort()
        .join("|");
      const previous = seen.get(comboKey);
      if (previous !== undefined) {
        issues.push({
          rowNumber: variant.rowNumber,
          level: "uyari",
          message:
            `"${product.name}" ürününde aynı seçenek (${comboKey || "seçeneksiz"}) ` +
            `${previous}. satırda da var. Bu satır atlanacak.`,
        });
      } else {
        seen.set(comboKey, variant.rowNumber);
      }
    }
  }

  return { products: [...byKey.values()], issues };
}
