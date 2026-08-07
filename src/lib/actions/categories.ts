"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { slugify, uniqueSlug } from "@/lib/slug";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

const categorySchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "Kategori adı gerekli").max(120),
  slug: z.string().trim().max(160).optional(),
  parentId: z.string().nullable().optional(),
  imageUrl: z.string().trim().max(500).optional(),
  isActive: z.boolean().default(true),
  showInMenu: z.boolean().default(true),
  metaTitle: z.string().trim().max(200).optional(),
  metaDescription: z.string().trim().max(400).optional(),
});

function readForm(formData: FormData) {
  const rawParent = formData.get("parentId");
  return categorySchema.safeParse({
    id: (formData.get("id") as string) || undefined,
    // null geçilirse zod tip hatası verip kendi Türkçe mesajımızı atlıyor
    name: formData.get("name") ?? "",
    slug: (formData.get("slug") as string) || undefined,
    parentId: !rawParent || rawParent === "" ? null : (rawParent as string),
    imageUrl: (formData.get("imageUrl") as string) || undefined,
    isActive: formData.get("isActive") === "on",
    showInMenu: formData.get("showInMenu") === "on",
    metaTitle: (formData.get("metaTitle") as string) || undefined,
    metaDescription: (formData.get("metaDescription") as string) || undefined,
  });
}

/**
 * Bir kategorinin kendi alt ağacına taşınmasını engeller.
 * Bu kontrol olmazsa parent zinciri döngüye girer ve ağacı çizen her sorgu
 * sonsuz döngüye düşer.
 */
async function wouldCreateCycle(
  categoryId: string,
  newParentId: string | null,
): Promise<boolean> {
  if (!newParentId) return false;
  if (newParentId === categoryId) return true;

  let cursor: string | null = newParentId;
  // Derinlik sınırı: bozuk veri varsa da döngüde kalmayalım
  for (let depth = 0; depth < 50 && cursor; depth += 1) {
    const parent: { parentId: string | null } | null =
      await prisma.category.findUnique({
        where: { id: cursor },
        select: { parentId: true },
      });
    if (!parent) return false;
    if (parent.parentId === categoryId) return true;
    cursor = parent.parentId;
  }
  return false;
}

export async function saveCategory(formData: FormData): Promise<ActionResult> {
  await requireAdmin();

  const parsed = readForm(formData);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message };
  }
  const data = parsed.data;

  if (data.id && (await wouldCreateCycle(data.id, data.parentId ?? null))) {
    return {
      ok: false,
      error: "Bir kategori kendi alt kategorisinin altına taşınamaz.",
    };
  }

  const slugBase = data.slug?.trim() || data.name;
  const slug = await uniqueSlug(slugBase, async (candidate) => {
    const found = await prisma.category.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    return found !== null && found.id !== data.id;
  });

  const payload = {
    name: data.name,
    slug,
    parentId: data.parentId ?? null,
    imageUrl: data.imageUrl || null,
    isActive: data.isActive,
    showInMenu: data.showInMenu,
    metaTitle: data.metaTitle || null,
    metaDescription: data.metaDescription || null,
  };

  if (data.id) {
    await prisma.category.update({ where: { id: data.id }, data: payload });
  } else {
    // Yeni kategori kardeşlerinin sonuna eklenir
    const last = await prisma.category.findFirst({
      where: { parentId: payload.parentId },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });
    await prisma.category.create({
      data: { ...payload, sortOrder: (last?.sortOrder ?? -1) + 1 },
    });
  }

  revalidatePath("/panel/kategoriler");
  return { ok: true };
}

export async function deleteCategory(id: string): Promise<ActionResult> {
  await requireAdmin();

  const [childCount, productCount] = await Promise.all([
    prisma.category.count({ where: { parentId: id } }),
    prisma.productCategory.count({ where: { categoryId: id } }),
  ]);

  // Silmek yerine engelliyoruz: kullanıcı neyi kaybedeceğini bilmeli.
  if (childCount > 0) {
    return {
      ok: false,
      error: `Bu kategorinin ${childCount} alt kategorisi var. Önce onları taşıyın veya silin.`,
    };
  }
  if (productCount > 0) {
    return {
      ok: false,
      error: `Bu kategoriye bağlı ${productCount} ürün var. Önce ürünleri başka kategoriye alın.`,
    };
  }

  await prisma.category.delete({ where: { id } });
  revalidatePath("/panel/kategoriler");
  return { ok: true };
}

/** Sürükle-bırak sonrası kardeş sıralamasını kaydeder. */
export async function reorderCategories(
  parentId: string | null,
  orderedIds: string[],
): Promise<ActionResult> {
  await requireAdmin();

  // Gelen id'lerin gerçekten bu ebeveynin çocukları olduğunu doğruluyoruz;
  // aksi halde istemciden gönderilen listeyle başka kategoriler taşınabilir.
  const children = await prisma.category.findMany({
    where: { parentId },
    select: { id: true },
  });
  const valid = new Set(children.map((child) => child.id));
  if (orderedIds.length !== valid.size || !orderedIds.every((id) => valid.has(id))) {
    return { ok: false, error: "Sıralama listesi geçersiz." };
  }

  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.category.update({ where: { id }, data: { sortOrder: index } }),
    ),
  );

  revalidatePath("/panel/kategoriler");
  return { ok: true };
}

/** Ad yazılırken slug önizlemesi için. */
export async function previewSlug(name: string): Promise<string> {
  return slugify(name);
}
