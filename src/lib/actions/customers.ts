"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { CustomerStatus } from "@/generated/prisma/client";
import { hashPassword, requireAdmin } from "@/lib/auth";
import { normalizePhone } from "@/lib/phone";
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

const newCustomerSchema = z.object({
  fullName: z.string().trim().min(1, "Ad soyad gerekli").max(160),
  phone: z.string().trim().min(1, "Telefon gerekli"),
  email: z
    .string()
    .trim()
    .max(200)
    .refine((v) => v === "" || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v), {
      message: "E-posta adresi geçersiz",
    })
    .optional(),
  companyName: z.string().trim().max(200).optional(),
  taxNo: z.string().trim().max(40).optional(),
  type: z.enum(["bireysel", "bayi"]).default("bireysel"),
  discountPercent: percentText.optional(),
  note: z.string().trim().max(1000).optional(),
  password: z
    .string()
    .max(200)
    .refine((v) => v === "" || v.length >= 8, {
      message: "Parola en az 8 karakter olmalı",
    })
    .optional(),
});

/**
 * Panelden elle müşteri açar.
 *
 * Bayi başvurusundan farkı: yönetici açtığı için onay kuyruğuna girmiyor,
 * doğrudan `aktif` oluyor.
 *
 * Parola isteğe bağlı. Verilmezse müşteri `/bayi-girisi`'ne giremez —
 * sonradan müşteri kartından `setCustomerPassword` ile konabilir.
 */
export async function createCustomer(
  formData: FormData,
): Promise<CustomerResult & { customerId?: string }> {
  const session = await requireAdmin();

  const parsed = newCustomerSchema.safeParse({
    fullName: formData.get("fullName") ?? "",
    phone: formData.get("phone") ?? "",
    email: (formData.get("email") as string) || undefined,
    companyName: (formData.get("companyName") as string) || undefined,
    taxNo: (formData.get("taxNo") as string) || undefined,
    type: (formData.get("type") as string) || "bireysel",
    discountPercent: (formData.get("discountPercent") as string) || undefined,
    note: (formData.get("note") as string) || undefined,
    password: (formData.get("password") as string) || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message };
  }
  const data = parsed.data;

  const phone = normalizePhone(data.phone);
  if (!phone) {
    return {
      ok: false,
      error: "Telefon 5 ile başlayan 10 haneli cep numarası olmalı (örn. 0532 111 22 33).",
    };
  }

  // Telefon benzersiz: aynı numara zaten varsa yeni kayıt açmak yerine
  // mevcut kayda yönlendiriyoruz, yoksa aynı kişi ikiye bölünür.
  const existing = await prisma.customer.findUnique({
    where: { phone },
    select: { id: true, fullName: true },
  });
  if (existing) {
    return {
      ok: false,
      error: `Bu telefon zaten "${existing.fullName}" kaydında kayıtlı.`,
      customerId: existing.id,
    };
  }

  if (data.email) {
    const emailOwner = await prisma.customer.findUnique({
      where: { email: data.email },
      select: { fullName: true },
    });
    if (emailOwner) {
      return {
        ok: false,
        error: `Bu e-posta zaten "${emailOwner.fullName}" kaydında kayıtlı.`,
      };
    }
  }

  const percent = data.discountPercent
    ? Number(data.discountPercent.replace(",", "."))
    : 0;
  if (percent < 0 || percent > 100) {
    return { ok: false, error: "İskonto 0 ile 100 arasında olmalı." };
  }
  const percentBp = Math.round(percent * 100);

  const customer = await prisma.customer.create({
    data: {
      fullName: data.fullName,
      phone,
      email: data.email || null,
      companyName: data.companyName || null,
      taxNo: data.taxNo || null,
      type: data.type,
      status: "aktif",
      discountPercent: kurusToDecimalString(percentBp),
      note: data.note || null,
      passwordHash: data.password ? await hashPassword(data.password) : null,
    },
  });

  // İskontolu açıldıysa denetim kaydına da yazıyoruz; updateDiscount ile
  // aynı gerekçe — yüzdenin nereden geldiği her zaman izlenebilmeli.
  if (percentBp > 0) {
    await prisma.discountChangeLog.create({
      data: {
        customerId: customer.id,
        fromValue: "0.00",
        toValue: kurusToDecimalString(percentBp),
        userId: session.userId,
        note: "Panelden müşteri oluşturuldu",
      },
    });
  }

  revalidatePath("/panel/musteriler");

  return {
    ok: true,
    message: `"${customer.fullName}" oluşturuldu.`,
    customerId: customer.id,
  };
}

/**
 * Müşteriye panelden parola belirler (veya var olanı sıfırlar).
 *
 * Panelden açılan müşterinin parolası olmuyor, `/bayi-girisi`'ne giremiyor.
 * Tek alternatif müşterinin `/bayi-basvurusu`'ndan kendi kaydolması ama o
 * akış kaydı `onay_bekliyor`'a düşürüp yöneticinin verdiği aktifliği geri
 * alıyor. Bu yüzden parolayı yönetici koyabilmeli.
 *
 * Parola hiçbir yere düz metin yazılmıyor — denetim kaydına da sadece
 * "parola belirlendi" bilgisi düşüyor.
 */
export async function setCustomerPassword(
  customerId: string,
  password: string,
): Promise<CustomerResult> {
  await requireAdmin();

  if (typeof password !== "string" || password.length < 8) {
    return { ok: false, error: "Parola en az 8 karakter olmalı." };
  }
  if (password.length > 200) {
    return { ok: false, error: "Parola çok uzun." };
  }

  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { id: true, status: true },
  });
  if (!customer) return { ok: false, error: "Müşteri bulunamadı." };

  await prisma.customer.update({
    where: { id: customerId },
    data: { passwordHash: await hashPassword(password) },
  });

  revalidatePath(`/panel/musteriler/${customerId}`);

  return {
    ok: true,
    message:
      customer.status === "aktif"
        ? "Parola belirlendi. Müşteri telefonu ve bu parolayla giriş yapabilir."
        : "Parola belirlendi. Hesap aktif olmadığı için müşteri henüz giriş yapamaz.",
  };
}
