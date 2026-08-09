"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import {
  createCustomerSession,
  destroyCustomerSession,
  hashPassword,
  verifyPassword,
} from "@/lib/auth";
import { normalizePhone } from "@/lib/phone";
import { prisma } from "@/lib/prisma";

export interface AuthState {
  error?: string;
  info?: string;
}

const loginSchema = z.object({
  phone: z.string().trim().min(1, "Telefon gerekli"),
  password: z.string().min(1, "Parola gerekli"),
});

export async function dealerLogin(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = loginSchema.safeParse({
    phone: formData.get("phone") ?? "",
    password: formData.get("password") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Bilgileri kontrol edin." };
  }

  const phone = normalizePhone(parsed.data.phone);
  if (!phone) {
    return { error: "Telefon numarasını 05xx xxx xx xx biçiminde girin." };
  }

  const customer = await prisma.customer.findUnique({
    where: { phone },
    select: { id: true, fullName: true, passwordHash: true, status: true },
  });

  // Kullanıcı yoksa da karşılaştırma yapıyoruz: yanıt süresinden
  // "bu numara kayıtlı mı" bilgisi sızmasın.
  const hash =
    customer?.passwordHash ??
    "$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidiu";
  const ok = await verifyPassword(parsed.data.password, hash);

  if (!customer || !customer.passwordHash || !ok) {
    return { error: "Telefon veya parola hatalı." };
  }

  if (customer.status === "onay_bekliyor") {
    return {
      error:
        "Bayi başvurunuz henüz onaylanmadı. Onaylandığında sizi arayacağız.",
    };
  }
  if (customer.status === "pasif") {
    return { error: "Hesabınız kapalı. Lütfen bizimle iletişime geçin." };
  }

  await createCustomerSession({
    customerId: customer.id,
    fullName: customer.fullName,
  });

  redirect("/hesabim");
}

const registerSchema = z.object({
  fullName: z.string().trim().min(3, "Ad soyad en az 3 karakter olmalı").max(120),
  phone: z.string().trim().min(1, "Telefon gerekli"),
  email: z.union([z.string().trim().email("Geçerli bir e-posta girin"), z.literal("")]),
  companyName: z.string().trim().min(2, "Firma adı gerekli").max(160),
  taxNo: z.string().trim().max(40),
  password: z.string().min(8, "Parola en az 8 karakter olmalı").max(200),
  note: z.string().trim().max(500),
});

export async function dealerRegister(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = registerSchema.safeParse({
    fullName: formData.get("fullName") ?? "",
    phone: formData.get("phone") ?? "",
    email: formData.get("email") ?? "",
    companyName: formData.get("companyName") ?? "",
    taxNo: formData.get("taxNo") ?? "",
    password: formData.get("password") ?? "",
    note: formData.get("note") ?? "",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Bilgileri kontrol edin." };
  }

  const phone = normalizePhone(parsed.data.phone);
  if (!phone) {
    return { error: "Telefon numarasını 05xx xxx xx xx biçiminde girin." };
  }

  const existing = await prisma.customer.findUnique({
    where: { phone },
    select: { id: true, passwordHash: true, status: true },
  });

  // Bu numaradan daha önce üyeliksiz sipariş verilmiş olabilir; o kaydı
  // yeni kayıt açmak yerine bayi başvurusuna dönüştürüyoruz.
  if (existing?.passwordHash) {
    return {
      error: "Bu numarayla zaten bir hesap var. Giriş yapmayı deneyin.",
    };
  }

  const passwordHash = await hashPassword(parsed.data.password);

  const data = {
    fullName: parsed.data.fullName,
    email: parsed.data.email || null,
    companyName: parsed.data.companyName,
    taxNo: parsed.data.taxNo || null,
    passwordHash,
    type: "bayi" as const,
    // Onay şart: kendiliğinden aktifleşse herkes bayi fiyatı görürdü
    status: "onay_bekliyor" as const,
    note: parsed.data.note || null,
  };

  const customer = existing
    ? await prisma.customer.update({ where: { id: existing.id }, data })
    : await prisma.customer.create({ data: { ...data, phone } });

  await prisma.notification.create({
    data: {
      type: "bayi_basvurusu",
      title: "Yeni bayi başvurusu",
      body: `${parsed.data.companyName} · ${parsed.data.fullName}`,
      link: `/panel/musteriler/${customer.id}`,
    },
  });

  redirect("/bayi-basvurusu?durum=alindi");
}

export async function dealerLogout() {
  await destroyCustomerSession();
  redirect("/");
}
