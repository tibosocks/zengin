"use client";

import {
  Ban,
  Bell,
  Clock,
  PackageX,
  ShoppingCart,
  Store,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/surface";
import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/actions/notifications";
import { cn, formatDateTime } from "@/lib/utils";

export interface NotificationRow {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  createdAt: string;
}

const ICONS: Record<string, typeof Bell> = {
  yeni_siparis: ShoppingCart,
  bayi_basvurusu: Store,
  siparis_iptal: Ban,
  kritik_stok: PackageX,
  bekleyen_siparis: Clock,
};

export function NotificationList({
  rows,
  unread,
}: {
  rows: NotificationRow[];
  unread: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function open(row: NotificationRow) {
    if (!row.read) {
      // Okundu işaretini beklemeden gidiyoruz; kullanıcı bağlantıya
      // tıkladığında sayfanın açılması gecikmemeli.
      startTransition(async () => {
        await markNotificationRead(row.id);
        router.refresh();
      });
    }
  }

  return (
    <div className="space-y-3">
      {unread > 0 ? (
        <div className="flex justify-end">
          <Button
            variant="secondary"
            size="sm"
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                await markAllNotificationsRead();
                router.refresh();
              })
            }
          >
            Tümünü okundu işaretle
          </Button>
        </div>
      ) : null}

      <Card className="divide-y divide-line-soft overflow-hidden">
        {rows.map((row) => {
          const Icon = ICONS[row.type] ?? Bell;

          const content = (
            <div
              className={cn(
                "flex items-start gap-3 px-4 py-3 transition-colors",
                row.read ? "bg-white" : "bg-warn-soft/40",
                row.link && "hover:bg-surface-alt",
              )}
            >
              <span
                className={cn(
                  "mt-0.5 shrink-0 rounded-md p-1.5",
                  row.read ? "bg-line-soft text-muted" : "bg-ink text-white",
                )}
              >
                <Icon className="size-4" strokeWidth={1.75} />
              </span>

              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    "text-sm",
                    row.read ? "text-ink-soft" : "font-medium text-ink",
                  )}
                >
                  {row.title}
                </p>
                {row.body ? (
                  <p className="text-sm text-muted">{row.body}</p>
                ) : null}
              </div>

              <div className="shrink-0 text-right">
                <p className="text-xs text-muted">
                  {formatDateTime(row.createdAt)}
                </p>
                {!row.read ? (
                  <span className="mt-1 inline-block size-2 rounded-full bg-warn" />
                ) : null}
              </div>
            </div>
          );

          return row.link ? (
            <Link key={row.id} href={row.link} onClick={() => open(row)}>
              {content}
            </Link>
          ) : (
            <button
              key={row.id}
              type="button"
              onClick={() => open(row)}
              className="block w-full text-left"
            >
              {content}
            </button>
          );
        })}
      </Card>
    </div>
  );
}
