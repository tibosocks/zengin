import type { OrderStatus } from "@/generated/prisma/client";

// Durum etiketleri ayrı dosyada: "use server" işaretli bir modül sadece
// async fonksiyon export edebiliyor, sabit dizi export edemiyor.

export const ORDER_STATUSES: Array<{ key: OrderStatus; label: string }> = [
  { key: "yeni", label: "Yeni" },
  { key: "onaylandi", label: "Onaylandı" },
  { key: "hazirlaniyor", label: "Hazırlanıyor" },
  { key: "teslime_hazir", label: "Teslime hazır" },
  { key: "teslim_edildi", label: "Teslim edildi" },
  { key: "iptal", label: "İptal" },
];

export function orderStatusLabel(status: OrderStatus | string): string {
  return ORDER_STATUSES.find((item) => item.key === status)?.label ?? status;
}

/**
 * Bir siparişin stok üzerindeki etkisi üç durumdan biridir:
 *   rezerve — mal ayrıldı, fiziksel stok duruyor  (yeni … teslime_hazir)
 *   dusuldu — mal çıktı, rezervasyon serbest      (teslim_edildi)
 *   serbest — hiçbir şey tutulmuyor               (iptal)
 */
export type StockEffect = "rezerve" | "dusuldu" | "serbest";

export function effectOf(status: OrderStatus): StockEffect {
  if (status === "teslim_edildi") return "dusuldu";
  if (status === "iptal") return "serbest";
  return "rezerve";
}

/**
 * Durum değişiminde bir adet için uygulanacak [reserved farkı, stock farkı].
 *
 * Hedef durumun tuttuğu miktardan mevcut durumunki çıkarılıyor. Böylece her
 * geçiş — ileri, geri, teslim edilmiş siparişin iptali dahil — doğru çalışıyor;
 * tek tek geçiş kuralı yazmaya gerek kalmıyor.
 */
export function stockDeltaFor(
  from: StockEffect,
  to: StockEffect,
): [reserved: number, stock: number] {
  const held: Record<StockEffect, [number, number]> = {
    rezerve: [1, 0],
    dusuldu: [0, -1],
    serbest: [0, 0],
  };
  return [held[to][0] - held[from][0], held[to][1] - held[from][1]];
}

/** Kullanıcıya durum değişiminin stoğa etkisini önceden söylemek için. */
export function stockWarning(
  from: OrderStatus,
  to: OrderStatus,
): string | null {
  const [reserved, stock] = stockDeltaFor(effectOf(from), effectOf(to));

  if (stock < 0) return "Stok fiziksel olarak düşecek ve rezervasyon kapanacak.";
  if (stock > 0) return "Düşülen stok geri eklenecek.";
  if (reserved < 0)
    return "Rezervasyon serbest bırakılacak, ürünler tekrar satışa açılacak.";
  if (reserved > 0) return "Ürünler yeniden rezerve edilecek.";
  return null;
}
