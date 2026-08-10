"use client";

import { ChevronDown, ChevronRight, Pencil } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Badge, Card, EmptyState } from "@/components/ui/surface";
import { updateVariantInline } from "@/lib/actions/products";
import type { CategoryOption } from "@/lib/category-tree";
import { formatKurus, kurusToDecimalString } from "@/lib/price";
import { cn } from "@/lib/utils";

import { BulkActions } from "./bulk-actions";

export interface VariantRow {
  id: string;
  sku: string | null;
  priceKurus: number;
  stock: number;
  reserved: number;
  isActive: boolean;
  label: string;
}

export interface ProductRow {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  imageUrl: string | null;
  categoryName: string | null;
  variants: VariantRow[];
}

export function ProductTable({
  rows,
  categories,
  page,
  totalPages,
}: {
  rows: ProductRow[];
  categories: CategoryOption[];
  page: number;
  totalPages: number;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState<string | null>(null);

  function toggleSelected(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleExpanded(id: string) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const allSelected = rows.length > 0 && selected.size === rows.length;

  if (rows.length === 0) {
    return (
      <Card>
        <EmptyState
          title="Ürün bulunamadı"
          description="Filtreleri değiştirin veya yeni ürün ekleyin."
        />
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {selected.size > 0 ? (
        <BulkActions
          productIds={[...selected]}
          categories={categories}
          onDone={(text) => {
            setSelected(new Set());
            setMessage(text);
          }}
        />
      ) : null}

      {message ? (
        <p className="rounded-md bg-ok-soft px-3 py-2 text-sm text-ok">{message}</p>
      ) : null}

      {/* Mobil liste. Tabloyu dar ekrana sıkıştırınca ürün adı beş satıra
          bölünüyor ve Stok sütunu kartın dışında kalıp erişilemez oluyordu.
          Satır içi fiyat/stok düzenleme burada da çalışıyor. */}
      <Card className="overflow-hidden lg:hidden">
        <ul className="divide-y divide-line-soft">
          {rows.map((row) => {
            const isOpen = expanded.has(row.id);
            const single = row.variants.length === 1 ? row.variants[0] : null;
            const totalStock = row.variants.reduce((sum, v) => sum + v.stock, 0);

            return (
              <li key={row.id} className="px-3 py-3">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    aria-label={`${row.name} seç`}
                    checked={selected.has(row.id)}
                    onChange={() => toggleSelected(row.id)}
                    className="mt-1 size-4 shrink-0 accent-ink"
                  />

                  <div className="size-12 shrink-0 overflow-hidden rounded border border-line bg-surface-alt">
                    {row.imageUrl ? (
                      <Image
                        src={row.imageUrl}
                        alt=""
                        width={48}
                        height={48}
                        className="size-12 object-cover"
                      />
                    ) : null}
                  </div>

                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/panel/urunler/${row.id}`}
                      className="block text-sm leading-snug font-medium text-ink"
                    >
                      {row.name}
                    </Link>
                    <p className="mt-0.5 text-xs text-muted">
                      {row.categoryName ?? "kategorisiz"}
                      {row.variants.length > 1
                        ? ` · ${row.variants.length} varyant`
                        : single?.label
                          ? ` · ${single.label}`
                          : ""}
                      {!row.isActive ? " · pasif" : ""}
                    </p>

                    {/* İki sütunlu ızgara: tek varyantlı satırda düzenleme
                        kutusu, çok varyantlıda düz metin çıkıyor; ızgara
                        olmadan ikisi farklı hizalarda duruyordu. */}
                    <div className="mt-2 grid grid-cols-2 gap-x-2">
                      <div>
                        <span className="block text-xs text-muted">Fiyat</span>
                        {single ? (
                          <InlinePrice variant={single} />
                        ) : (
                          <span className="tnum block py-1 text-sm text-ink-soft">
                            {formatPriceRange(row.variants)}
                          </span>
                        )}
                      </div>
                      <div>
                        <span className="block text-xs text-muted">Stok</span>
                        {single ? (
                          <InlineStock variant={single} />
                        ) : (
                          <span
                            className={cn(
                              "tnum block py-1 text-sm",
                              totalStock <= 0 ? "text-danger" : "text-ink-soft",
                            )}
                          >
                            {totalStock}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {row.variants.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => toggleExpanded(row.id)}
                      aria-label={isOpen ? "Varyantları gizle" : "Varyantları göster"}
                      aria-expanded={isOpen}
                      className="-mr-1 shrink-0 rounded p-2 text-muted"
                    >
                      {isOpen ? (
                        <ChevronDown className="size-4" />
                      ) : (
                        <ChevronRight className="size-4" />
                      )}
                    </button>
                  ) : null}
                </div>

                {isOpen ? (
                  <ul className="mt-2 space-y-2 border-t border-line-soft pt-2 pl-7">
                    {row.variants.map((variant) => (
                      <li key={variant.id} className="flex items-center gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm text-ink-soft">
                            {variant.label}
                            {!variant.isActive ? (
                              <Badge tone="warn" className="ml-2">
                                Pasif
                              </Badge>
                            ) : null}
                            {variant.stock - variant.reserved <= 0 ? (
                              <Badge tone="danger" className="ml-2">
                                Tükendi
                              </Badge>
                            ) : null}
                          </p>
                          {variant.sku ? (
                            <p className="text-xs text-muted">{variant.sku}</p>
                          ) : null}
                        </div>
                        <InlinePrice variant={variant} />
                        <InlineStock variant={variant} />
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            );
          })}
        </ul>
      </Card>

      <Card className="hidden overflow-hidden lg:block">
        <table className="w-full text-sm">
          <thead className="border-b border-line bg-surface-alt text-left text-xs text-muted">
            <tr>
              <th className="w-10 px-3 py-2">
                <input
                  type="checkbox"
                  aria-label="Tümünü seç"
                  checked={allSelected}
                  onChange={() =>
                    setSelected(
                      allSelected ? new Set() : new Set(rows.map((row) => row.id)),
                    )
                  }
                  className="size-4 accent-ink"
                />
              </th>
              <th className="w-10 px-1 py-2" />
              <th className="px-3 py-2 font-medium">Ürün</th>
              <th className="px-3 py-2 font-medium">Kategori</th>
              <th className="px-3 py-2 font-medium">Varyant</th>
              <th className="px-3 py-2 text-right font-medium">Fiyat</th>
              <th className="px-3 py-2 text-right font-medium">Stok</th>
              <th className="w-12 px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const isOpen = expanded.has(row.id);
              const single = row.variants.length === 1 ? row.variants[0] : null;
              const totalStock = row.variants.reduce((sum, v) => sum + v.stock, 0);

              return (
                <Fragment key={row.id}>
                  <tr className="border-b border-line-soft last:border-0 hover:bg-surface-alt">
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        aria-label={`${row.name} seç`}
                        checked={selected.has(row.id)}
                        onChange={() => toggleSelected(row.id)}
                        className="size-4 accent-ink"
                      />
                    </td>
                    <td className="px-1 py-2">
                      {row.variants.length > 1 ? (
                        <button
                          type="button"
                          onClick={() => toggleExpanded(row.id)}
                          aria-label={isOpen ? "Varyantları gizle" : "Varyantları göster"}
                          aria-expanded={isOpen}
                          className="rounded p-1 text-muted hover:text-ink"
                        >
                          {isOpen ? (
                            <ChevronDown className="size-4" />
                          ) : (
                            <ChevronRight className="size-4" />
                          )}
                        </button>
                      ) : null}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-3">
                        <div className="size-10 shrink-0 overflow-hidden rounded border border-line bg-surface-alt">
                          {row.imageUrl ? (
                            <Image
                              src={row.imageUrl}
                              alt=""
                              width={40}
                              height={40}
                              className="size-10 object-cover"
                            />
                          ) : null}
                        </div>
                        <div className="min-w-0">
                          <Link
                            href={`/panel/urunler/${row.id}`}
                            className="font-medium text-ink hover:underline"
                          >
                            {row.name}
                          </Link>
                          {!row.isActive ? (
                            <Badge tone="warn" className="ml-2">
                              Pasif
                            </Badge>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-muted">{row.categoryName ?? "—"}</td>
                    <td className="px-3 py-2 text-muted">
                      {row.variants.length > 1
                        ? `${row.variants.length} varyant`
                        : (single?.label ?? "—")}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {single ? (
                        <InlinePrice variant={single} />
                      ) : (
                        <span className="tnum text-muted">
                          {formatPriceRange(row.variants)}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {single ? (
                        <InlineStock variant={single} />
                      ) : (
                        <span
                          className={cn(
                            "tnum",
                            totalStock <= 0 ? "text-danger" : "text-ink-soft",
                          )}
                        >
                          {totalStock}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Link
                        href={`/panel/urunler/${row.id}`}
                        aria-label={`${row.name} düzenle`}
                        className="inline-flex rounded p-1.5 text-muted hover:bg-line-soft hover:text-ink"
                      >
                        <Pencil className="size-4" />
                      </Link>
                    </td>
                  </tr>

                  {isOpen
                    ? row.variants.map((variant) => (
                        <tr
                          key={variant.id}
                          className="border-b border-line-soft bg-surface-alt/60 last:border-0"
                        >
                          <td />
                          <td />
                          <td className="px-3 py-1.5 pl-16 text-ink-soft">
                            {variant.label}
                            {variant.sku ? (
                              <span className="ml-2 text-xs text-muted">
                                {variant.sku}
                              </span>
                            ) : null}
                            {!variant.isActive ? (
                              <Badge tone="warn" className="ml-2">
                                Pasif
                              </Badge>
                            ) : null}
                            {variant.stock - variant.reserved <= 0 ? (
                              <Badge tone="danger" className="ml-2">
                                Tükendi
                              </Badge>
                            ) : null}
                          </td>
                          <td />
                          <td />
                          <td className="px-3 py-1.5 text-right">
                            <InlinePrice variant={variant} />
                          </td>
                          <td className="px-3 py-1.5 text-right">
                            <InlineStock variant={variant} />
                          </td>
                          <td />
                        </tr>
                      ))
                    : null}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </Card>

      {totalPages > 1 ? (
        <Pagination page={page} totalPages={totalPages} />
      ) : null}
    </div>
  );
}

function formatPriceRange(variants: VariantRow[]) {
  const prices = variants.map((variant) => variant.priceKurus);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return min === max ? formatKurus(min) : `${formatKurus(min)} – ${formatKurus(max)}`;
}

/**
 * Satır içi düzenleme: tıkla, yaz, Enter veya odak kaybında kaydet.
 * Esc değişikliği iptal eder. Kaydedilen değer kısa süre yeşil yanar ki
 * kullanıcı "gitti mi" diye merak etmesin.
 */
function useInlineSave() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    startTransition(async () => {
      const result = await fn();
      if (result.ok) {
        setError(null);
        setSaved(true);
        setTimeout(() => setSaved(false), 1200);
        router.refresh();
      } else {
        setError(result.error ?? "Kaydedilemedi");
      }
    });
  }

  return { run, isPending, saved, error };
}

function InlinePrice({ variant }: { variant: VariantRow }) {
  const initial = kurusToDecimalString(variant.priceKurus).replace(".", ",");
  const [value, setValue] = useState(initial);
  const { run, isPending, saved, error } = useInlineSave();

  function commit() {
    if (value === initial) return;
    run(() => updateVariantInline(variant.id, { price: value.replace(",", ".") }));
  }

  return (
    <input
      value={value}
      onChange={(event) => setValue(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur();
        if (event.key === "Escape") {
          setValue(initial);
          event.currentTarget.blur();
        }
      }}
      disabled={isPending}
      aria-label={`${variant.label} fiyatı`}
      title={error ?? undefined}
      className={cn(
        "tnum w-20 rounded border bg-transparent px-2 py-1 text-right lg:w-24",
        "hover:border-line focus:border-ink focus:bg-white",
        error
          ? "border-danger text-danger"
          : saved
            ? "border-ok bg-ok-soft"
            : "border-transparent",
      )}
    />
  );
}

function InlineStock({ variant }: { variant: VariantRow }) {
  const [value, setValue] = useState(String(variant.stock));
  const { run, isPending, saved, error } = useInlineSave();

  function commit() {
    if (value === String(variant.stock)) return;
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 0) {
      setValue(String(variant.stock));
      return;
    }
    run(() => updateVariantInline(variant.id, { stock: parsed }));
  }

  const available = variant.stock - variant.reserved;

  return (
    <div className="flex items-center justify-end gap-1.5">
      {variant.reserved > 0 ? (
        <span
          className="tnum text-xs text-muted"
          title={`${variant.reserved} adet açık siparişlerde rezerve · satılabilir ${available}`}
        >
          ({available})
        </span>
      ) : null}
      <input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
          if (event.key === "Escape") {
            setValue(String(variant.stock));
            event.currentTarget.blur();
          }
        }}
        disabled={isPending}
        inputMode="numeric"
        aria-label={`${variant.label} stoğu`}
        title={error ?? undefined}
        className={cn(
          "tnum w-14 rounded border bg-transparent px-2 py-1 text-right lg:w-16",
          "hover:border-line focus:border-ink focus:bg-white",
          error
            ? "border-danger text-danger"
            : saved
              ? "border-ok bg-ok-soft"
              : variant.stock <= 0
                ? "border-transparent text-danger"
                : "border-transparent",
        )}
      />
    </div>
  );
}

function Pagination({ page, totalPages }: { page: number; totalPages: number }) {
  const router = useRouter();

  function go(next: number) {
    const params = new URLSearchParams(window.location.search);
    params.set("sayfa", String(next));
    router.push(`/panel/urunler?${params.toString()}`);
  }

  return (
    <div className="flex items-center justify-between text-sm">
      <Button
        variant="secondary"
        size="sm"
        disabled={page <= 1}
        onClick={() => go(page - 1)}
      >
        Önceki
      </Button>
      <span className="text-muted">
        Sayfa {page} / {totalPages}
      </span>
      <Button
        variant="secondary"
        size="sm"
        disabled={page >= totalPages}
        onClick={() => go(page + 1)}
      >
        Sonraki
      </Button>
    </div>
  );
}
