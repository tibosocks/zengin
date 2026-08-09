"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uniqueSlug } from "@/lib/slug";

export interface ActionResult {
  ok: boolean;
  error?: string;
  data?: { id: string; slug: string };
}

const pageSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(1, "Sayfa başlığı gerekli").max(160),
  slug: z.string().trim().max(180).optional(),
  contentHtml: z.string().max(60_000).default(""),
  isActive: z.boolean().default(true),
  metaTitle: z.string().trim().max(200).optional(),
  metaDescription: z.string().trim().max(400).optional(),
});

function readForm(formData: FormData) {
  return pageSchema.safeParse({
    id: (formData.get("id") as string) || undefined,
    title: formData.get("title") ?? "",
    slug: (formData.get("slug") as string) || undefined,
    contentHtml: (formData.get("contentHtml") as string) ?? "",
    isActive: formData.get("isActive") === "on",
    metaTitle: (formData.get("metaTitle") as string) || undefined,
    metaDescription: (formData.get("metaDescription") as string) || undefined,
  });
}

export async function savePage(formData: FormData): Promise<ActionResult> {
  await requireAdmin();

  const parsed = readForm(formData);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message };
  }
  const data = parsed.data;

  const slug = await uniqueSlug(data.slug?.trim() || data.title, async (candidate) => {
    const found = await prisma.page.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    return found !== null && found.id !== data.id;
  });

  const payload = {
    title: data.title,
    slug,
    contentHtml: data.contentHtml,
    isActive: data.isActive,
    metaTitle: data.metaTitle || null,
    metaDescription: data.metaDescription || null,
  };

  const page = data.id
    ? await prisma.page.update({ where: { id: data.id }, data: payload })
    : await prisma.page.create({ data: payload });

  revalidatePath("/panel/sayfalar");
  revalidatePath(`/sayfa/${page.slug}`);
  revalidatePath("/sitemap.xml");

  return { ok: true, data: { id: page.id, slug: page.slug } };
}

export async function deletePage(id: string): Promise<ActionResult> {
  await requireAdmin();

  const page = await prisma.page.findUnique({
    where: { id },
    select: { slug: true },
  });
  if (!page) return { ok: false, error: "Sayfa bulunamadı." };

  await prisma.page.delete({ where: { id } });

  revalidatePath("/panel/sayfalar");
  revalidatePath(`/sayfa/${page.slug}`);
  revalidatePath("/sitemap.xml");

  return { ok: true };
}
