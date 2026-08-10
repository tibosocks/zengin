import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Phone } from "lucide-react";

import { Badge, Card, CardHeader, EmptyState } from "@/components/ui/surface";
import { CustomerSidePanel } from "@/components/panel/customer-side-panel";
import { orderStatusLabel } from "@/lib/order-status";
import { formatBasisPoints, formatKurus, toBasisPoints, toKurus } from "@/lib/price";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Müşteri" };
export const dynamic = "force-dynamic";

export default async function CustomerDetailPage({
  params,
}: PageProps<"/panel/musteriler/[id]">) {
  const { id } = await params;

  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      orders: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          orderNo: true,
          status: true,
          grandTotal: true,
          createdAt: true,
          _count: { select: { items: true } },
        },
      },
      discountLogs: {
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { user: { select: { name: true } } },
      },
    },
  });

  if (!customer) notFound();

  const paidOrders = customer.orders.filter((order) => order.status !== "iptal");
  const revenue = paidOrders.reduce(
    (sum, order) => sum + toKurus(order.grandTotal),
    0,
  );
  const discountBp = toBasisPoints(customer.discountPercent);

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Link
          href="/panel/musteriler"
          aria-label="Müşteri listesine dön"
          className="rounded p-1.5 text-muted hover:bg-line-soft hover:text-ink"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="font-display text-2xl text-ink">
          {customer.companyName || customer.fullName}
        </h1>
        {customer.status === "onay_bekliyor" ? (
          <Badge tone="warn">Onay bekliyor</Badge>
        ) : customer.status === "pasif" ? (
          <Badge tone="danger">Pasif</Badge>
        ) : customer.type === "bayi" ? (
          <Badge tone="info">Bayi</Badge>
        ) : (
          <Badge>Bireysel</Badge>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <Stat label="Sipariş" value={String(paidOrders.length)} />
            <Stat label="Toplam ciro" value={formatKurus(revenue)} />
            <Stat
              label="İskonto"
              value={discountBp > 0 ? formatBasisPoints(discountBp) : "—"}
              highlight={discountBp > 0}
            />
          </div>

          <Card>
            <CardHeader title="Siparişler" />
            {customer.orders.length === 0 ? (
              <EmptyState title="Henüz sipariş yok" />
            ) : (
              <table className="w-full text-sm">
                <thead className="border-b border-line text-left text-xs text-muted">
                  <tr>
                    <th className="px-5 py-2 font-medium">Sipariş</th>
                    <th className="px-5 py-2 font-medium">Durum</th>
                    <th className="hidden px-5 py-2 text-right font-medium sm:table-cell">
                      Kalem
                    </th>
                    <th className="px-5 py-2 text-right font-medium">Tutar</th>
                    <th className="hidden px-5 py-2 text-right font-medium md:table-cell">
                      Tarih
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {customer.orders.map((order) => (
                    <tr
                      key={order.id}
                      className="border-b border-line-soft last:border-0"
                    >
                      <td className="px-5 py-2.5">
                        <Link
                          href={`/panel/siparisler/${order.id}`}
                          className="font-medium text-ink hover:underline"
                        >
                          {order.orderNo}
                        </Link>
                      </td>
                      <td className="px-5 py-2.5 text-muted">
                        {orderStatusLabel(order.status)}
                      </td>
                      <td className="tnum hidden px-5 py-2.5 text-right text-muted sm:table-cell">
                        {order._count.items}
                      </td>
                      <td className="tnum px-5 py-2.5 text-right">
                        {formatKurus(toKurus(order.grandTotal))}
                      </td>
                      <td className="hidden px-5 py-2.5 text-right whitespace-nowrap text-muted md:table-cell">
                        {formatDateTime(order.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>

          {customer.discountLogs.length > 0 ? (
            <Card>
              <CardHeader
                title="İskonto geçmişi"
                description="Yüzde elle giriliyor; her değişiklik kaydediliyor."
              />
              <ul className="divide-y divide-line-soft">
                {customer.discountLogs.map((log) => (
                  <li
                    key={log.id}
                    className="flex justify-between gap-4 px-5 py-2.5 text-sm"
                  >
                    <span className="text-ink-soft">
                      {formatBasisPoints(toBasisPoints(log.fromValue))} →{" "}
                      <strong className="font-medium text-ink">
                        {formatBasisPoints(toBasisPoints(log.toValue))}
                      </strong>
                      {log.note ? (
                        <span className="block text-xs text-muted">{log.note}</span>
                      ) : null}
                    </span>
                    <span className="shrink-0 text-right text-xs text-muted">
                      {formatDateTime(log.createdAt)}
                      {log.user ? <span className="block">{log.user.name}</span> : null}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </div>

        <aside className="space-y-5">
          <CustomerSidePanel
            customerId={customer.id}
            status={customer.status}
            discountBp={discountBp}
            note={customer.note ?? ""}
            hasPassword={customer.passwordHash !== null}
          />

          <Card>
            <CardHeader title="İletişim" />
            <div className="space-y-2 px-5 py-4 text-sm">
              <p className="font-medium text-ink">{customer.fullName}</p>
              {customer.companyName ? (
                <p className="text-ink-soft">{customer.companyName}</p>
              ) : null}
              {customer.taxNo ? (
                <p className="text-muted">VN/TCKN: {customer.taxNo}</p>
              ) : null}

              <a
                href={`tel:0${customer.phone}`}
                className="tnum flex items-center gap-2 text-ink-soft hover:text-ink"
              >
                <Phone className="size-4" />0{customer.phone}
              </a>

              {customer.email ? (
                <a
                  href={`mailto:${customer.email}`}
                  className="block break-all text-ink-soft hover:text-ink"
                >
                  {customer.email}
                </a>
              ) : null}

              <a
                href={`https://wa.me/90${customer.phone}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 block rounded-md border border-line py-2 text-center text-sm text-ink-soft hover:border-ink hover:text-ink"
              >
                WhatsApp&apos;tan yaz
              </a>

              <p className="pt-2 text-xs text-muted">
                Kayıt: {formatDateTime(customer.createdAt)}
              </p>
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-card border border-line bg-white px-4 py-3">
      <p className="text-xs text-muted">{label}</p>
      <p
        className={
          highlight
            ? "tnum mt-1 text-xl font-semibold text-ok"
            : "tnum mt-1 text-xl font-semibold text-ink"
        }
      >
        {value}
      </p>
    </div>
  );
}
