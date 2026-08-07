import type { Metadata } from "next";

import { PageHeader } from "@/components/ui/surface";
import { prisma } from "@/lib/prisma";

import { CategoryManager, type CategoryNode } from "./category-manager";

export const metadata: Metadata = { title: "Kategoriler" };
export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const rows = await prisma.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      parentId: true,
      sortOrder: true,
      isActive: true,
      showInMenu: true,
      imageUrl: true,
      metaTitle: true,
      metaDescription: true,
      _count: { select: { products: true } },
    },
  });

  // Ağacı sunucuda kuruyoruz: istemciye düz liste gönderip orada kurmak
  // her render'da tekrar iş demek, üstelik sıralama tutarsızlaşabiliyor.
  const byParent = new Map<string | null, CategoryNode[]>();
  const nodes = new Map<string, CategoryNode>();

  for (const row of rows) {
    nodes.set(row.id, {
      id: row.id,
      name: row.name,
      slug: row.slug,
      parentId: row.parentId,
      isActive: row.isActive,
      showInMenu: row.showInMenu,
      imageUrl: row.imageUrl,
      metaTitle: row.metaTitle,
      metaDescription: row.metaDescription,
      productCount: row._count.products,
      children: [],
    });
  }

  for (const row of rows) {
    const node = nodes.get(row.id)!;
    const siblings = byParent.get(row.parentId) ?? [];
    siblings.push(node);
    byParent.set(row.parentId, siblings);
  }

  for (const [parentId, siblings] of byParent) {
    if (parentId === null) continue;
    const parent = nodes.get(parentId);
    if (parent) parent.children = siblings;
  }

  const tree = byParent.get(null) ?? [];

  return (
    <>
      <PageHeader
        title="Kategoriler"
        description="Menüde ve vitrinde görünen kategori ağacı. Sıralamayı sürükleyerek değiştirebilirsiniz."
      />
      <CategoryManager tree={tree} />
    </>
  );
}
