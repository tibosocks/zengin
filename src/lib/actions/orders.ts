"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getCustomerSession } from "@/lib/auth";
import { kurusToDecimalString, toBasisPoints, toKurus } from "@/lib/price";
import { prisma } from "@/lib/prisma";
import { calculatePrice } from "@/lib/price";
import { readCartCookie, writeCartCookie } from "@/lib/shop/cart";
import { getViewerDiscount } from "@/lib/shop/catalog";

export interface CheckoutState {
  error?: string;
  fieldErrors?: Record<string, string>;
}

// Türkiye cep telefonu: 05xx xxx xx xx veya +90 5xx…
// Rakam dışını atıp 10 haneye indiriyoruz (başındaki 0 / 90 çıkar).
function normalizePhone(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  const trimmed = digits.startsWith("90")
    ? digits.slice(2)
    : digits.startsWith("0")
      ? digits.slice(1)
      : digits;

  return /^5\d{9}$/.test(trimmed) ? trimmed : null;
}

const checkoutSchema = z.object({
  fullName: z.string().trim().min(3, "Ad soyad en az 3 karakter olmalı").max(120),
  phone: z.string().trim().min(1, "Telefon gerekli"),
  email: z.union([z.string().trim().email("Geçerli bir e-posta girin"), z.literal("")]),
  companyName: z.string().trim().max(160),
  taxNo: z.string().trim().max(40),
  note: z.string().trim().max(1000),
});

/** ZG-2026-0001 — yıl içinde artan sıra. */
async function nextOrderNo(): Promise<string> {
  const prefixSetting = await prisma.setting.findUnique({
    where: { key: "orderPrefix" },
  });
  const prefix = prefixSetting?.value || "ZG";
  const year = new Date().getFullYear();
  const stem = `${prefix}-${year}-`;

  const last = await prisma.order.findFirst({
    where: { orderNo: { startsWith: stem } },
    orderBy: { orderNo: "desc" },
    select: { orderNo: true },
  });

  const lastNumber = last ? Number(last.orderNo.slice(stem.length)) || 0 : 0;
  return `${stem}${String(lastNumber + 1).padStart(4, "0")}`;
}

export async function placeOrder(
  _prev: CheckoutState,
  formData: FormData,
): Promise<CheckoutState> {
  const parsed = checkoutSchema.safeParse({
    fullName: formData.get("fullName") ?? "",
    phone: formData.get("phone") ?? "",
    email: formData.get("email") ?? "",
    companyName: formData.get("companyName") ?? "",
    taxNo: formData.get("taxNo") ?? "",
    note: formData.get("note") ?? "",
  });

  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return {
      error: first?.message ?? "Bilgileri kontrol edin.",
      fieldErrors: { [String(first?.path[0] ?? "")]: first?.message ?? "" },
    };
  }

  const phone = normalizePhone(parsed.data.phone);
  if (!phone) {
    return {
      error: "Telefon numarasını 05xx xxx xx xx biçiminde girin.",
      fieldErrors: { phone: "Geçerli bir cep telefonu girin" },
    };
  }

  const lines = await readCartCookie();
  if (lines.length === 0) return { error: "Sepetiniz boş." };

  const session = await getCustomerSession();
  const { discountPercent } = await getViewerDiscount(session?.customerId);

  let orderNo: string;

  try {
    orderNo = await prisma.$transaction(async (tx) => {
      // Stok kontrolü ve rezervasyon aynı işlemde olmalı; arada başka bir
      // sipariş girerse son stoğu iki kişiye satmış oluruz.
      const variants = await tx.variant.findMany({
        where: { id: { in: lines.map((line) => line.variantId) } },
        select: {
          id: true,
          sku: true,
          price: true,
          vatRate: true,
          stock: true,
          reserved: true,
          isActive: true,
          optionValues: { select: { optionValue: { select: { value: true } } } },
          product: { select: { name: true, isActive: true } },
        },
      });

      const byId = new Map(variants.map((variant) => [variant.id, variant]));

      const items: Array<{
        variantId: string;
        productName: string;
        sku: string | null;
        optionsText: string | null;
        listPrice: number;
        unitPrice: number;
        vatRateBp: number;
        quantity: number;
        lineTotal: number;
        lineVat: number;
      }> = [];

      for (const line of lines) {
        const variant = byId.get(line.variantId);
        if (!variant || !variant.isActive || !variant.product.isActive) {
          throw new Error("SATILMIYOR");
        }

        const available = variant.stock - variant.reserved;
        if (available < line.quantity) {
          throw new Error(
            `STOK:${variant.product.name}:${Math.max(0, available)}`,
          );
        }

        const price = calculatePrice({
          listPrice: toKurus(variant.price),
          discountPercent,
          vatRate: variant.vatRate,
        });

        items.push({
          variantId: variant.id,
          productName: variant.product.name,
          sku: variant.sku,
          optionsText:
            variant.optionValues.map((row) => row.optionValue.value).join(" / ") ||
            null,
          listPrice: price.listNet,
          unitPrice: price.net,
          vatRateBp: toBasisPoints(variant.vatRate),
          quantity: line.quantity,
          lineTotal: price.net * line.quantity,
          lineVat: price.vat * line.quantity,
        });
      }

      // --- müşteri ---------------------------------------------------
      // Telefon benzersiz: aynı numaradan tekrar sipariş gelirse mevcut
      // müşteriye bağlanıyor, yeni kayıt açılmıyor.
      const customer = await tx.customer.upsert({
        where: { phone },
        update: {
          fullName: parsed.data.fullName,
          ...(parsed.data.email ? { email: parsed.data.email } : {}),
          ...(parsed.data.companyName ? { companyName: parsed.data.companyName } : {}),
          ...(parsed.data.taxNo ? { taxNo: parsed.data.taxNo } : {}),
        },
        create: {
          fullName: parsed.data.fullName,
          phone,
          email: parsed.data.email || null,
          companyName: parsed.data.companyName || null,
          taxNo: parsed.data.taxNo || null,
        },
        select: { id: true },
      });

      const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
      const vatTotal = items.reduce((sum, item) => sum + item.lineVat, 0);
      const discount = items.reduce(
        (sum, item) => sum + (item.listPrice - item.unitPrice) * item.quantity,
        0,
      );

      const no = await nextOrderNo();

      // Rezervasyon 7 gün sonra "bekleyen sipariş" uyarısına düşsün
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const order = await tx.order.create({
        data: {
          orderNo: no,
          customerId: customer.id,
          status: "yeni",
          channel: "web",
          discountPercent: kurusToDecimalString(
            Math.round(discountPercent * 100),
          ),
          subtotal: kurusToDecimalString(subtotal),
          vatTotal: kurusToDecimalString(vatTotal),
          discount: kurusToDecimalString(discount),
          grandTotal: kurusToDecimalString(subtotal + vatTotal),
          customerNote: parsed.data.note || null,
          expiresAt,
          items: {
            create: items.map((item) => ({
              variantId: item.variantId,
              productName: item.productName,
              sku: item.sku,
              optionsText: item.optionsText,
              listPrice: kurusToDecimalString(item.listPrice),
              unitPrice: kurusToDecimalString(item.unitPrice),
              vatRate: kurusToDecimalString(item.vatRateBp),
              quantity: item.quantity,
              lineTotal: kurusToDecimalString(item.lineTotal),
            })),
          },
          statusHistory: {
            create: { toStatus: "yeni", note: "Web sitesinden oluşturuldu" },
          },
        },
        select: { id: true, orderNo: true },
      });

      // Rezervasyon: fiziksel stok değişmiyor, satılabilir adet düşüyor.
      // Ödeme peşin alınmadığı için stoğu şimdi düşmek yanlış olurdu.
      for (const item of items) {
        await tx.variant.update({
          where: { id: item.variantId },
          data: { reserved: { increment: item.quantity } },
        });
      }

      await tx.notification.create({
        data: {
          type: "yeni_siparis",
          title: `Yeni sipariş ${order.orderNo}`,
          body: `${parsed.data.fullName} · ${items.length} kalem`,
          link: `/panel/siparisler/${order.id}`,
        },
      });

      return order.orderNo;
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";

    if (message === "SATILMIYOR") {
      return {
        error:
          "Sepetinizdeki bir ürün artık satışta değil. Sepeti gözden geçirin.",
      };
    }
    if (message.startsWith("STOK:")) {
      const [, name, left] = message.split(":");
      return {
        error:
          Number(left) > 0
            ? `"${name}" için stok ${left} düzineye düştü. Sepetteki adedi güncelleyin.`
            : `"${name}" tükendi. Sepetten çıkarın.`,
      };
    }

    console.error("Sipariş oluşturma hatası:", error);
    return { error: "Sipariş oluşturulamadı. Lütfen tekrar deneyin." };
  }

  await writeCartCookie([]);
  revalidatePath("/panel");
  revalidatePath("/sepet");

  // redirect() hata fırlatarak çalışır; try/catch dışında olmalı yoksa
  // yönlendirme "sipariş oluşturulamadı" hatası gibi yakalanır.
  redirect(`/siparis-alindi?no=${encodeURIComponent(orderNo)}`);
}
