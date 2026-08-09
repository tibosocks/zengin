"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export interface NotificationResult {
  ok: boolean;
  error?: string;
  count?: number;
}

export async function markNotificationRead(
  id: string,
): Promise<NotificationResult> {
  await requireAdmin();

  await prisma.notification.updateMany({
    // Zaten okunmuşsa tarihini ezmiyoruz
    where: { id, readAt: null },
    data: { readAt: new Date() },
  });

  revalidatePath("/panel/bildirimler");
  revalidatePath("/panel");
  return { ok: true };
}

export async function markAllNotificationsRead(): Promise<NotificationResult> {
  await requireAdmin();

  const result = await prisma.notification.updateMany({
    where: { readAt: null },
    data: { readAt: new Date() },
  });

  revalidatePath("/panel/bildirimler");
  revalidatePath("/panel");
  return { ok: true, count: result.count };
}

/**
 * 30 günden eski okunmuş bildirimleri siler.
 *
 * Bildirim tablosu her siparişte büyüyor ve okunmuş eski kayıtların
 * saklanmasının bir faydası yok — sipariş ve durum geçmişi zaten ayrı
 * tablolarda tutuluyor.
 */
export async function pruneOldNotifications(): Promise<NotificationResult> {
  await requireAdmin();

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);

  const result = await prisma.notification.deleteMany({
    where: { readAt: { not: null, lt: cutoff } },
  });

  revalidatePath("/panel/bildirimler");
  return { ok: true, count: result.count };
}
