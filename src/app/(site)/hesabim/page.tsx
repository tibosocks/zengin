import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { getCustomerSession } from "@/lib/auth";
import { dealerLogout } from "@/lib/actions/customer-auth";
import { orderStatusLabel } from "@/lib/order-status";
import { formatBasisPoints, formatKurus, toBasisPoints, toKurus } from "@/lib/price";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Hesabım", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const session = await getCustomerSession();
  if (!session) redirect("/bayi-girisi");

  const customer = await prisma.customer.findUnique({
    where: { id: session.customerId },
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
    },
  });

  // Oturum çerezi geçerli ama müşteri silinmişse
  if (!customer) redirect("/bayi-girisi");

  const discountBp = toBasisPoints(customer.discountPercent);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 lg:px-8">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl text-ink">
            {customer.companyName || customer.fullName}
          </h1>
          <p className="tnum mt-1 text-sm text-muted">0{customer.phone}</p>
        </div>
        <form action={dealerLogout}>
          <Button type="submit" variant="secondary" size="sm">
            Çıkış yap
          </Button>
        </form>
      </div>

      {discountBp > 0 ? (
        <div className="mb-6 rounded-card border border-ok bg-ok-soft px-5 py-4">
          <p className="font-medium text-ok">
            Bayi iskontonuz: {formatBasisPoints(discountBp)}
          </p>
          <p className="mt-1 text-sm text-ink-soft">
            Sitedeki tüm fiyatlar bu iskonto uygulanmış hâliyle gösteriliyor.
          </p>
        </div>
      ) : customer.status === "onay_bekliyor" ? (
        <div className="mb-6 rounded-card border border-warn bg-warn-soft px-5 py-4">
          <p className="font-medium text-warn">Başvurunuz inceleniyor</p>
          <p className="mt-1 text-sm text-ink-soft">
            Onaylandığında size özel fiyatlar görünmeye başlayacak.
          </p>
        </div>
      ) : null}

      <h2 className="mb-3 font-display text-xl text-ink">Siparişlerim</h2>

      {customer.orders.length === 0 ? (
        <div className="rounded-card border border-line bg-white px-6 py-12 text-center">
          <p className="text-ink-soft">Henüz siparişiniz yok.</p>
          <Link href="/" className="mt-3 inline-block text-sm text-muted hover:text-ink">
            Ürünlere göz atın
          </Link>
        </div>
      ) : (
        <div className="divide-y divide-line rounded-card border border-line bg-white">
          {customer.orders.map((order) => (
            <div
              key={order.id}
              className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
            >
              <div>
                <p className="font-medium text-ink">{order.orderNo}</p>
                <p className="text-sm text-muted">
                  {formatDateTime(order.createdAt)} · {order._count.items} kalem
                </p>
              </div>
              <div className="text-right">
                <p className="tnum font-semibold text-ink">
                  {formatKurus(toKurus(order.grandTotal))}
                </p>
                <p className="text-sm text-muted">
                  {orderStatusLabel(order.status)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="mt-6 text-center text-xs text-muted">
        Ödeme mağazada alınır. Site üzerinden ödeme yapılmaz.
      </p>
    </div>
  );
}
