import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";

import { orderStatusLabel } from "@/lib/order-status";
import { formatKurus, toBasisPoints, toKurus } from "@/lib/price";
import { formatPhone } from "@/lib/phone";
import { prisma } from "@/lib/prisma";

import { PrintTrigger } from "./print-trigger";

export const metadata: Metadata = { title: "Sipariş çıktısı" };
export const dynamic = "force-dynamic";

export default async function OrderPdfPage({
  params,
}: PageProps<"/panel/siparisler/[id]/pdf">) {
  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      customer: true,
      items: {
        orderBy: { id: "asc" },
        include: {
          // Kalemde ürün adı zaten anlık görüntü olarak saklı; görseli
          // varyant üzerinden çekiyoruz. Ürün sonradan silinmişse null gelir
          // ve satır görselsiz basılır.
          variant: {
            select: {
              product: {
                select: {
                  images: {
                    orderBy: { sortOrder: "asc" },
                    take: 1,
                    select: { url: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!order) notFound();

  const subtotal = toKurus(order.subtotal);
  const vatTotal = toKurus(order.vatTotal);
  const discount = toKurus(order.discount);
  const grandTotal = toKurus(order.grandTotal);
  const discountBp = toBasisPoints(order.discountPercent);

  const createdAt = order.createdAt.toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="cikti mx-auto max-w-[210mm] bg-white p-8 text-ink">
      <PrintTrigger />

      {/* --- başlık --------------------------------------------------- */}
      <div className="flex items-start justify-between gap-6 border-b-2 border-ink pb-4">
        <div>
          <p className="text-xs tracking-[0.12em] text-muted uppercase">
            Zengin Socks
          </p>
          <h1 className="mt-1 font-display text-2xl">
            Sipariş {order.orderNo}
          </h1>
        </div>
        <div className="text-right text-sm">
          <p className="tnum font-medium">{createdAt}</p>
          <p className="mt-0.5 text-muted">
            {order.items.length} kalem ·{" "}
            {order.items.reduce((sum, item) => sum + item.quantity, 0)} düzine
          </p>
        </div>
      </div>

      {/* --- müşteri --------------------------------------------------- */}
      <div className="mt-5 grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
        <Row label="Ad Soyad" value={order.customer.fullName} />
        <Row label="Telefon" value={formatPhone(order.customer.phone)} />
        <Row label="Firma" value={order.customer.companyName} />
        <Row label="E-posta" value={order.customer.email} />
        <Row label="Vergi No / TCKN" value={order.customer.taxNo} />
        <Row label="Sipariş durumu" value={orderStatusLabel(order.status)} />
      </div>

      {order.customerNote ? (
        <p className="mt-4 rounded border border-line bg-surface-alt px-3 py-2 text-sm">
          <span className="font-medium">Müşteri notu: </span>
          {order.customerNote}
        </p>
      ) : null}

      {/* --- kalemler --------------------------------------------------- */}
      <table className="mt-6 w-full border-collapse text-sm">
        <thead>
          <tr className="border-y border-ink text-left">
            <th className="w-[104px] px-2 py-2 font-medium">Resim</th>
            <th className="px-2 py-2 font-medium">Ürün</th>
            <th className="w-20 px-2 py-2 text-right font-medium">Miktar</th>
            <th className="w-28 px-2 py-2 text-right font-medium">
              Birim Fiyat
            </th>
            <th className="w-28 px-2 py-2 text-right font-medium">Toplam</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item) => {
            const imageUrl = item.variant?.product.images[0]?.url ?? null;

            return (
              <tr key={item.id} className="border-b border-line align-middle">
                <td className="px-2 py-2">
                  <div className="relative size-24 overflow-hidden rounded border border-line bg-surface-alt">
                    {imageUrl ? (
                      <Image
                        src={imageUrl}
                        alt=""
                        fill
                        sizes="96px"
                        className="object-contain p-1"
                      />
                    ) : null}
                  </div>
                </td>
                <td className="px-2 py-2">
                  <p className="font-medium">{item.productName}</p>
                  {item.optionsText ? (
                    <p className="text-muted">{item.optionsText}</p>
                  ) : null}
                  {item.sku ? (
                    <p className="text-xs text-muted">{item.sku}</p>
                  ) : null}
                </td>
                <td className="tnum px-2 py-2 text-right whitespace-nowrap">
                  {item.quantity} düzine
                </td>
                <td className="tnum px-2 py-2 text-right whitespace-nowrap">
                  {formatKurus(toKurus(item.unitPrice))}
                </td>
                <td className="tnum px-2 py-2 text-right font-medium whitespace-nowrap">
                  {formatKurus(toKurus(item.lineTotal))}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* --- toplamlar --------------------------------------------------- */}
      <div className="mt-5 flex justify-end">
        <table className="text-sm">
          <tbody>
            {discount > 0 ? (
              <>
                <Total
                  label="Ara toplam (KDV hariç)"
                  value={subtotal + discount}
                />
                <Total
                  label={`İskonto (%${discountBp / 100})`}
                  value={-discount}
                />
              </>
            ) : null}
            <Total label="Ara toplam (KDV hariç)" value={subtotal} />
            <Total label="KDV" value={vatTotal} />
            <tr className="border-t-2 border-ink">
              <td className="py-2 pr-8 font-medium">Genel toplam</td>
              <td className="tnum py-2 text-right text-base font-semibold">
                {formatKurus(grandTotal)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p className="mt-8 border-t border-line pt-3 text-xs text-muted">
        Ödeme mağazada alınır, site üzerinden tahsilat yapılmaz. Fiyatlar bir
        düzinenin fiyatıdır.
      </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex gap-2 border-b border-line-soft py-1">
      <span className="w-32 shrink-0 text-muted">{label}</span>
      <span className="min-w-0 break-words">{value || "—"}</span>
    </div>
  );
}

function Total({ label, value }: { label: string; value: number }) {
  return (
    <tr>
      <td className="py-1 pr-8 text-muted">{label}</td>
      <td className="tnum py-1 text-right whitespace-nowrap">
        {formatKurus(value)}
      </td>
    </tr>
  );
}
