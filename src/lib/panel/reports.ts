import "server-only";

import { toKurus } from "@/lib/price";
import { prisma } from "@/lib/prisma";

/**
 * Panel raporları.
 *
 * Ciro hesabında **iptal edilen siparişler sayılmaz**, diğer tüm durumlar
 * sayılır. "Sadece teslim edilenler" demek de savunulabilirdi ama ödeme
 * mağazada alındığı için sipariş teslim edilene kadar günlerce "hazırlanıyor"
 * durumunda kalıyor; o siparişleri ciroya katmamak tabloyu boş gösterirdi.
 *
 * Tutarlar KDV hariç (`subtotal`) — panelin geri kalanı da böyle.
 */

export interface PeriodSummary {
  label: string;
  orders: number;
  netKurus: number;
  grossKurus: number;
  /** Ortalama sipariş tutarı, KDV hariç */
  averageKurus: number;
}

const SATILAN = { status: { not: "iptal" as const } };

async function summarize(label: string, since: Date | null): Promise<PeriodSummary> {
  const where = {
    ...SATILAN,
    ...(since ? { createdAt: { gte: since } } : {}),
  };

  const [count, sums] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.aggregate({
      where,
      _sum: { subtotal: true, grandTotal: true },
    }),
  ]);

  const netKurus = toKurus(sums._sum.subtotal);
  const grossKurus = toKurus(sums._sum.grandTotal);

  return {
    label,
    orders: count,
    netKurus,
    grossKurus,
    averageKurus: count > 0 ? Math.round(netKurus / count) : 0,
  };
}

function daysAgo(days: number): Date {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - days);
  return date;
}

export async function getRevenueSummary(): Promise<PeriodSummary[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const monthStart = new Date();
  monthStart.setHours(0, 0, 0, 0);
  monthStart.setDate(1);

  return Promise.all([
    summarize("Bugün", today),
    summarize("Son 7 gün", daysAgo(7)),
    summarize("Son 30 gün", daysAgo(30)),
    summarize("Bu ay", monthStart),
    summarize("Tüm zamanlar", null),
  ]);
}

export interface TopProduct {
  productId: string | null;
  name: string;
  quantity: number;
  netKurus: number;
}

/** En çok satan ürünler. Varyantlar ürün düzeyinde toplanır. */
export async function getTopProducts(limit = 10): Promise<TopProduct[]> {
  const items = await prisma.orderItem.findMany({
    where: { order: SATILAN },
    select: {
      productName: true,
      quantity: true,
      lineTotal: true,
      variant: { select: { productId: true } },
    },
  });

  const byProduct = new Map<string, TopProduct>();

  for (const item of items) {
    // Ürün silinmişse varyant bağı kopuyor; kalemdeki ad anlık görüntü
    // olarak durduğu için rapor yine de doğru çıkıyor.
    const key = item.variant?.productId ?? `ad:${item.productName}`;
    const current = byProduct.get(key) ?? {
      productId: item.variant?.productId ?? null,
      name: item.productName,
      quantity: 0,
      netKurus: 0,
    };
    current.quantity += item.quantity;
    current.netKurus += toKurus(item.lineTotal);
    byProduct.set(key, current);
  }

  return [...byProduct.values()]
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, limit);
}

export interface TopCustomer {
  id: string;
  name: string;
  phone: string;
  orders: number;
  netKurus: number;
}

export async function getTopCustomers(limit = 10): Promise<TopCustomer[]> {
  const grouped = await prisma.order.groupBy({
    by: ["customerId"],
    where: SATILAN,
    _count: { _all: true },
    _sum: { subtotal: true },
  });

  const sorted = grouped
    .map((row) => ({
      customerId: row.customerId,
      orders: row._count._all,
      netKurus: toKurus(row._sum.subtotal),
    }))
    .sort((a, b) => b.netKurus - a.netKurus)
    .slice(0, limit);

  if (sorted.length === 0) return [];

  const customers = await prisma.customer.findMany({
    where: { id: { in: sorted.map((row) => row.customerId) } },
    select: { id: true, fullName: true, companyName: true, phone: true },
  });
  const byId = new Map(customers.map((row) => [row.id, row]));

  return sorted.flatMap((row) => {
    const customer = byId.get(row.customerId);
    if (!customer) return [];
    return [
      {
        id: customer.id,
        name: customer.companyName || customer.fullName,
        phone: customer.phone,
        orders: row.orders,
        netKurus: row.netKurus,
      },
    ];
  });
}

export interface StockAlert {
  productId: string;
  productName: string;
  variantLabel: string;
  sku: string | null;
  available: number;
  stock: number;
}

/** Satılabiliri eşiğin altına düşmüş varyantlar. */
export async function getStockAlerts(limit = 20): Promise<{
  outOfStock: StockAlert[];
  low: StockAlert[];
  threshold: number;
}> {
  const setting = await prisma.setting.findUnique({
    where: { key: "lowStockThreshold" },
    select: { value: true },
  });
  const threshold = Number(setting?.value) || 5;

  const variants = await prisma.variant.findMany({
    where: {
      isActive: true,
      product: { isActive: true },
      stock: { lte: threshold },
    },
    orderBy: { stock: "asc" },
    take: limit * 2,
    select: {
      sku: true,
      stock: true,
      reserved: true,
      product: { select: { id: true, name: true } },
      optionValues: {
        select: { optionValue: { select: { value: true } } },
      },
    },
  });

  const rows: StockAlert[] = variants.map((variant) => ({
    productId: variant.product.id,
    productName: variant.product.name,
    variantLabel:
      variant.optionValues.map((link) => link.optionValue.value).join(" / ") ||
      "Tek varyant",
    sku: variant.sku,
    stock: variant.stock,
    available: variant.stock - variant.reserved,
  }));

  return {
    outOfStock: rows.filter((row) => row.available <= 0).slice(0, limit),
    low: rows.filter((row) => row.available > 0).slice(0, limit),
    threshold,
  };
}
