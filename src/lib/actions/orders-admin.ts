"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { OrderStatus } from "@/generated/prisma/client";
import { requireAdmin } from "@/lib/auth";
import { effectOf, orderStatusLabel, stockDeltaFor } from "@/lib/order-status";
import { prisma } from "@/lib/prisma";

export interface AdminResult {
  ok: boolean;
  error?: string;
  message?: string;
}

const changeSchema = z.object({
  orderId: z.string().min(1),
  status: z.enum([
    "yeni",
    "onaylandi",
    "hazirlaniyor",
    "teslime_hazir",
    "teslim_edildi",
    "iptal",
  ]),
  note: z.string().trim().max(500).optional(),
});

export async function changeOrderStatus(
  orderId: string,
  status: OrderStatus,
  note?: string,
): Promise<AdminResult> {
  const session = await requireAdmin();

  const parsed = changeSchema.safeParse({ orderId, status, note });
  if (!parsed.success) return { ok: false, error: "Geçersiz istek." };

  try {
    await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: parsed.data.orderId },
        select: {
          id: true,
          orderNo: true,
          status: true,
          items: { select: { variantId: true, quantity: true, productName: true } },
        },
      });

      if (!order) throw new Error("BULUNAMADI");
      if (order.status === parsed.data.status) throw new Error("AYNI");

      const [reservedDelta, stockDelta] = stockDeltaFor(
        effectOf(order.status),
        effectOf(parsed.data.status),
      );

      for (const item of order.items) {
        if (!item.variantId) continue; // varyant silinmişse stok oynatamayız

        if (reservedDelta !== 0 || stockDelta !== 0) {
          await tx.variant.update({
            where: { id: item.variantId },
            data: {
              ...(reservedDelta !== 0
                ? { reserved: { increment: reservedDelta * item.quantity } }
                : {}),
              ...(stockDelta !== 0
                ? { stock: { increment: stockDelta * item.quantity } }
                : {}),
            },
          });
        }

        // Fiziksel stok hareketi izlenmeli; rezervasyon değişimi hareket değil
        if (stockDelta !== 0) {
          await tx.stockMovement.create({
            data: {
              variantId: item.variantId,
              delta: stockDelta * item.quantity,
              reason: parsed.data.status === "teslim_edildi" ? "satis" : "iptal",
              orderId: order.id,
              userId: session.userId,
              note: `${order.orderNo} · ${parsed.data.status}`,
            },
          });
        }
      }

      await tx.order.update({
        where: { id: order.id },
        data: { status: parsed.data.status },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          fromStatus: order.status,
          toStatus: parsed.data.status,
          userId: session.userId,
          note: parsed.data.note || null,
        },
      });
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "BULUNAMADI") return { ok: false, error: "Sipariş bulunamadı." };
    if (message === "AYNI") return { ok: false, error: "Sipariş zaten bu durumda." };

    console.error("Sipariş durumu değiştirilemedi:", error);
    return { ok: false, error: "Durum değiştirilemedi." };
  }

  revalidatePath("/panel/siparisler");
  revalidatePath(`/panel/siparisler/${orderId}`);
  revalidatePath("/panel");

  return {
    ok: true,
    message: `Durum "${orderStatusLabel(status)}" olarak güncellendi.`,
  };
}

export async function saveOrderNote(
  orderId: string,
  note: string,
): Promise<AdminResult> {
  await requireAdmin();

  if (note.length > 2000) return { ok: false, error: "Not çok uzun." };

  await prisma.order.update({
    where: { id: orderId },
    data: { adminNote: note.trim() || null },
  });

  revalidatePath(`/panel/siparisler/${orderId}`);
  return { ok: true, message: "Not kaydedildi." };
}
