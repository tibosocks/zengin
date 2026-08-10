import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText, Phone } from "lucide-react";

import { buttonStyles } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/surface";
import { OrderStatusPanel } from "@/components/panel/order-status-panel";
import { ORDER_STATUSES } from "@/lib/order-status";
import { formatBasisPoints, formatKurus, toBasisPoints, toKurus } from "@/lib/price";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Sipariş detayı" };
export const dynamic = "force-dynamic";

export default async function OrderDetailPage({
  params,
}: PageProps<"/panel/siparisler/[id]">) {
  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      customer: true,
      items: { orderBy: { id: "asc" } },
      statusHistory: {
        orderBy: { createdAt: "desc" },
        include: { user: { select: { name: true } } },
      },
    },
  });

  if (!order) notFound();

  const whatsapp = order.customer.phone
    ? `https://wa.me/90${order.customer.phone}?text=${encodeURIComponent(
        `Merhaba ${order.customer.fullName}, ${order.orderNo} numaralı siparişiniz hakkında bilgi vermek istiyoruz.`,
      )}`
    : null;

  const discountBp = toBasisPoints(order.discountPercent);

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Link
          href="/panel/siparisler"
          aria-label="Sipariş listesine dön"
          className="rounded p-1.5 text-muted hover:bg-line-soft hover:text-ink"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="font-display text-2xl text-ink">{order.orderNo}</h1>
        <span className="text-sm text-muted">
          {formatDateTime(order.createdAt)} · {order.channel}
        </span>

        <a
          href={`/panel/siparisler/${order.id}/pdf`}
          target="_blank"
          rel="noopener noreferrer"
          className={`${buttonStyles({ variant: "secondary", size: "sm" })} ml-auto`}
        >
          <FileText className="size-4" />
          Siparişi PDF oluştur
        </a>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          {/* kalemler */}
          <Card>
            <CardHeader
              title="Ürünler"
              description={`${order.items.length} kalem · fiyatlar sipariş anındaki hâliyle donduruldu`}
            />
            <table className="w-full text-sm">
              <thead className="border-b border-line text-left text-xs text-muted">
                <tr>
                  <th className="px-5 py-2 font-medium">Ürün</th>
                  <th className="hidden px-5 py-2 text-right font-medium sm:table-cell">
                    Birim
                  </th>
                  <th className="px-5 py-2 text-right font-medium">Adet</th>
                  <th className="px-5 py-2 text-right font-medium">Tutar</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item) => (
                  <tr key={item.id} className="border-b border-line-soft last:border-0">
                    <td className="px-5 py-3">
                      <p className="font-medium text-ink">{item.productName}</p>
                      <p className="text-xs text-muted">
                        {item.optionsText ? `${item.optionsText} · ` : ""}
                        {item.sku ?? "kodsuz"}
                      </p>
                      {/* Birim fiyat sütunu dar ekranda gizli; bilgi
                          kaybolmasın diye ürünün altında tekrar ediyor. */}
                      <p className="tnum text-xs text-muted sm:hidden">
                        Birim {formatKurus(toKurus(item.unitPrice))}
                      </p>
                    </td>
                    <td className="tnum hidden px-5 py-3 text-right sm:table-cell">
                      {formatKurus(toKurus(item.unitPrice))}
                      {toKurus(item.listPrice) > toKurus(item.unitPrice) ? (
                        <span className="block text-xs text-muted line-through">
                          {formatKurus(toKurus(item.listPrice))}
                        </span>
                      ) : null}
                    </td>
                    <td className="tnum px-5 py-3 text-right">
                      {item.quantity}
                      <span className="ml-1 text-xs text-muted">dz</span>
                    </td>
                    <td className="tnum px-5 py-3 text-right font-medium">
                      {formatKurus(toKurus(item.lineTotal))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <dl className="space-y-1.5 border-t border-line px-5 py-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted">Ara toplam (KDV hariç)</dt>
                <dd className="tnum">{formatKurus(toKurus(order.subtotal))}</dd>
              </div>
              {toKurus(order.discount) > 0 ? (
                <div className="flex justify-between">
                  <dt className="text-ok">
                    Bayi indirimi ({formatBasisPoints(discountBp)})
                  </dt>
                  <dd className="tnum text-ok">
                    −{formatKurus(toKurus(order.discount))}
                  </dd>
                </div>
              ) : null}
              <div className="flex justify-between">
                <dt className="text-muted">KDV</dt>
                <dd className="tnum">{formatKurus(toKurus(order.vatTotal))}</dd>
              </div>
              <div className="flex justify-between border-t border-line pt-2 text-base">
                <dt className="font-medium text-ink">Toplam</dt>
                <dd className="tnum font-semibold text-ink">
                  {formatKurus(toKurus(order.grandTotal))}
                </dd>
              </div>
            </dl>
          </Card>

          {order.customerNote ? (
            <Card>
              <CardHeader title="Müşteri notu" />
              <p className="px-5 py-4 text-sm whitespace-pre-wrap text-ink-soft">
                {order.customerNote}
              </p>
            </Card>
          ) : null}

          {/* geçmiş */}
          <Card>
            <CardHeader title="Durum geçmişi" />
            <ul className="divide-y divide-line-soft">
              {order.statusHistory.map((entry) => (
                <li key={entry.id} className="flex justify-between gap-4 px-5 py-2.5 text-sm">
                  <span className="text-ink-soft">
                    {entry.fromStatus
                      ? `${ORDER_STATUSES.find((s) => s.key === entry.fromStatus)?.label} → `
                      : ""}
                    <strong className="font-medium text-ink">
                      {ORDER_STATUSES.find((s) => s.key === entry.toStatus)?.label}
                    </strong>
                    {entry.note ? (
                      <span className="block text-xs text-muted">{entry.note}</span>
                    ) : null}
                  </span>
                  <span className="shrink-0 text-right text-xs text-muted">
                    {formatDateTime(entry.createdAt)}
                    {entry.user ? <span className="block">{entry.user.name}</span> : null}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        {/* yan sütun */}
        <aside className="space-y-5">
          <OrderStatusPanel
            orderId={order.id}
            status={order.status}
            adminNote={order.adminNote ?? ""}
          />

          <Card>
            <CardHeader title="Müşteri" />
            <div className="space-y-2 px-5 py-4 text-sm">
              <p className="font-medium text-ink">{order.customer.fullName}</p>
              {order.customer.companyName ? (
                <p className="text-ink-soft">{order.customer.companyName}</p>
              ) : null}
              {order.customer.taxNo ? (
                <p className="text-muted">VN/TCKN: {order.customer.taxNo}</p>
              ) : null}

              <a
                href={`tel:0${order.customer.phone}`}
                className="tnum flex items-center gap-2 text-ink-soft hover:text-ink"
              >
                <Phone className="size-4" />0{order.customer.phone}
              </a>

              {order.customer.email ? (
                <a
                  href={`mailto:${order.customer.email}`}
                  className="block break-all text-ink-soft hover:text-ink"
                >
                  {order.customer.email}
                </a>
              ) : null}

              {toBasisPoints(order.customer.discountPercent) > 0 ? (
                <p className="text-ok">
                  Bayi iskontosu:{" "}
                  {formatBasisPoints(toBasisPoints(order.customer.discountPercent))}
                </p>
              ) : null}

              {whatsapp ? (
                <a
                  href={whatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 block rounded-md border border-line py-2 text-center text-sm text-ink-soft hover:border-ink hover:text-ink"
                >
                  WhatsApp&apos;tan yaz
                </a>
              ) : null}
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}
