import Link from "next/link";

import { Badge, Card, CardHeader, EmptyState, PageHeader } from "@/components/ui/surface";
import { formatKurus, toKurus } from "@/lib/price";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  yeni: "Yeni",
  onaylandi: "Onaylandı",
  hazirlaniyor: "Hazırlanıyor",
  teslime_hazir: "Teslime hazır",
  teslim_edildi: "Teslim edildi",
  iptal: "İptal",
};

export default async function DashboardPage() {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [
    pendingOrders,
    todayOrders,
    productCount,
    dealerApplications,
    outOfStock,
    recentOrders,
  ] = await Promise.all([
    prisma.order.count({ where: { status: "yeni" } }),
    prisma.order.count({ where: { createdAt: { gte: todayStart } } }),
    prisma.product.count({ where: { isActive: true } }),
    prisma.customer.count({ where: { status: "onay_bekliyor" } }),
    prisma.variant.count({ where: { isActive: true, stock: { lte: 0 } } }),
    prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { customer: { select: { fullName: true, companyName: true } } },
    }),
  ]);

  const stats = [
    { label: "Bekleyen sipariş", value: pendingOrders, href: "/panel/siparisler?durum=yeni", highlight: pendingOrders > 0 },
    { label: "Bugünkü sipariş", value: todayOrders, href: "/panel/siparisler" },
    { label: "Aktif ürün", value: productCount, href: "/panel/urunler" },
    { label: "Stoğu biten varyant", value: outOfStock, href: "/panel/urunler?stok=bitti", highlight: outOfStock > 0 },
    { label: "Bayi başvurusu", value: dealerApplications, href: "/panel/musteriler?durum=onay_bekliyor", highlight: dealerApplications > 0 },
  ];

  return (
    <>
      <PageHeader title="Özet" description="Bugünkü durum ve son hareketler." />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="rounded-card border border-line bg-white p-4 transition-colors hover:border-ink active:bg-surface-alt"
          >
            <p className="text-sm text-muted">{stat.label}</p>
            <p
              className={
                stat.highlight
                  ? "tnum mt-2 text-2xl font-semibold text-warn"
                  : "tnum mt-2 text-2xl font-semibold text-ink"
              }
            >
              {stat.value}
            </p>
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader
          title="Son siparişler"
          action={
            <Link href="/panel/siparisler" className="text-sm text-muted hover:text-ink">
              Tümü →
            </Link>
          }
        />
        {recentOrders.length === 0 ? (
          <EmptyState
            title="Henüz sipariş yok"
            description="Site yayına alındığında siparişler burada listelenecek."
          />
        ) : (
          <>
            {/* Mobil: satırları kart olarak diziyoruz. Tabloyu dar ekrana
                sıkıştırmak sipariş numarasını üç satıra bölüyordu; yatay
                kaydırma da telefonda kullanışsız. */}
            <ul className="divide-y divide-line-soft sm:hidden">
              {recentOrders.map((order) => (
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
                      <Badge tone={order.status === "yeni" ? "warn" : "neutral"}>
                        {STATUS_LABEL[order.status] ?? order.status}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted">
                      {formatDateTime(order.createdAt)}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>

            <table className="hidden w-full text-sm sm:table">
              <thead className="border-b border-line text-left text-xs text-muted">
                <tr>
                  <th className="px-5 py-2 font-medium">Sipariş</th>
                  <th className="px-5 py-2 font-medium">Müşteri</th>
                  <th className="px-5 py-2 font-medium">Durum</th>
                  <th className="px-5 py-2 text-right font-medium">Tutar</th>
                  <th className="hidden px-5 py-2 text-right font-medium lg:table-cell">
                    Tarih
                  </th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr key={order.id} className="border-b border-line-soft last:border-0">
                    <td className="px-5 py-3">
                      <Link
                        href={`/panel/siparisler/${order.id}`}
                        className="font-medium whitespace-nowrap text-ink hover:underline"
                      >
                        {order.orderNo}
                      </Link>
                    </td>
                    <td className="max-w-40 truncate px-5 py-3 text-ink-soft">
                      {order.customer.companyName || order.customer.fullName}
                    </td>
                    <td className="px-5 py-3">
                      <Badge tone={order.status === "yeni" ? "warn" : "neutral"}>
                        {STATUS_LABEL[order.status] ?? order.status}
                      </Badge>
                    </td>
                    <td className="tnum px-5 py-3 text-right whitespace-nowrap">
                      {formatKurus(toKurus(order.grandTotal))}
                    </td>
                    <td className="hidden px-5 py-3 text-right whitespace-nowrap text-muted lg:table-cell">
                      {formatDateTime(order.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </Card>
    </>
  );
}
