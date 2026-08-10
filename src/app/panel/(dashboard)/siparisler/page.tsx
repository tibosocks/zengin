import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";

import { Badge, Card, EmptyState } from "@/components/ui/surface";
import { PageHeader } from "@/components/ui/surface";
import { ORDER_STATUSES } from "@/lib/order-status";
import { formatKurus, toKurus } from "@/lib/price";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Siparişler" };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 40;

const TONE: Record<string, "warn" | "info" | "ok" | "danger" | "neutral"> = {
  yeni: "warn",
  onaylandi: "info",
  hazirlaniyor: "info",
  teslime_hazir: "info",
  teslim_edildi: "ok",
  iptal: "danger",
};

export default async function OrdersPage({
  searchParams,
}: PageProps<"/panel/siparisler">) {
  const params = await searchParams;
  const status = typeof params.durum === "string" ? params.durum : "";
  const query = typeof params.q === "string" ? params.q.trim() : "";
  const page = Math.max(1, Number(params.sayfa) || 1);

  const validStatus = ORDER_STATUSES.find((item) => item.key === status)?.key;

  const where = {
    ...(validStatus ? { status: validStatus } : {}),
    ...(query
      ? {
          OR: [
            { orderNo: { contains: query, mode: "insensitive" as const } },
            {
              customer: {
                OR: [
                  { fullName: { contains: query, mode: "insensitive" as const } },
                  { phone: { contains: query.replace(/\D/g, "") } },
                  { companyName: { contains: query, mode: "insensitive" as const } },
                ],
              },
            },
          ],
        }
      : {}),
  };

  const [total, orders, counts] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        orderNo: true,
        status: true,
        grandTotal: true,
        createdAt: true,
        customer: { select: { fullName: true, companyName: true, phone: true } },
        _count: { select: { items: true } },
      },
    }),
    prisma.order.groupBy({ by: ["status"], _count: true }),
  ]);

  const countByStatus = new Map(counts.map((row) => [row.status, row._count]));
  const totalAll = counts.reduce((sum, row) => sum + row._count, 0);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function tabHref(key: string) {
    const next = new URLSearchParams();
    if (key) next.set("durum", key);
    if (query) next.set("q", query);
    const qs = next.toString();
    return `/panel/siparisler${qs ? `?${qs}` : ""}`;
  }

  return (
    <>
      <PageHeader
        title="Siparişler"
        description="Ödeme mağazada alınıyor. Teslim ettiğinizde durumu güncelleyin — stok o an düşer."
      />

      {/* durum sekmeleri */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        <Link
          href={tabHref("")}
          className={
            !validStatus
              ? "rounded bg-ink px-3 py-1.5 text-sm text-white"
              : "rounded px-3 py-1.5 text-sm text-ink-soft hover:bg-line-soft"
          }
        >
          Tümü <span className="tnum text-xs opacity-70">{totalAll}</span>
        </Link>
        {ORDER_STATUSES.map((item) => {
          const active = validStatus === item.key;
          const count = countByStatus.get(item.key) ?? 0;
          return (
            <Link
              key={item.key}
              href={tabHref(item.key)}
              className={
                active
                  ? "rounded bg-ink px-3 py-1.5 text-sm text-white"
                  : "rounded px-3 py-1.5 text-sm text-ink-soft hover:bg-line-soft"
              }
            >
              {item.label} <span className="tnum text-xs opacity-70">{count}</span>
            </Link>
          );
        })}
      </div>

      <form method="get" className="mb-4 flex gap-2">
        {validStatus ? (
          <input type="hidden" name="durum" value={validStatus} />
        ) : null}
        <label className="relative min-w-56 flex-1">
          <span className="sr-only">Sipariş ara</span>
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
          <input
            name="q"
            defaultValue={query}
            placeholder="Sipariş no, müşteri adı veya telefon…"
            className="h-10 w-full rounded-md border border-line bg-white pr-3 pl-9 text-sm placeholder:text-muted focus:border-ink focus:outline-none"
          />
        </label>
      </form>

      <Card className="overflow-hidden">
        {orders.length === 0 ? (
          <EmptyState
            title="Sipariş bulunamadı"
            description={
              query || validStatus
                ? "Filtreyi değiştirmeyi deneyin."
                : "Siteden ilk sipariş geldiğinde burada listelenecek."
            }
          />
        ) : (
          <>
            {/* Mobil kart listesi — tablo dar ekranda okunmuyordu */}
            <ul className="divide-y divide-line-soft md:hidden">
              {orders.map((order) => (
                <li key={order.id}>
                  <Link
                    href={`/panel/siparisler/${order.id}`}
                    className="block px-4 py-3 active:bg-surface-alt"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium text-ink">{order.orderNo}</span>
                      <span className="tnum font-medium text-ink">
                        {formatKurus(toKurus(order.grandTotal))}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-3">
                      <span className="truncate text-sm text-ink-soft">
                        {order.customer.companyName || order.customer.fullName}
                      </span>
                      <Badge tone={TONE[order.status] ?? "neutral"}>
                        {ORDER_STATUSES.find((item) => item.key === order.status)
                          ?.label ?? order.status}
                      </Badge>
                    </div>
                    <p className="tnum mt-1 text-xs text-muted">
                      0{order.customer.phone} · {order._count.items} kalem ·{" "}
                      {formatDateTime(order.createdAt)}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>

            <table className="hidden w-full text-sm md:table">
              <thead className="border-b border-line bg-surface-alt text-left text-xs text-muted">
                <tr>
                  <th className="px-4 py-2 font-medium">Sipariş</th>
                  <th className="px-4 py-2 font-medium">Müşteri</th>
                  <th className="px-4 py-2 font-medium">Durum</th>
                  <th className="px-4 py-2 text-right font-medium">Kalem</th>
                  <th className="px-4 py-2 text-right font-medium">Tutar</th>
                  <th className="hidden px-4 py-2 text-right font-medium lg:table-cell">
                    Tarih
                  </th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr
                    key={order.id}
                    className="border-b border-line-soft last:border-0 hover:bg-surface-alt"
                  >
                    <td className="px-4 py-2.5">
                      <Link
                        href={`/panel/siparisler/${order.id}`}
                        className="font-medium whitespace-nowrap text-ink hover:underline"
                      >
                        {order.orderNo}
                      </Link>
                    </td>
                    <td className="max-w-56 px-4 py-2.5">
                      <span className="block truncate text-ink-soft">
                        {order.customer.companyName || order.customer.fullName}
                      </span>
                      <span className="tnum text-xs text-muted">
                        0{order.customer.phone}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge tone={TONE[order.status] ?? "neutral"}>
                        {ORDER_STATUSES.find((item) => item.key === order.status)
                          ?.label ?? order.status}
                      </Badge>
                    </td>
                    <td className="tnum px-4 py-2.5 text-right text-muted">
                      {order._count.items}
                    </td>
                    <td className="tnum px-4 py-2.5 text-right font-medium whitespace-nowrap">
                      {formatKurus(toKurus(order.grandTotal))}
                    </td>
                    <td className="hidden px-4 py-2.5 text-right whitespace-nowrap text-muted lg:table-cell">
                      {formatDateTime(order.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </Card>

      {totalPages > 1 ? (
        <p className="mt-4 text-center text-sm text-muted">
          Sayfa {page} / {totalPages} · {total} sipariş
        </p>
      ) : null}
    </>
  );
}
