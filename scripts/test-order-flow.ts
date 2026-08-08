// Sipariş durum geçişlerinin stoğa etkisini doğrular.
//
// Model: rezerve -> dusuldu -> geri -> iptal ... her adımda
// stock/reserved beklenen değerde mi?
import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";
import type { OrderStatus } from "../src/generated/prisma/client";
import { effectOf, stockDeltaFor } from "../src/lib/order-status";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const QTY = 3;
let failures = 0;

async function snap(variantId: string) {
  const v = await prisma.variant.findUniqueOrThrow({
    where: { id: variantId },
    select: { stock: true, reserved: true },
  });
  return v;
}

function check(label: string, actual: { stock: number; reserved: number }, stock: number, reserved: number) {
  const ok = actual.stock === stock && actual.reserved === reserved;
  if (!ok) failures += 1;
  console.log(
    `  ${ok ? "✓" : "✗"} ${label.padEnd(34)} stok=${actual.stock} rezerve=${actual.reserved}` +
      (ok ? "" : `   BEKLENEN stok=${stock} rezerve=${reserved}`),
  );
}

/** Aksiyonun yaptığı işi birebir taklit eder (aksiyon çağrısı auth istiyor). */
async function move(orderId: string, to: OrderStatus) {
  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUniqueOrThrow({
      where: { id: orderId },
      select: { status: true, items: { select: { variantId: true, quantity: true } } },
    });
    const [r, s] = stockDeltaFor(effectOf(order.status), effectOf(to));
    for (const item of order.items) {
      if (!item.variantId) continue;
      if (r !== 0 || s !== 0) {
        await tx.variant.update({
          where: { id: item.variantId },
          data: {
            ...(r !== 0 ? { reserved: { increment: r * item.quantity } } : {}),
            ...(s !== 0 ? { stock: { increment: s * item.quantity } } : {}),
          },
        });
      }
    }
    await tx.order.update({ where: { id: orderId }, data: { status: to } });
  });
}

async function main() {
  const variant = await prisma.variant.findFirstOrThrow({
    where: { stock: { gte: 10 } },
    select: { id: true, sku: true, stock: true, reserved: true },
  });
  const base = variant.stock;
  console.log(`Test varyantı: ${variant.sku} · başlangıç stok=${base} rezerve=${variant.reserved}\n`);

  const customer = await prisma.customer.create({
    data: { fullName: "Akış Testi", phone: "5990000001" },
  });

  const order = await prisma.order.create({
    data: {
      orderNo: `TEST-${Date.now()}`,
      customerId: customer.id,
      status: "yeni",
      subtotal: "0", vatTotal: "0", grandTotal: "0",
      items: {
        create: {
          variantId: variant.id,
          productName: "Test",
          listPrice: "0", unitPrice: "0", vatRate: "10",
          quantity: QTY, lineTotal: "0",
        },
      },
    },
    select: { id: true },
  });

  // Sipariş oluşturma rezervasyonu ayrıca yapıyor; burada elle taklit
  await prisma.variant.update({
    where: { id: variant.id },
    data: { reserved: { increment: QTY } },
  });

  check("sipariş oluştu (yeni)", await snap(variant.id), base, QTY);

  await move(order.id, "onaylandi");
  check("yeni → onaylandı", await snap(variant.id), base, QTY);

  await move(order.id, "hazirlaniyor");
  check("onaylandı → hazırlanıyor", await snap(variant.id), base, QTY);

  await move(order.id, "teslim_edildi");
  check("hazırlanıyor → TESLİM EDİLDİ", await snap(variant.id), base - QTY, 0);

  await move(order.id, "hazirlaniyor");
  check("teslim geri alındı", await snap(variant.id), base, QTY);

  await move(order.id, "iptal");
  check("hazırlanıyor → İPTAL", await snap(variant.id), base, 0);

  await move(order.id, "teslim_edildi");
  check("iptal → teslim edildi", await snap(variant.id), base - QTY, 0);

  await move(order.id, "iptal");
  check("teslim edildi → iptal", await snap(variant.id), base, 0);

  // temizlik
  await prisma.order.delete({ where: { id: order.id } });
  await prisma.customer.delete({ where: { id: customer.id } });
  const final = await snap(variant.id);
  check("temizlik sonrası başlangıca döndü", final, base, 0);

  console.log(failures === 0 ? "\nTÜM GEÇİŞLER DOĞRU." : `\n${failures} GEÇİŞ HATALI.`);
  await prisma.$disconnect();
  if (failures > 0) process.exit(1);
}

main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
