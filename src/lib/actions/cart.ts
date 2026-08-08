"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { readCartCookie, writeCartCookie } from "@/lib/shop/cart";

export interface CartResult {
  ok: boolean;
  error?: string;
  message?: string;
}

const addSchema = z.object({
  variantId: z.string().min(1),
  quantity: z.number().int().min(1).max(999),
});

export async function addToCart(
  variantId: string,
  quantity: number,
): Promise<CartResult> {
  const parsed = addSchema.safeParse({ variantId, quantity });
  if (!parsed.success) return { ok: false, error: "Geçersiz istek." };

  const variant = await prisma.variant.findUnique({
    where: { id: parsed.data.variantId },
    select: {
      stock: true,
      reserved: true,
      isActive: true,
      product: { select: { name: true, isActive: true } },
    },
  });

  if (!variant || !variant.isActive || !variant.product.isActive) {
    return { ok: false, error: "Bu ürün artık satışta değil." };
  }

  const available = Math.max(0, variant.stock - variant.reserved);
  if (available <= 0) return { ok: false, error: "Bu seçenek tükendi." };

  const lines = await readCartCookie();
  const existing = lines.find((line) => line.variantId === parsed.data.variantId);
  const wanted = (existing?.quantity ?? 0) + parsed.data.quantity;

  // Sepette zaten varsa üstüne ekliyoruz ama stoğu aşamayız
  const capped = Math.min(wanted, available);

  if (existing) existing.quantity = capped;
  else lines.push({ variantId: parsed.data.variantId, quantity: capped });

  await writeCartCookie(lines);
  revalidatePath("/sepet");

  return {
    ok: true,
    message:
      capped < wanted
        ? `Stok ${available} düzine olduğu için adet sınırlandı.`
        : "Ürün sepete eklendi.",
  };
}

export async function updateCartLine(
  variantId: string,
  quantity: number,
): Promise<CartResult> {
  const lines = await readCartCookie();

  if (quantity <= 0) {
    await writeCartCookie(lines.filter((line) => line.variantId !== variantId));
    revalidatePath("/sepet");
    return { ok: true };
  }

  const variant = await prisma.variant.findUnique({
    where: { id: variantId },
    select: { stock: true, reserved: true },
  });
  const available = variant ? Math.max(0, variant.stock - variant.reserved) : 0;
  const capped = Math.min(Math.max(1, Math.floor(quantity)), available);

  if (capped <= 0) {
    await writeCartCookie(lines.filter((line) => line.variantId !== variantId));
    revalidatePath("/sepet");
    return { ok: false, error: "Bu seçenek tükendi, sepetten çıkarıldı." };
  }

  const line = lines.find((item) => item.variantId === variantId);
  if (line) line.quantity = capped;

  await writeCartCookie(lines);
  revalidatePath("/sepet");

  return {
    ok: true,
    error: capped < quantity ? `Stok en fazla ${available} düzine.` : undefined,
  };
}

export async function removeCartLine(variantId: string): Promise<CartResult> {
  const lines = await readCartCookie();
  await writeCartCookie(lines.filter((line) => line.variantId !== variantId));
  revalidatePath("/sepet");
  return { ok: true };
}

export async function clearCart(): Promise<CartResult> {
  await writeCartCookie([]);
  revalidatePath("/sepet");
  return { ok: true };
}
