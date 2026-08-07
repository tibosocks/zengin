"use client";

import { Wand2 } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { Badge } from "@/components/ui/surface";
import { formatKurus, toKurus } from "@/lib/price";
import { cn } from "@/lib/utils";

export interface OptionTypeData {
  id: string;
  name: string;
  values: Array<{ id: string; value: string }>;
}

export interface VariantDraft {
  key: string; // istemci tarafı kimlik; kaydedilmiş varyantlarda id ile aynı
  id?: string;
  optionValueIds: string[];
  optionLabel: string;
  sku: string;
  price: string;
  vatRate: string;
  stock: number;
  lowStockThreshold: number;
  isActive: boolean;
}

// Bayi iskontoları müşteri kartında; burada sadece kaba bir fikir vermek için
// yaygın oranları gösteriyoruz. Gerçek fiyat siparişte sunucuda hesaplanır.
const HINT_PERCENTS = [10, 20, 30];

export function VariantEditor({
  optionTypes,
  variants,
  defaultVatRate,
  onChange,
}: {
  optionTypes: OptionTypeData[];
  variants: VariantDraft[];
  defaultVatRate: string;
  onChange: (next: VariantDraft[]) => void;
}) {
  const [selectedValues, setSelectedValues] = useState<Record<string, string[]>>(
    () => initialSelection(optionTypes, variants),
  );
  const [applyPrice, setApplyPrice] = useState("");
  const [applyStock, setApplyStock] = useState("");

  const valueName = useMemo(() => {
    const map = new Map<string, string>();
    for (const type of optionTypes) {
      for (const value of type.values) map.set(value.id, value.value);
    }
    return map;
  }, [optionTypes]);

  function toggleValue(typeId: string, valueId: string) {
    setSelectedValues((current) => {
      const list = current[typeId] ?? [];
      return {
        ...current,
        [typeId]: list.includes(valueId)
          ? list.filter((id) => id !== valueId)
          : [...list, valueId],
      };
    });
  }

  /**
   * Seçilen değerlerin tüm kombinasyonlarını üretir.
   * Mevcut varyantlar korunur (fiyat/stok/SKU kaybolmaz), yenileri eklenir,
   * artık kombinasyonda olmayanlar listeden çıkarılır.
   */
  function generate() {
    const active = optionTypes
      .map((type) => ({ type, ids: selectedValues[type.id] ?? [] }))
      .filter((entry) => entry.ids.length > 0);

    const combos: string[][] =
      active.length === 0
        ? [[]]
        : active.reduce<string[][]>(
            (acc, entry) =>
              acc.flatMap((combo) => entry.ids.map((id) => [...combo, id])),
            [[]],
          );

    const existingByKey = new Map(
      variants.map((variant) => [comboKey(variant.optionValueIds), variant]),
    );

    const next = combos.map((combo) => {
      const key = comboKey(combo);
      const existing = existingByKey.get(key);
      if (existing) return existing;

      return {
        key: `new-${key || "single"}`,
        optionValueIds: combo,
        optionLabel:
          combo.map((id) => valueName.get(id) ?? "?").join(" / ") || "Tek varyant",
        sku: "",
        price: applyPrice || "",
        vatRate: defaultVatRate,
        stock: Number(applyStock) || 0,
        lowStockThreshold: 0,
        isActive: true,
      } satisfies VariantDraft;
    });

    onChange(next);
  }

  function patch(key: string, changes: Partial<VariantDraft>) {
    onChange(
      variants.map((variant) =>
        variant.key === key ? { ...variant, ...changes } : variant,
      ),
    );
  }

  function applyToAll() {
    onChange(
      variants.map((variant) => ({
        ...variant,
        price: applyPrice !== "" ? applyPrice : variant.price,
        stock: applyStock !== "" ? Number(applyStock) : variant.stock,
      })),
    );
  }

  return (
    <div className="space-y-5">
      {/* --- seçenek seçimi --- */}
      <div className="space-y-3">
        {optionTypes.map((type) => (
          <div key={type.id}>
            <p className="mb-2 text-sm font-medium text-ink-soft">{type.name}</p>
            <div className="flex flex-wrap gap-1.5">
              {type.values.map((value) => {
                const checked = (selectedValues[type.id] ?? []).includes(value.id);
                return (
                  <button
                    key={value.id}
                    type="button"
                    onClick={() => toggleValue(type.id, value.id)}
                    aria-pressed={checked}
                    className={cn(
                      "rounded-md border px-3 py-1.5 text-sm transition-colors",
                      checked
                        ? "border-ink bg-ink text-white"
                        : "border-line text-ink-soft hover:border-ink",
                    )}
                  >
                    {value.value}
                  </button>
                );
              })}
              {type.values.length === 0 ? (
                <p className="text-sm text-muted">
                  Bu seçenek tipinde henüz değer yok.
                </p>
              ) : null}
            </div>
          </div>
        ))}

        <Button variant="secondary" onClick={generate}>
          <Wand2 className="size-4" />
          Varyant tablosunu oluştur
        </Button>
      </div>

      {/* --- toplu doldurma --- */}
      {variants.length > 0 ? (
        <div className="flex flex-wrap items-end gap-2 rounded-md bg-surface-alt p-3">
          <div>
            <label
              htmlFor="apply-price"
              className="mb-1 block text-xs font-medium text-muted"
            >
              Hepsine fiyat
            </label>
            <Input
              id="apply-price"
              value={applyPrice}
              onChange={(event) => setApplyPrice(event.target.value)}
              placeholder="340"
              className="h-9 w-28 text-right"
            />
          </div>
          <div>
            <label
              htmlFor="apply-stock"
              className="mb-1 block text-xs font-medium text-muted"
            >
              Hepsine stok
            </label>
            <Input
              id="apply-stock"
              value={applyStock}
              onChange={(event) => setApplyStock(event.target.value)}
              placeholder="0"
              inputMode="numeric"
              className="h-9 w-24 text-right"
            />
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={applyToAll}
            disabled={applyPrice === "" && applyStock === ""}
            className="h-9"
          >
            Tümüne uygula
          </Button>
        </div>
      ) : null}

      {/* --- varyant tablosu --- */}
      {variants.length === 0 ? (
        <p className="rounded-md border border-dashed border-line px-4 py-8 text-center text-sm text-muted">
          Beden seçip &ldquo;Varyant tablosunu oluştur&rdquo;a basın.
          <br />
          Bedeni olmayan bir ürün için hiçbir şey seçmeden de basabilirsiniz.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-line text-left text-xs text-muted">
              <tr>
                <th className="py-2 pr-3 font-medium">Varyant</th>
                <th className="px-3 py-2 font-medium">SKU</th>
                <th className="px-3 py-2 text-right font-medium">Fiyat (KDV hariç)</th>
                <th className="px-3 py-2 text-right font-medium">Stok</th>
                <th className="px-3 py-2 text-center font-medium">Aktif</th>
              </tr>
            </thead>
            <tbody>
              {variants.map((variant) => (
                <tr key={variant.key} className="border-b border-line-soft last:border-0">
                  <td className="py-2 pr-3">
                    <span className="font-medium text-ink">{variant.optionLabel}</span>
                    {variant.id ? null : (
                      <Badge tone="info" className="ml-2">
                        Yeni
                      </Badge>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      value={variant.sku}
                      onChange={(event) => patch(variant.key, { sku: event.target.value })}
                      placeholder="—"
                      aria-label={`${variant.optionLabel} SKU`}
                      className="h-9"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      value={variant.price}
                      onChange={(event) =>
                        patch(variant.key, { price: event.target.value })
                      }
                      placeholder="0,00"
                      aria-label={`${variant.optionLabel} fiyatı`}
                      className="tnum h-9 w-28 text-right"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      value={String(variant.stock)}
                      onChange={(event) =>
                        patch(variant.key, {
                          stock: Math.max(0, Number(event.target.value) || 0),
                        })
                      }
                      inputMode="numeric"
                      aria-label={`${variant.optionLabel} stoğu`}
                      className="tnum h-9 w-20 text-right"
                    />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={variant.isActive}
                      onChange={(event) =>
                        patch(variant.key, { isActive: event.target.checked })
                      }
                      aria-label={`${variant.optionLabel} aktif`}
                      className="size-4 accent-ink"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <PriceHints variants={variants} />
        </div>
      )}
    </div>
  );
}

/** Liste fiyatı girildiğinde bayi fiyatlarının ne olacağını gösteren şerit. */
function PriceHints({ variants }: { variants: VariantDraft[] }) {
  const prices = variants
    .map((variant) => toKurus(variant.price.replace(",", ".")))
    .filter((value) => value > 0);

  if (prices.length === 0) return null;

  const min = Math.min(...prices);
  const max = Math.max(...prices);

  return (
    <p className="mt-3 text-xs text-muted">
      Bayi fiyatı örneği:{" "}
      {HINT_PERCENTS.map((percent, index) => {
        const low = Math.round((min * (100 - percent)) / 100);
        const high = Math.round((max * (100 - percent)) / 100);
        return (
          <span key={percent}>
            {index > 0 ? " · " : ""}%{percent} →{" "}
            <span className="tnum">
              {low === high ? formatKurus(low) : `${formatKurus(low)}–${formatKurus(high)}`}
            </span>
          </span>
        );
      })}
      . Her bayinin gerçek iskontosu müşteri kartında tanımlı.
    </p>
  );
}

function comboKey(ids: string[]) {
  return [...ids].sort().join("|");
}

function initialSelection(
  optionTypes: OptionTypeData[],
  variants: VariantDraft[],
): Record<string, string[]> {
  const used = new Set(variants.flatMap((variant) => variant.optionValueIds));
  const selection: Record<string, string[]> = {};

  for (const type of optionTypes) {
    selection[type.id] = type.values
      .filter((value) => used.has(value.id))
      .map((value) => value.id);
  }

  return selection;
}
