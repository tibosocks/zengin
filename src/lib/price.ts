// Para ve fiyat hesaplama.
//
// Kural: para her yerde TAM SAYI KURUŞ olarak taşınır. Ondalıklı sayıyla
// çarpma/bölme yapılırsa 0,01 TL'lik sapmalar birikir ve sipariş toplamı
// kalemlerin toplamını tutmaz. Kuruşa çevirme sadece giriş/çıkışta olur.
//
// Yüzdeler de tam sayıya çevrilir: %17,50 -> 1750 "baz puan".
// Böylece ondalıklı indirim (bayi pazarlığı) kayıpsız hesaplanır.

export type Kurus = number;

/** Prisma Decimal, string veya number -> kuruş (tam sayı). */
export function toKurus(value: unknown): Kurus {
  if (value === null || value === undefined) return 0;

  const text =
    typeof value === "object" && value !== null && "toString" in value
      ? (value as { toString(): string }).toString()
      : String(value);

  const normalized = text.trim().replace(",", ".");
  if (normalized === "") return 0;

  const [whole, fraction = ""] = normalized.split(".");
  const sign = whole.startsWith("-") ? -1 : 1;
  const wholeDigits = whole.replace("-", "").replace(/\D/g, "") || "0";
  const fractionDigits = (fraction.replace(/\D/g, "") + "00").slice(0, 2);

  return sign * (Number(wholeDigits) * 100 + Number(fractionDigits));
}

/** Kuruş -> Prisma'ya yazılabilir ondalıklı string ("28220" -> "282.20"). */
export function kurusToDecimalString(kurus: Kurus): string {
  const sign = kurus < 0 ? "-" : "";
  const abs = Math.abs(Math.round(kurus));
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}

/** Yüzde (17.5) -> baz puan (1750). */
export function toBasisPoints(percent: unknown): number {
  return Math.round(toKurus(percent));
}

/** Yarım yukarı yuvarlama. JS'in Math.round'u negatifte farklı davranır. */
function roundHalfUp(value: number): number {
  return value < 0 ? -Math.round(-value) : Math.round(value);
}

export interface PriceInput {
  /** Liste fiyatı, KDV hariç, kuruş. */
  listPrice: Kurus;
  /** Müşteriye özel indirim yüzdesi. 0 = indirim yok. */
  discountPercent?: unknown;
  /** KDV oranı (10 -> %10). */
  vatRate?: unknown;
  /**
   * Bu müşteri+varyant için elle girilmiş istisna fiyat (kuruş, KDV hariç).
   * Verilirse yüzdelik indirim uygulanmaz.
   */
  overridePrice?: Kurus | null;
}

export interface PriceResult {
  /** İndirim öncesi, KDV hariç. */
  listNet: Kurus;
  /** İndirim sonrası, KDV hariç. Sipariş kalemlerinde bu tutar yazılır. */
  net: Kurus;
  /** İndirim tutarı (listNet - net). */
  discount: Kurus;
  /** KDV tutarı. */
  vat: Kurus;
  /** KDV dahil ödenecek tutar. */
  gross: Kurus;
  /** Uygulanan indirim yüzdesi, baz puan. */
  discountBasisPoints: number;
  /** İstisna fiyat mı kullanıldı? */
  isOverride: boolean;
}

/**
 * Tek bir varyantın belirli bir müşteri için fiyatını hesaplar.
 *
 * Sıra (PLAN.md Bölüm 4 "Fiyat hesaplama mantığı"):
 *   1. İstisna fiyat varsa onu kullan
 *   2. Yoksa liste fiyatına yüzdelik indirimi uygula
 *   3. Yuvarlama yok, kuruş korunur
 *   4. KDV indirimli tutarın üstüne eklenir
 */
export function calculatePrice(input: PriceInput): PriceResult {
  const listNet = Math.round(input.listPrice);
  const vatBp = toBasisPoints(input.vatRate ?? 0);

  const isOverride =
    input.overridePrice !== null && input.overridePrice !== undefined;

  const discountBp = isOverride ? 0 : toBasisPoints(input.discountPercent ?? 0);

  const net = isOverride
    ? Math.round(input.overridePrice as number)
    : roundHalfUp((listNet * (10_000 - discountBp)) / 10_000);

  const vat = roundHalfUp((net * vatBp) / 10_000);

  return {
    listNet,
    net,
    discount: listNet - net,
    vat,
    gross: net + vat,
    discountBasisPoints: discountBp,
    isOverride,
  };
}

const TRY_FORMAT = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** 28220 -> "₺282,20" */
export function formatKurus(kurus: Kurus): string {
  return TRY_FORMAT.format(kurus / 100);
}

/** 1750 -> "%17,5" (gereksiz sıfırları atar) */
export function formatBasisPoints(bp: number): string {
  const value = bp / 100;
  const text = Number.isInteger(value)
    ? String(value)
    : String(value).replace(".", ",");
  return `%${text}`;
}
