"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { indentOption, type CategoryOption } from "@/lib/category-tree";
import {
  bulkAdjustPrices,
  bulkAssignCategory,
  bulkSetActive,
} from "@/lib/actions/products";

export function BulkActions({
  productIds,
  categories,
  onDone,
}: {
  productIds: string[];
  categories: CategoryOption[];
  onDone: (message: string) => void;
}) {
  const router = useRouter();
  const [percent, setPercent] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function run(
    fn: () => Promise<{ ok: boolean; error?: string; data?: { updated: number } }>,
    describe: (count: number) => string,
  ) {
    setError(null);
    startTransition(async () => {
      const result = await fn();
      if (result.ok) {
        onDone(describe(result.data?.updated ?? productIds.length));
        router.refresh();
      } else {
        setError(result.error ?? "İşlem başarısız.");
      }
    });
  }

  function applyPercent() {
    const value = Number(percent.replace(",", "."));
    if (!Number.isFinite(value) || value === 0) {
      setError("Geçerli bir oran girin (örn. 15 veya -10).");
      return;
    }
    // Geri alınamaz bir toplu işlem: ne olacağını açıkça söyleyip onay alıyoruz
    const direction = value > 0 ? "artırılacak" : "azaltılacak";
    if (
      !confirm(
        `${productIds.length} ürünün tüm varyant fiyatları %${Math.abs(value)} ${direction}. Onaylıyor musunuz?`,
      )
    ) {
      return;
    }
    run(
      () => bulkAdjustPrices(productIds, value),
      (count) => `${count} varyantın fiyatı güncellendi.`,
    );
  }

  return (
    <div className="rounded-card border border-ink bg-white p-3">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium text-ink">
          {productIds.length} ürün seçildi
        </span>

        <div className="h-5 w-px bg-line" />

        <div className="flex items-center gap-1.5">
          <Input
            value={percent}
            onChange={(event) => setPercent(event.target.value)}
            placeholder="%"
            aria-label="Fiyat değişim oranı"
            className="h-8 w-20 text-right"
          />
          <Button size="sm" variant="secondary" onClick={applyPercent} disabled={isPending}>
            Fiyat değiştir
          </Button>
        </div>

        <div className="h-5 w-px bg-line" />

        <div className="flex items-center gap-1.5">
          <Select
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
            aria-label="Eklenecek kategori"
            className="h-8 w-auto min-w-40 text-sm"
          >
            <option value="">Kategori seç…</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {indentOption(category.depth)}
                {category.name}
              </option>
            ))}
          </Select>
          <Button
            size="sm"
            variant="secondary"
            disabled={!categoryId || isPending}
            onClick={() =>
              run(
                () => bulkAssignCategory(productIds, categoryId),
                (count) =>
                  count === 0
                    ? "Seçili ürünler zaten bu kategorideydi."
                    : `${count} ürün kategoriye eklendi.`,
              )
            }
          >
            Ekle
          </Button>
        </div>

        <div className="h-5 w-px bg-line" />

        <Button
          size="sm"
          variant="secondary"
          disabled={isPending}
          onClick={() =>
            run(
              () => bulkSetActive(productIds, true),
              (count) => `${count} ürün aktif edildi.`,
            )
          }
        >
          Aktif yap
        </Button>
        <Button
          size="sm"
          variant="secondary"
          disabled={isPending}
          onClick={() =>
            run(
              () => bulkSetActive(productIds, false),
              (count) => `${count} ürün pasife alındı.`,
            )
          }
        >
          Pasife al
        </Button>
      </div>

      {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
    </div>
  );
}
