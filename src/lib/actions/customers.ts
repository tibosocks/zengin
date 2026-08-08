"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { CustomerStatus } from "@/generated/prisma/client";
import { requireAdmin } from "@/lib/auth";
import { kurusToDecimalString, toBasisPoints } from "@/lib/price";
import { prisma } from "@/lib/prisma";

export interface CustomerResult {
  ok: boolean;
  error?: string;
  message?: string;
}

// Yüzde ondalıklı olabilir (%17,5) ve virgülle de girilebilir.
const percentText = z
  .string()
  .trim()
  .refine((value) => /^\d{1,3}([.,]\d{1,2})?$/.test(value), {
    message: "Yüzde 0–100 arası bir sayı olmalı (örn. 17 veya 17,5)",
  });

/**
 * Müşterinin iskonto yüzdesini değiştirir.
 *
 * Elle girilen bir değer olduğu için her değişiklik denetim kaydına yazılıyor:
 * yanlış bir yüzde girildiğinde kimin ne zaman değiştirdiği görülebilmeli.
 */
export async function updateDiscount(
  customerId: string,
  percent: string,
  note?: string,
): Promise<CustomerResult> {
  const session = await requireAdmin();

  const parsed = percentText.safeParse(percent);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message };
  }

  const value = Number(parsed.data.replace(",", "."));
  if (!Number.isFinite(value) || value < 0 || value > 100) {
    return { ok: false, error: "Yüzde 0 ile 100 arasında olmalı." };
  }

  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { discountPercent: true },
  });
  if (!customer) return { ok: false, error: "Müşteri bulunamadı." };

  const fromBp = toBasisPoints(customer.discountPercent);
  const toBp = Math.round(value * 100);
  if (fromBp === toBp) return { ok: true, message: "Değişiklik yok." };

  await prisma.$transaction([
    prisma.customer.update({
      where: { id: customerId },
      data: { discountPercent: kurusToDecimalString(toBp) },
    }),
    prisma.discountChangeLog.create({
      data: {
        customerId,
        fromValue: kurusToDecimalString(fromBp),
        toValue: kurusToDecimalString(toBp),
        userId: session.userId,
        note: note?.trim() || null,
      },
    }),
  ]);

  revalidatePath("/panel/musteriler");
  revalidatePath(`/panel/musteriler/${customerId}`);

  return { ok: true, message: `İskonto %${value} olarak güncellendi.` };
}

const statusSchema = z.enum(["aktif", "onay_bekliyor", "pasif"]);

export async function updateCustomerStatus(
  customerId: string,
  status: CustomerStatus,
): Promise<CustomerResult> {
  await requireAdmin();

  if (!statusSchema.safeParse(status).success) {
    return { ok: false, error: "Geçersiz durum." };
  }

  await prisma.customer.update({
    where: { id: customerId },
    data: { status },
  });

  revalidatePath("/panel/musteriler");
  revalidatePath(`/panel/musteriler/${customerId}`);
  return { ok: true, message: "Durum güncellendi." };
}

/** Bayi başvurusunu onaylar ve aynı adımda iskontosunu belirler. */
export async function approveDealer(
  customerId: string,
  percent: string,
): Promise<CustomerResult> {
  const session = await requireAdmin();

  const parsed = percentText.safeParse(percent);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message };
  }

  const value = Number(parsed.data.replace(",", "."));
  if (value < 0 || value > 100) {
    return { ok: false, error: "Yüzde 0 ile 100 arasında olmalı." };
  }

  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { status: true, discountPercent: true },
  });
  if (!customer) return { ok: false, error: "Müşteri bulunamadı." };
  if (customer.status !== "onay_bekliyor") {
    return { ok: false, error: "Bu müşteri zaten onaylanmış." };
  }

  const toBp = Math.round(value * 100);

  await prisma.$transaction([
    prisma.customer.update({
      where: { id: customerId },
      data: { status: "aktif", type: "bayi", discountPercent: kurusToDecimalString(toBp) },
    }),
    prisma.discountChangeLog.create({
      data: {
        customerId,
        fromValue: kurusToDecimalString(toBasisPoints(customer.discountPercent)),
        toValue: kurusToDecimalString(toBp),
        userId: session.userId,
        note: "Bayi başvurusu onaylandı",
      },
    }),
  ]);

  revalidatePath("/panel/musteriler");
  revalidatePath(`/panel/musteriler/${customerId}`);
  revalidatePath("/panel");

  return { ok: true, message: `Bayi onaylandı, iskonto %${value}.` };
}

export async function saveCustomerNote(
  customerId: string,
  note: string,
): Promise<CustomerResult> {
  await requireAdmin();

  await prisma.customer.update({
    where: { id: customerId },
    data: { note: note.trim() || null },
  });

  revalidatePath(`/panel/musteriler/${customerId}`);
  return { ok: true, message: "Not kaydedildi." };
}
