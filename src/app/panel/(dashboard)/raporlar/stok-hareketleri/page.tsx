import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Badge, Card, EmptyState, PageHeader } from "@/components/ui/surface";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Stok hareketleri" };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

const REASONS = [
  { key: "", label: "Tümü" },
  { key: "satis", label: "Satış" },
  { key: "iptal", label: "İptal" },
  { key: "sayim", label: "Sayım" },
  { key: "giris", label: "Giriş" },
  { key: "duzeltme", label: "Düzeltme" },
  { key: "aktarim", label: "Aktarım" },
] as const;

type Reason = Exclude<(typeof REASONS)[number]["key"], "">;

const REASON_LABEL: Record<Reason, string> = Object.fromEntries(
  REASONS.filter((item) => item.key).map((item) => [item.key, item.label]),
) as Record<Reason, string>;

function isReason(value: string): value is Reason {
  return value !== "" && value in REASON_LABEL;
}

export default async function StockMovementsPage({
  searchParams,
}: PageProps<"/panel/raporlar/stok-hareketleri">) {
  const query = await searchParams;
  const reason = typeof query.sebep === "string" ? query.sebep : "";
  const search = typeof query.q === "string" ? query.q.trim() : "";
  const page = Math.max(1, Number(query.sayfa) || 1);

  const where = {
    ...(isReason(reason) ? { reason } : {}),
    ...(search
      ? {
          variant: {
            OR: [
              { sku: { contains: search, mode: "insensitive" as const } },
              {
                product: {
                  name: { contains: search, mode: "insensitive" as const },
                },
              },
            ],
          },
        }
      : {}),
  };

  const [total, movements] = await Promise.all([
    prisma.stockMovement.count({ where }),
    prisma.stockMovement.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        delta: true,
        reason: true,
        note: true,
        createdAt: true,
        orderId: true,
        user: { select: { name: true } },
        variant: {
          select: {
            sku: true,
            product: { select: { id: true, name: true } },
            optionValues: {
              select: { optionValue: { select: { value: true } } },
            },
          },
        },
      },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function hrefFor(changes: Record<string, string>) {
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (reason) params.set("sebep", reason);
    for (const [key, value] of Object.entries(changes)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    const qs = params.toString();
    return `/panel/raporlar/stok-hareketleri${qs ? `?${qs}` : ""}`;
  }

  return (
    <>
      <div className="mb-4 flex items-center gap-3">
        <Link
          href="/panel/raporlar"
          aria-label="Raporlara dön"
          className="rounded p-1.5 text-muted hover:bg-line-soft hover:text-ink"
        >
          <ArrowLeft className="size-5" />
        </Link>
      </div>

      <PageHeader
        title="Stok hareketleri"
        description={`${total} kayıt. Stok her değiştiğinde buraya bir satır düşer — sipariş, sayım, aktarım veya elle düzeltme.`}
      />

      {/* filtreler */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {REASONS.map((item) => {
          const active = reason === item.key;
          const params = new URLSearchParams();
          if (search) params.set("q", search);
          if (item.key) params.set("sebep", item.key);
          const qs = params.toString();
          return (
            <Link
              key={item.key || "hepsi"}
              href={`/panel/raporlar/stok-hareketleri${qs ? `?${qs}` : ""}`}
              aria-current={active ? "true" : undefined}
              className={
                active
                  ? "rounded bg-ink px-2.5 py-1 text-sm text-white"
                  : "rounded px-2.5 py-1 text-sm text-ink-soft hover:bg-surface-alt"
              }
            >
              {item.label}
            </Link>
          );
        })}
      </div>

      <form className="mb-4" action="/panel/raporlar/stok-hareketleri">
        {reason ? <input type="hidden" name="sebep" value={reason} /> : null}
        <input
          name="q"
          defaultValue={search}
          placeholder="Ürün adı veya SKU ara…"
          aria-label="Stok hareketi ara"
          className="h-10 w-full max-w-md rounded-md border border-line bg-white px-3 text-ink placeholder:text-muted focus:border-ink focus:outline-none"
        />
      </form>

      <Card className="overflow-hidden">
        {movements.length === 0 ? (
          <EmptyState
            title="Kayıt bulunamadı"
            description="Filtreleri değiştirin."
          />
        ) : (
          <ul className="divide-y divide-line-soft">
            {movements.map((movement) => {
              const label =
                movement.variant.optionValues
                  .map((link) => link.optionValue.value)
                  .join(" / ") || "Tek varyant";

              return (
                <li key={movement.id} className="flex gap-3 px-4 py-2.5">
                  <span
                    className={
                      movement.delta > 0
                        ? "tnum w-14 shrink-0 text-sm font-medium text-ok"
                        : "tnum w-14 shrink-0 text-sm font-medium text-danger"
                    }
                  >
                    {movement.delta > 0 ? "+" : ""}
                    {movement.delta}
                  </span>

                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/panel/urunler/${movement.variant.product.id}`}
                      className="block truncate text-sm font-medium text-ink hover:underline"
                    >
                      {movement.variant.product.name}
                    </Link>
                    <p className="truncate text-xs text-muted">
                      {label}
                      {movement.variant.sku ? ` · ${movement.variant.sku}` : ""}
                      {movement.note ? ` · ${movement.note}` : ""}
                    </p>
                    <p className="mt-0.5 text-xs text-muted sm:hidden">
                      {formatDateTime(movement.createdAt)}
                      {movement.user ? ` · ${movement.user.name}` : ""}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-start gap-3">
                    <Badge
                      tone={
                        movement.reason === "satis"
                          ? "info"
                          : movement.reason === "iptal"
                            ? "warn"
                            : "neutral"
                      }
                    >
                      {REASON_LABEL[movement.reason]}
                    </Badge>
                    <span className="hidden w-40 text-right text-xs text-muted sm:block">
                      {formatDateTime(movement.createdAt)}
                      {movement.user ? (
                        <span className="block">{movement.user.name}</span>
                      ) : null}
                      {movement.orderId ? (
                        <Link
                          href={`/panel/siparisler/${movement.orderId}`}
                          className="block hover:text-ink hover:underline"
                        >
                          siparişe git
                        </Link>
                      ) : null}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {totalPages > 1 ? (
        <div className="mt-4 flex items-center justify-center gap-3 text-sm">
          {page > 1 ? (
            <Link
              href={hrefFor({ sayfa: String(page - 1) })}
              className="rounded border border-line px-3 py-1.5 text-ink-soft hover:border-ink"
            >
              Önceki
            </Link>
          ) : null}
          <span className="text-muted">
            Sayfa {page} / {totalPages}
          </span>
          {page < totalPages ? (
            <Link
              href={hrefFor({ sayfa: String(page + 1) })}
              className="rounded border border-line px-3 py-1.5 text-ink-soft hover:border-ink"
            >
              Sonraki
            </Link>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
