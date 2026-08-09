import type { Metadata } from "next";
import Link from "next/link";

import { buttonStyles } from "@/components/ui/button";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui/surface";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Sayfalar" };
export const dynamic = "force-dynamic";

export default async function PagesPage() {
  const pages = await prisma.page.findMany({
    orderBy: { title: "asc" },
    select: {
      id: true,
      title: true,
      slug: true,
      isActive: true,
      updatedAt: true,
    },
  });

  return (
    <div>
      <PageHeader
        title="Sayfalar"
        description="Hakkımızda, iletişim, KVKK gibi sabit içerikler. Footer'daki bağlantılar buraya bakar."
        action={
          <Link href="/panel/sayfalar/yeni" className={buttonStyles({})}>
            Yeni sayfa
          </Link>
        }
      />

      <Card>
        {pages.length === 0 ? (
          <EmptyState
            title="Henüz sayfa yok"
            description="Footer'daki Hakkımızda, İletişim ve KVKK bağlantıları sayfa oluşturulana kadar boş sayfa gösterir."
            action={
              <Link href="/panel/sayfalar/yeni" className={buttonStyles({})}>
                İlk sayfayı oluştur
              </Link>
            }
          />
        ) : (
          <ul className="divide-y divide-line">
            {pages.map((page) => (
              <li key={page.id}>
                <Link
                  href={`/panel/sayfalar/${page.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 hover:bg-surface-alt"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-ink">{page.title}</p>
                    <p className="text-sm text-muted">/sayfa/{page.slug}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted">
                      {page.updatedAt.toLocaleDateString("tr-TR")}
                    </span>
                    <Badge tone={page.isActive ? "ok" : "neutral"}>
                      {page.isActive ? "Yayında" : "Taslak"}
                    </Badge>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
