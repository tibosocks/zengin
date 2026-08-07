// Excel sütun başlıklarını tanıma.
//
// Ticimax'in export başlıkları paket/sürüme göre değişiyor ve elle
// düzenlenmiş dosyalarda da "Fiyat", "Satış Fiyatı", "KDV Hariç Fiyat" gibi
// varyasyonlar çıkıyor. Başlığı sadeleştirip (küçük harf, Türkçe karakter
// sadeleştirme, boşluk/noktalama atma) takma adlarla eşleştiriyoruz.
//
// Böylece kullanıcı dosyayı Excel'de düzenlerken sütun adını birebir
// korumak zorunda kalmıyor.

export type ColumnKey =
  | "externalId"
  | "productName"
  | "slug"
  | "shortDesc"
  | "description"
  | "categoryPath"
  | "isActive"
  | "sku"
  | "barcode"
  | "size"
  | "color"
  | "price"
  | "vatRate"
  | "stock"
  | "images";

const ALIASES: Record<ColumnKey, string[]> = {
  externalId: ["id", "urunid", "ticimaxid", "kaynakid", "externalid", "urunkodu"],
  productName: ["urunadi", "ad", "adi", "urun", "baslik", "name", "productname", "urunismi"],
  slug: ["slug", "seourl", "url", "adres", "linkadresi"],
  shortDesc: ["kisaaciklama", "ozet", "shortdescription"],
  description: ["aciklama", "detay", "urunaciklamasi", "description"],
  categoryPath: ["kategori", "kategoriler", "kategoriyolu", "category", "kategoriadi"],
  isActive: ["durum", "aktif", "aktifmi", "active", "status", "yayinda"],
  sku: ["sku", "stokkodu", "urunkodustok", "barkodkodu", "varyantkodu"],
  barcode: ["barkod", "barcode", "ean"],
  size: ["beden", "numara", "size", "bedeni", "olcu"],
  color: ["renk", "color", "renkadi"],
  price: [
    "fiyat",
    "satisfiyati",
    "kdvharicfiyat",
    "kdvhariv",
    "price",
    "listefiyati",
    "birimfiyat",
  ],
  vatRate: ["kdv", "kdvorani", "vergiorani", "vat", "taxrate"],
  stock: ["stok", "stokadedi", "adet", "miktar", "stock", "quantity", "stokmiktari"],
  images: ["gorsel", "resim", "fotograf", "image", "gorselurl", "resimurl", "foto"],
};

const TR_FOLD: Record<string, string> = {
  ç: "c",
  ğ: "g",
  ı: "i",
  i̇: "i",
  ö: "o",
  ş: "s",
  ü: "u",
  â: "a",
  î: "i",
  û: "u",
};

/** "KDV Hariç Fiyat" -> "kdvharicfiyat" */
export function normalizeHeader(header: string): string {
  return Array.from(header.toLocaleLowerCase("tr"))
    .map((char) => TR_FOLD[char] ?? char)
    .join("")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

export interface ColumnMap {
  /** ColumnKey -> sütun indeksleri (görsel gibi çoklu sütunlar için dizi) */
  byKey: Partial<Record<ColumnKey, number[]>>;
  /** Tanınmayan başlıklar; kullanıcıya rapor ediyoruz */
  unknown: Array<{ index: number; header: string }>;
}

export function mapColumns(headers: string[]): ColumnMap {
  const byKey: Partial<Record<ColumnKey, number[]>> = {};
  const unknown: Array<{ index: number; header: string }> = [];

  headers.forEach((rawHeader, index) => {
    const header = String(rawHeader ?? "").trim();
    if (header === "") return;

    // Aynı başlık için birkaç aday üretiyoruz:
    //  "Fiyat (KDV hariç)" -> "fiyatkdvharic" ve parantezsiz hali "fiyat"
    //  "Görsel 1"          -> "gorsel1" ve numarasız hali "gorsel"
    // Böylece kendi dışa aktardığımız dosya da, Ticimax'in başlıkları da
    // aynı listeyle tanınıyor.
    const normalized = normalizeHeader(header);
    const candidates = new Set([
      normalized,
      normalized.replace(/\d+$/, ""),
      normalizeHeader(header.replace(/\([^)]*\)/g, "")),
    ]);

    let matched: ColumnKey | null = null;
    for (const [key, aliases] of Object.entries(ALIASES) as Array<
      [ColumnKey, string[]]
    >) {
      if (aliases.some((alias) => candidates.has(alias))) {
        matched = key;
        break;
      }
    }

    if (matched) {
      (byKey[matched] ??= []).push(index);
    } else {
      unknown.push({ index, header });
    }
  });

  return { byKey, unknown };
}

export function firstIndex(map: ColumnMap, key: ColumnKey): number | undefined {
  return map.byKey[key]?.[0];
}
