import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function getPage(slug: string) {
  return prisma.page.findFirst({ where: { slug, isActive: true } });
}

export async function generateMetadata({
  params,
}: PageProps<"/sayfa/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPage(slug);
  if (!page) return { title: "Sayfa bulunamadı" };

  return {
    title: page.metaTitle || page.title,
    description: page.metaDescription || undefined,
  };
}

export default async function StaticPage({ params }: PageProps<"/sayfa/[slug]">) {
  const { slug } = await params;
  const page = await getPage(slug);
  if (!page) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 lg:px-8">
      <nav aria-label="Sayfa yolu" className="mb-6 text-sm text-muted">
        <Link href="/" className="hover:text-ink">
          Ana sayfa
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-ink">{page.title}</span>
      </nav>

      <h1 className="mb-6 font-display text-2xl text-ink sm:text-3xl">
        {page.title}
      </h1>

      {/* İçerik panelden yöneticinin kendisi giriyor; ürün açıklamasıyla
          aynı gerekçeyle yönetici kaynaklı sayılıyor. */}
      <div
        className="space-y-4 text-ink-soft [&_a]:text-ink [&_a]:underline [&_h2]:mt-8 [&_h2]:font-display [&_h2]:text-xl [&_h2]:text-ink [&_h3]:mt-6 [&_h3]:font-medium [&_h3]:text-ink [&_li]:ml-5 [&_li]:list-disc [&_p]:leading-relaxed [&_ul]:space-y-1"
        dangerouslySetInnerHTML={{ __html: page.contentHtml }}
      />

      <p className="mt-10 text-xs text-muted">
        Son güncelleme: {page.updatedAt.toLocaleDateString("tr-TR")}
      </p>
    </div>
  );
}
