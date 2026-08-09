import type { Metadata } from "next";
import { AlertTriangle } from "lucide-react";

import { Card, EmptyState, PageHeader } from "@/components/ui/surface";
import { prisma } from "@/lib/prisma";

import { NotificationList, type NotificationRow } from "./notification-list";

export const metadata: Metadata = { title: "Bildirimler" };
export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const [notifications, unread] = await Promise.all([
    prisma.notification.findMany({
      // nulls:"first" şart: okunmamışların readAt'i NULL ve PostgreSQL
      // ASC sıralamada NULL'ları sona koyuyor — okunmuşlar üste çıkıyordu.
      orderBy: [
        { readAt: { sort: "asc", nulls: "first" } },
        { createdAt: "desc" },
      ],
      take: 100,
    }),
    prisma.notification.count({ where: { readAt: null } }),
  ]);

  const rows: NotificationRow[] = notifications.map((item) => ({
    id: item.id,
    type: item.type,
    title: item.title,
    body: item.body,
    link: item.link,
    read: item.readAt !== null,
    createdAt: item.createdAt.toISOString(),
  }));

  return (
    <>
      <PageHeader
        title="Bildirimler"
        description={
          unread > 0 ? `${unread} okunmamış bildirim` : "Hepsi okundu."
        }
      />

      {rows.length === 0 ? (
        <Card>
          <EmptyState
            title="Bildirim yok"
            description="Yeni sipariş veya bayi başvurusu geldiğinde burada görünecek."
          />
        </Card>
      ) : (
        <NotificationList rows={rows} unread={unread} />
      )}

      {rows.length >= 100 ? (
        <p className="mt-4 flex items-center gap-2 text-sm text-muted">
          <AlertTriangle className="size-4" />
          Son 100 bildirim gösteriliyor.
        </p>
      ) : null}
    </>
  );
}
