import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, History } from "lucide-react";

import { buttonStyles } from "@/components/ui/button";
import { Badge, Card, CardHeader, EmptyState, PageHeader } from "@/components/ui/surface";
import {
  getRevenueSummary,
  getStockAlerts,
  getTopCustomers,
  getTopProducts,
} from "@/lib/panel/reports";
import { formatKurus } from "@/lib/price";
import { formatPhone } from "@/lib/phone";

export const metadata: Metadata = { title: "Raporlar" };
export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const [periods, topProducts, topCustomers, stock] = await Promise.all([
    getRevenueSummary(),
    getTopProducts(10),
    getTopCustomers(10),
    getStockAlerts(20),
  ]);

  const allTime = periods[periods.length - 1];

  return (
    <>
      <PageHeader
        title="Raporlar"
        description="Tutarlar KDV hariç. İptal edilen siparişler sayılmaz."
        action={
          <Link
            href="/panel/raporlar/stok-hareketleri"
            className={buttonStyles({ variant: "secondary" })}
          >
            <History className="size-4" />
            Stok hareketleri
          </Link>
        }
      />

      {/* --- ciro özeti ------------------------------------------------- */}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
        {periods.map((period) => (
          <Card key={period.label} className="p-4">
            <p className="text-sm text-muted">{period.label}</p>
            <p className="tnum mt-2 text-xl font-semibold text-ink">
              {formatKurus(period.netKurus)}
            </p>
            <p className="tnum mt-1 text-xs text-muted">
              {period.orders} sipariş
              {period.orders > 0
                ? ` · ort. ${formatKurus(period.averageKurus)}`
                : ""}
            </p>
          </Card>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* --- en çok satanlar ------------------------------------------ */}
        <Card className="overflow-hidden">
          <CardHeader
            title="En çok satan ürünler"
            description="Düzine adedine göre"
          />
          {topProducts.length === 0 ? (
            <EmptyState
              title="Henüz satış yok"
              description="Sipariş geldikçe burada listelenecek."
            />
          ) : (
            <ol className="divide-y divide-line-soft">
              {topProducts.map((product, index) => (
                <li
                  key={product.productId ?? product.name}
                  className="flex items-center gap-3 px-4 py-2.5"
                >
                  <span className="tnum w-5 shrink-0 text-sm text-muted">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    {product.productId ? (
                      <Link
                        href={`/panel/urunler/${product.productId}`}
                        className="block truncate text-sm font-medium text-ink hover:underline"
                      >
                        {product.name}
                      </Link>
                    ) : (
                      <span className="block truncate text-sm text-ink-soft">
                        {product.name}
                      </span>
                    )}
                  </div>
                  <span className="tnum shrink-0 text-sm text-ink-soft">
                    {product.quantity} dz
                  </span>
                  <span className="tnum w-24 shrink-0 text-right text-sm font-medium">
                    {formatKurus(product.netKurus)}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </Card>

        {/* --- en çok alan müşteriler ------------------------------------ */}
        <Card className="overflow-hidden">
          <CardHeader title="En çok alan müşteriler" description="Ciroya göre" />
          {topCustomers.length === 0 ? (
            <EmptyState title="Henüz müşteri hareketi yok" />
          ) : (
            <ol className="divide-y divide-line-soft">
              {topCustomers.map((customer, index) => (
                <li
                  key={customer.id}
                  className="flex items-center gap-3 px-4 py-2.5"
                >
                  <span className="tnum w-5 shrink-0 text-sm text-muted">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/panel/musteriler/${customer.id}`}
                      className="block truncate text-sm font-medium text-ink hover:underline"
                    >
                      {customer.name}
                    </Link>
                    <span className="tnum text-xs text-muted">
                      {formatPhone(customer.phone)}
                    </span>
                  </div>
                  <span className="tnum shrink-0 text-sm text-muted">
                    {customer.orders} sip.
                  </span>
                  <span className="tnum w-24 shrink-0 text-right text-sm font-medium">
                    {formatKurus(customer.netKurus)}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>

      {/* --- stok uyarıları --------------------------------------------- */}
      <Card className="mt-5 overflow-hidden">
        <CardHeader
          title="Stok uyarıları"
          description={`Satılabiliri ${stock.threshold} düzine ve altına düşen varyantlar`}
          action={
            <Link
              href="/panel/urunler?stok=bitti"
              className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink"
            >
              Ürünlerde aç
              <ArrowRight className="size-3.5" />
            </Link>
          }
        />
        {stock.outOfStock.length === 0 && stock.low.length === 0 ? (
          <EmptyState
            title="Stok sıkıntısı yok"
            description="Aktif varyantların hepsi eşiğin üstünde."
          />
        ) : (
          <ul className="divide-y divide-line-soft">
            {[...stock.outOfStock, ...stock.low].map((row) => (
              <li
                key={`${row.productId}-${row.sku ?? row.variantLabel}`}
                className="flex items-center gap-3 px-4 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/panel/urunler/${row.productId}`}
                    className="block truncate text-sm font-medium text-ink hover:underline"
                  >
                    {row.productName}
                  </Link>
                  <span className="text-xs text-muted">
                    {row.variantLabel}
                    {row.sku ? ` · ${row.sku}` : ""}
                  </span>
                </div>
                {row.available <= 0 ? (
                  <Badge tone="danger">Tükendi</Badge>
                ) : (
                  <Badge tone="warn">{row.available} düzine</Badge>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <p className="mt-4 text-xs text-muted">
        Toplam {allTime.orders} sipariş · {formatKurus(allTime.netKurus)} KDV
        hariç · {formatKurus(allTime.grossKurus)} KDV dahil
      </p>
    </>
  );
}
