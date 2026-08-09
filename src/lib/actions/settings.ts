"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { hashPassword, requireAdmin, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export interface SettingsResult {
  ok: boolean;
  error?: string;
  message?: string;
}

// Ayarlar anahtar-değer olarak saklanıyor; tip doğrulaması burada.
const SETTING_RULES: Record<string, z.ZodType<string>> = {
  siteTitle: z.string().trim().max(120),
  siteDescription: z.string().trim().max(300),
  whatsappNumber: z
    .string()
    .trim()
    .refine((v) => v === "" || /^\d{10,15}$/.test(v.replace(/\D/g, "")), {
      message: "WhatsApp numarası sadece rakam olmalı (ör. 905321112233)",
    }),
  contactPhone: z.string().trim().max(40),
  contactAddress: z.string().trim().max(400),
  defaultVatRate: z
    .string()
    .trim()
    .refine((v) => /^\d{1,2}([.,]\d{1,2})?$/.test(v), {
      message: "KDV oranı 0–99 arası bir sayı olmalı",
    }),
  showPricesToGuests: z.enum(["true", "false"]),
  newDealerDefaultDiscount: z
    .string()
    .trim()
    .refine((v) => /^\d{1,3}([.,]\d{1,2})?$/.test(v) && Number(v.replace(",", ".")) <= 100, {
      message: "Varsayılan iskonto 0–100 arası olmalı",
    }),
  orderNotificationEmails: z
    .string()
    .trim()
    .refine(
      (v) =>
        v === "" ||
        v
          .split(/[,;\n]/)
          .map((e) => e.trim())
          .filter(Boolean)
          .every((e) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)),
      { message: "Geçersiz e-posta adresi var (virgülle ayırın)" },
    ),
  lowStockThreshold: z
    .string()
    .trim()
    .refine((v) => /^\d{1,5}$/.test(v), { message: "Kritik stok tam sayı olmalı" }),
  pendingOrderWarningDays: z
    .string()
    .trim()
    .refine((v) => /^\d{1,3}$/.test(v), { message: "Gün sayısı tam sayı olmalı" }),
};

export async function saveSettings(formData: FormData): Promise<SettingsResult> {
  const session = await requireAdmin();

  // Ayarları herkes değiştirmemeli; depo rolü sadece stok/sipariş işleri yapar
  if (session.role === "depo") {
    return { ok: false, error: "Bu işlem için yetkiniz yok." };
  }

  const updates: Array<{ key: string; value: string }> = [];

  for (const [key, rule] of Object.entries(SETTING_RULES)) {
    const raw = formData.get(key);
    if (raw === null) continue;

    // Onay kutuları gönderilmediğinde "false" olarak yorumlanmalı
    const value = typeof raw === "string" ? raw : "";
    const parsed = rule.safeParse(value);

    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message };
    }
    updates.push({ key, value: parsed.data });
  }

  await prisma.$transaction(
    updates.map((item) =>
      prisma.setting.upsert({
        where: { key: item.key },
        update: { value: item.value },
        create: { key: item.key, value: item.value },
      }),
    ),
  );

  // Vitrin fiyat görünürlüğü ve WhatsApp numarası her sayfada okunuyor
  revalidatePath("/", "layout");
  revalidatePath("/panel/ayarlar");

  return { ok: true, message: "Ayarlar kaydedildi." };
}

const passwordSchema = z
  .object({
    current: z.string().min(1, "Mevcut parola gerekli"),
    next: z.string().min(8, "Yeni parola en az 8 karakter olmalı").max(200),
    confirm: z.string(),
  })
  .refine((data) => data.next === data.confirm, {
    message: "Yeni parolalar eşleşmiyor",
  });

export async function changeAdminPassword(
  formData: FormData,
): Promise<SettingsResult> {
  const session = await requireAdmin();

  const parsed = passwordSchema.safeParse({
    current: formData.get("current") ?? "",
    next: formData.get("next") ?? "",
    confirm: formData.get("confirm") ?? "",
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message };
  }

  const user = await prisma.adminUser.findUnique({
    where: { id: session.userId },
    select: { passwordHash: true },
  });
  if (!user) return { ok: false, error: "Kullanıcı bulunamadı." };

  // Mevcut parolayı doğrulamak şart: açık kalmış bir oturumu ele geçiren
  // biri parolayı değiştirip hesabı tamamen devralmasın.
  if (!(await verifyPassword(parsed.data.current, user.passwordHash))) {
    return { ok: false, error: "Mevcut parola hatalı." };
  }

  if (parsed.data.current === parsed.data.next) {
    return { ok: false, error: "Yeni parola eskisiyle aynı olamaz." };
  }

  await prisma.adminUser.update({
    where: { id: session.userId },
    data: { passwordHash: await hashPassword(parsed.data.next) },
  });

  return { ok: true, message: "Parolanız değiştirildi." };
}
