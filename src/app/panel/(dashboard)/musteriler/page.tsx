import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";

import { buttonStyles } from "@/components/ui/button";
import { Card, EmptyState, PageHeader } from "@/components/ui/surface";
import { toBasisPoints, toKurus } from "@/lib/price";
import { prisma } from "@/lib/prisma";

import { CustomerTable, type CustomerRow } from "./customer-table";

export const metadata: Metadata = { title: "Müşteriler" };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

const FILTERS = [
  { key: "", label: "Tümü" },
  { key: "onay_bekliyor", label: "Onay bekleyen" },
  { key: "bayi", label: "Bayiler" },
  { key: "indirimli", label: "İskontolular" },
  { key: "siparissiz", label: "Sipariş vermemiş" },
] as const;

export default async function CustomersPage({
  searchParams,
}: PageProps<"/panel/musteriler">) {
  const params = await searchParams;
  const filter = typeof params.filtre === "string" ? params.filtre : "";
  const statusParam = typeof params.durum === "string" ? params.durum : "";
  const query = typeof params.q === "string" ? params.q.trim() : "";
  const page = Math.max(1, Number(params.sayfa) || 1);

  // Özet ekranından "durum=onay_bekliyor" ile de geliniyor
  const active = statusParam === "onay_bekliyor" ? "onay_bekliyor" : filter;

  const where = {
    ...(active === "onay_bekliyor" ? { status: "onay_bekliyor" as const } : {}),
    ...(active === "bayi" ? { type: "bayi" as const } : {}),
    ...(active === "indirimli" ? { discountPercent: { gt: 0 } } : {}),
    ...(active === "siparissiz" ? { orders: { none: {} } } : {}),
    ...(query
      ? {
          OR: [
            { fullName: { contains: query, mode: "insensitive" as const } },
            { companyName: { contains: query, mode: "insensitive" as const } },
            { phone: { contains: query.replace(/\D/g, "") } },
            { email: { contains: query, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [total, customers, pendingCount] = await Promise.all([
    prisma.customer.count({ where }),
    prisma.customer.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        fullName: true,
        companyName: true,
        phone: true,
        email: true,
        type: true,
        status: true,
        discountPercent: true,
        orders: {
          where: { status: { not: "iptal" } },
          select: { grandTotal: true },
        },
      },
    }),
    prisma.customer.count({ where: { status: "onay_bekliyor" } }),
  ]);

  const rows: CustomerRow[] = customers.map((customer) => ({
    id: customer.id,
    fullName: customer.fullName,
    companyName: customer.companyName,
    phone: customer.phone,
    email: customer.email,
    type: customer.type,
    status: customer.status,
    discountBp: toBasisPoints(customer.discountPercent),
    orderCount: customer.orders.length,
    // İptaller ciroya dahil edilmiyor — gerçek iş hacmini görmek gerekiyor
    revenueKurus: customer.orders.reduce(
      (sum, order) => sum + toKurus(order.grandTotal),
      0,
    ),
  }));

  function href(key: string) {
    const next = new URLSearchParams();
    if (key) next.set("filtre", key);
    if (query) next.set("q", query);
    const qs = next.toString();
    return `/panel/musteriler${qs ? `?${qs}` : ""}`;
  }

  return (
    <>
      <PageHeader
        title="Müşteriler"
        description="Bayi iskontosu burada yönetiliyor. Yüzdeye tıklayıp doğrudan değiştirebilirsiniz."
        action={
          <Link href="/panel/musteriler/yeni" className={buttonStyles({})}>
            Yeni müşteri
          </Link>
        }
      />

      {pendingCount > 0 && active !== "onay_bekliyor" ? (
        <Link
          href="/panel/musteriler?filtre=onay_bekliyor"
          className="mb-4 block rounded-md bg-warn-soft px-4 py-3 text-sm text-warn hover:brightness-95"
        >
          <strong>{pendingCount} bayi başvurusu</strong> onayınızı bekliyor →
        </Link>
      ) : null}

      <div className="mb-4 flex flex-wrap items-center gap-1.5">
        {FILTERS.map((item) => (
          <Link
            key={item.key || "all"}
            href={href(item.key)}
            className={
              active === item.key
                ? "rounded bg-ink px-3 py-1.5 text-sm text-white"
                : "rounded px-3 py-1.5 text-sm text-ink-soft hover:bg-line-soft"
            }
          >
            {item.label}
          </Link>
        ))}
      </div>

      <form method="get" className="mb-4">
        {active ? <input type="hidden" name="filtre" value={active} /> : null}
        <label className="relative block max-w-md">
          <span className="sr-only">Müşteri ara</span>
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
          <input
            name="q"
            defaultValue={query}
            placeholder="Ad, firma, telefon veya e-posta…"
            className="h-10 w-full rounded-md border border-line bg-white pr-3 pl-9 text-sm placeholder:text-muted focus:border-ink focus:outline-none"
          />
        </label>
      </form>

      {rows.length === 0 ? (
        <Card>
          <EmptyState
            title="Müşteri bulunamadı"
            description={
              query || active
                ? "Filtreyi değiştirmeyi deneyin."
                : "İlk sipariş geldiğinde müşteri kaydı otomatik oluşur."
            }
          />
        </Card>
      ) : (
        <CustomerTable rows={rows} />
      )}

      <p className="mt-4 text-sm text-muted">{total} müşteri</p>
    </>
  );
}
