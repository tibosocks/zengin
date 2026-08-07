// NOT: burada `import "server-only"` YOK.
// O paket react-server koşulu dışında bilerek hata fırlatıyor ve bu modül
// aktarım CLI'ından (scripts/import-catalog.ts, düz Node) da kullanılıyor.
// Yanlışlıkla istemciye sızma riski düşük: modül sharp / node:fs / pg gibi
// sunucuya özel bağımlılıklar taşıdığı için istemci derlemesi zaten kırılır.
import readXlsxFile from "read-excel-file/node";
import writeXlsxFile, { type SheetData } from "write-excel-file/node";

import { kurusToDecimalString } from "@/lib/price";

import type { RawTable } from "./parse";

/** Panelde ve CLI'da kullanılan tek sütun düzeni. */
export const EXPORT_COLUMNS = [
  "Ürün ID",
  "Ürün Adı",
  "Slug",
  "Kategori",
  "Kısa Açıklama",
  "Beden",
  "Renk",
  "SKU",
  "Barkod",
  "Fiyat (KDV hariç)",
  "KDV",
  "Stok",
  "Durum",
  "Görseller",
] as const;

export interface ExportRow {
  externalId: string;
  productName: string;
  slug: string;
  categoryPath: string;
  shortDesc: string;
  size: string;
  color: string;
  sku: string;
  barcode: string;
  priceKurus: number;
  vatRateBp: number;
  stock: number;
  isActive: boolean;
  imageUrls: string[];
}

export interface ReadResult {
  table: RawTable;
  sheetName: string;
}

/** Sayfa listesi mi düz satır dizisi mi döndüğü sürüme göre değişiyor. */
type SheetEnvelope = { sheet?: string; data?: RawTable };

export async function readTable(source: string | Buffer): Promise<ReadResult> {
  // read-excel-file Buffer'ı doğrudan kabul etmiyor; Stream'e sarıyoruz
  const input =
    typeof source === "string"
      ? source
      : (await import("node:stream")).Readable.from(source);

  const result = (await readXlsxFile(
    input as Parameters<typeof readXlsxFile>[0],
  )) as unknown;

  if (!Array.isArray(result) || result.length === 0) {
    return { table: [], sheetName: "" };
  }

  const first = result[0] as SheetEnvelope | unknown[];

  // Sayfa zarfı: [{ sheet: "Ürünler", data: [[...]] }]
  if (!Array.isArray(first) && typeof first === "object" && first !== null && "data" in first) {
    const sheets = result as SheetEnvelope[];
    // Birden fazla sayfa varsa en çok satırı olanı seçiyoruz; Ticimax
    // export'larında ilk sayfa bazen açıklama/başlık sayfası oluyor.
    const chosen = sheets.reduce((best, sheet) =>
      (sheet.data?.length ?? 0) > (best.data?.length ?? 0) ? sheet : best,
    );
    return { table: chosen.data ?? [], sheetName: chosen.sheet ?? "" };
  }

  return { table: result as RawTable, sheetName: "" };
}

export async function buildWorkbook(rows: ExportRow[]): Promise<Buffer> {
  const header = EXPORT_COLUMNS.map((value) => ({
    value,
    fontWeight: "bold" as const,
  }));

  const body: SheetData = rows.map((row) => [
    { value: row.externalId, type: String },
    { value: row.productName, type: String },
    { value: row.slug, type: String },
    { value: row.categoryPath, type: String },
    { value: row.shortDesc, type: String },
    { value: row.size, type: String },
    { value: row.color, type: String },
    { value: row.sku, type: String },
    { value: row.barcode, type: String },
    // Fiyatı metin olarak yazıyoruz: sayı olarak yazılınca Excel yerel ayara
    // göre 199,90'ı 19990 gibi yorumlayabiliyor ve geri yüklemede fiyat
    // yüz katına çıkıyor.
    { value: kurusToDecimalString(row.priceKurus), type: String },
    { value: String(row.vatRateBp / 100), type: String },
    { value: row.stock, type: Number },
    { value: row.isActive ? "Aktif" : "Pasif", type: String },
    { value: row.imageUrls.join(" | "), type: String },
  ]);

  const data: SheetData = [header, ...body];

  // writeXlsxFile doğrudan yazmaz; toBuffer / toFile / toStream döndürür
  return writeXlsxFile(data, {
    sheet: "Ürünler",
    columns: [
      { width: 14 },
      { width: 40 },
      { width: 30 },
      { width: 30 },
      { width: 30 },
      { width: 12 },
      { width: 12 },
      { width: 16 },
      { width: 16 },
      { width: 18 },
      { width: 8 },
      { width: 8 },
      { width: 10 },
      { width: 50 },
    ],
  }).toBuffer();
}
