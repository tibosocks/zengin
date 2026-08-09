import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";

import { PageEditor } from "../page-editor";

export const metadata: Metadata = { title: "Sayfayı düzenle" };
export const dynamic = "force-dynamic";

export default async function EditPagePage({
  params,
}: PageProps<"/panel/sayfalar/[id]">) {
  const { id } = await params;

  const page = await prisma.page.findUnique({ where: { id } });
  if (!page) notFound();

  return (
    <PageEditor
      initial={{
        id: page.id,
        title: page.title,
        slug: page.slug,
        contentHtml: page.contentHtml,
        isActive: page.isActive,
        metaTitle: page.metaTitle ?? "",
        metaDescription: page.metaDescription ?? "",
      }}
    />
  );
}
