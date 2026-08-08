import "server-only";

import { cookies } from "next/headers";

import { getCustomerSession } from "@/lib/auth";
import { calculatePrice, toBasisPoints, toKurus } from "@/lib/price";
import { prisma } from "@/lib/prisma";

import { getViewerDiscount } from "./catalog";

// Sepet çerezde tutuluyor: sadece varyant id + adet.
//
// Fiyat KESİNLİKLE çerezde tutulmuyor. Tutulsaydı istemci onu değiştirip
// istediği fiyata sipariş verebilirdi. Her okumada fiyat veritabanından
// alınıp müşterinin iskontosuyla yeniden hesaplanıyor.

const CART_COOKIE = "zs_cart";
const MAX_LINES = 60;
const MAX_QUANTITY = 999;

export interface CartLine {
  variantId: string;
  quantity: number;
}

export interface CartItem {
  variantId: string;
  productId: string;
  productName: string;
  productSlug: string;
  optionLabel: string;
  sku: string | null;
  imageUrl: string | null;
  quantity: number;
  /** Satılabilir adet — stok yetmiyorsa uyarı göstermek için */
  available: number;
  unitNetKurus: number;
  unitGrossKurus: number;
  unitListGrossKurus: number | null;
  lineNetKurus: number;
  lineGrossKurus: number;
  vatRateBp: number;
}

export interface CartSummary {
  items: CartItem[];
  subtotalNetKurus: number;
  vatKurus: number;
  discountKurus: number;
  totalGrossKurus: number;
  /** Stoğu yetmeyen veya artık satılmayan satırlar */
  problems: string[];
  discountPercent: number;
}

export async function readCartCookie(): Promise<CartLine[]> {
  const store = await cookies();
  const raw = store.get(CART_COOKIE)?.value;
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter(
        (line): line is CartLine =>
          typeof line === "object" &&
          line !== null &&
          typeof (line as CartLine).variantId === "string" &&
          Number.isInteger((line as CartLine).quantity),
      )
      .map((line) => ({
        variantId: line.variantId,
        quantity: Math.min(MAX_QUANTITY, Math.max(1, line.quantity)),
      }))
      .slice(0, MAX_LINES);
  } catch {
    // Bozuk çerez sepeti kilitlememeli
    return [];
  }
}

export async function writeCartCookie(lines: CartLine[]) {
  const store = await cookies();

  if (lines.length === 0) {
    store.delete(CART_COOKIE);
    return;
  }

  store.set(CART_COOKIE, JSON.stringify(lines.slice(0, MAX_LINES)), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60,
  });
}

/** Sepeti veritabanından zenginleştirip fiyatları sunucuda hesaplar. */
export async function getCart(): Promise<CartSummary> {
  const lines = await readCartCookie();
  const session = await getCustomerSession();
  const { discountPercent } = await getViewerDiscount(session?.customerId);

  if (lines.length === 0) {
    return {
      items: [],
      subtotalNetKurus: 0,
      vatKurus: 0,
      discountKurus: 0,
      totalGrossKurus: 0,
      problems: [],
      discountPercent,
    };
  }

  const variants = await prisma.variant.findMany({
    where: { id: { in: lines.map((line) => line.variantId) } },
    select: {
      id: true,
      sku: true,
      price: true,
      vatRate: true,
      stock: true,
      reserved: true,
      isActive: true,
      optionValues: {
        select: { optionValue: { select: { value: true } } },
      },
      product: {
        select: {
          id: true,
          name: true,
          slug: true,
          isActive: true,
          images: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true } },
        },
      },
    },
  });

  const byId = new Map(variants.map((variant) => [variant.id, variant]));
  const items: CartItem[] = [];
  const problems: string[] = [];

  let subtotalNetKurus = 0;
  let vatKurus = 0;
  let discountKurus = 0;

  for (const line of lines) {
    const variant = byId.get(line.variantId);

    // Ürün panelden silinmiş veya pasife alınmış olabilir
    if (!variant || !variant.isActive || !variant.product.isActive) {
      problems.push("Sepetinizdeki bir ürün artık satışta değil, kaldırıldı.");
      continue;
    }

    const available = Math.max(0, variant.stock - variant.reserved);
    const quantity = Math.min(line.quantity, Math.max(0, available));

    const optionLabel =
      variant.optionValues.map((row) => row.optionValue.value).join(" / ") || "";

    if (available <= 0) {
      problems.push(
        `"${variant.product.name}${optionLabel ? ` (${optionLabel})` : ""}" tükendi, sepetten çıkarıldı.`,
      );
      continue;
    }
    if (quantity < line.quantity) {
      problems.push(
        `"${variant.product.name}${optionLabel ? ` (${optionLabel})` : ""}" için stok ${available} düzine, adet düşürüldü.`,
      );
    }

    const price = calculatePrice({
      listPrice: toKurus(variant.price),
      discountPercent,
      vatRate: variant.vatRate,
    });
    const vatBp = toBasisPoints(variant.vatRate);
    const listGross = price.listNet + Math.round((price.listNet * vatBp) / 10_000);

    const lineNet = price.net * quantity;
    const lineVat = price.vat * quantity;

    subtotalNetKurus += lineNet;
    vatKurus += lineVat;
    discountKurus += price.discount * quantity;

    items.push({
      variantId: variant.id,
      productId: variant.product.id,
      productName: variant.product.name,
      productSlug: variant.product.slug,
      optionLabel,
      sku: variant.sku,
      imageUrl: variant.product.images[0]?.url ?? null,
      quantity,
      available,
      unitNetKurus: price.net,
      unitGrossKurus: price.gross,
      unitListGrossKurus: price.discount > 0 ? listGross : null,
      lineNetKurus: lineNet,
      lineGrossKurus: lineNet + lineVat,
      vatRateBp: vatBp,
    });
  }

  return {
    items,
    subtotalNetKurus,
    vatKurus,
    discountKurus,
    totalGrossKurus: subtotalNetKurus + vatKurus,
    problems,
    discountPercent,
  };
}

export async function cartCount(): Promise<number> {
  const lines = await readCartCookie();
  return lines.reduce((sum, line) => sum + line.quantity, 0);
}
