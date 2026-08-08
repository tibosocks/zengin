"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { addToCart } from "@/lib/actions/cart";
import { formatKurus } from "@/lib/price";
import type { ProductDetail } from "@/lib/shop/catalog";
import { cn } from "@/lib/utils";

/**
 * Varyant seçimi ve fiyat gösterimi.
 *
 * Kural: stoğu bitmiş seçenek gizlenmez, PASİF gösterilir. Ekran
 * görüntülerindeki Ticimax davranışı da böyle — müşteri bedenin var olduğunu
 * ama tükendiğini görmeli, listeden kaybolduğunu değil.
 */
export function ProductBuyBox({
  product,
  whatsappNumber,
}: {
  product: ProductDetail;
  whatsappNumber: string | null;
}) {
  const singleVariant = product.variants.length === 1 ? product.variants[0] : null;

  const [selected, setSelected] = useState<Record<string, string>>(() =>
    singleVariant
      ? Object.fromEntries(
          product.optionTypes.map((type, index) => [
            type.id,
            singleVariant.optionValueIds[index] ?? "",
          ]),
        )
      : {},
  );
  const [quantity, setQuantity] = useState(1);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const chosenIds = product.optionTypes
    .map((type) => selected[type.id])
    .filter(Boolean) as string[];

  // Birkaç varyantlık arama; elle memoize etmiyoruz, React Compiler
  // gerekirse kendisi hallediyor.
  const variant = findVariant(product, chosenIds, singleVariant);

  function submit() {
    if (!variant) return;
    setFeedback(null);
    startTransition(async () => {
      const result = await addToCart(variant.id, quantity);
      setFeedback({
        ok: result.ok,
        text: result.ok
          ? (result.message ?? "Sepete eklendi.")
          : (result.error ?? "Eklenemedi."),
      });
      if (result.ok) router.refresh();
    });
  }

  /** Bir seçenek değeri, diğer seçimlerle birlikte hiç stok veriyor mu? */
  function availabilityOf(typeId: string, valueId: string) {
    const others = product.optionTypes
      .filter((type) => type.id !== typeId)
      .map((type) => selected[type.id])
      .filter(Boolean) as string[];

    const matching = product.variants.filter((candidate) => {
      const ids = new Set(candidate.optionValueIds);
      return ids.has(valueId) && others.every((id) => ids.has(id));
    });

    if (matching.length === 0) return "yok" as const;
    return matching.some((candidate) => candidate.available > 0)
      ? ("var" as const)
      : ("tukendi" as const);
  }

  const priceSource = variant ?? product.variants[0];
  const maxQuantity = variant ? Math.min(variant.available, 999) : 999;

  const whatsappHref = whatsappNumber
    ? `https://wa.me/${whatsappNumber.replace(/\D/g, "")}?text=${encodeURIComponent(
        `Merhaba, "${product.name}"${variant ? ` (${variant.label})` : ""} ürünü hakkında bilgi almak istiyorum.`,
      )}`
    : null;

  return (
    <div className="space-y-6">
      {/* fiyat */}
      <div>
        {priceSource.listGrossKurus ? (
          <p className="tnum text-sm text-muted line-through">
            {formatKurus(priceSource.listGrossKurus)}
          </p>
        ) : null}
        <p className="tnum font-display text-3xl text-ink">
          {formatKurus(priceSource.grossKurus)}
        </p>
        <p className="mt-1 text-sm text-muted">
          KDV dahil · <strong className="font-medium text-ink-soft">1 düzine</strong>{" "}
          fiyatıdır
        </p>
        <p className="tnum text-xs text-muted">
          KDV hariç {formatKurus(priceSource.netKurus)}
        </p>
        {priceSource.listGrossKurus ? (
          <p className="mt-1 inline-block rounded bg-ok-soft px-2 py-0.5 text-xs font-medium text-ok">
            Size özel bayi fiyatı
          </p>
        ) : null}
      </div>

      {/* seçenekler */}
      {!singleVariant
        ? product.optionTypes.map((type) => (
            <div key={type.id}>
              <p className="mb-2 text-sm font-medium text-ink-soft">{type.name}</p>
              <div className="flex flex-wrap gap-2">
                {type.values.map((value) => {
                  const state = availabilityOf(type.id, value.id);
                  const active = selected[type.id] === value.id;
                  const disabled = state !== "var";

                  return (
                    <button
                      key={value.id}
                      type="button"
                      disabled={disabled}
                      aria-pressed={active}
                      onClick={() => {
                        setSelected((current) => ({ ...current, [type.id]: value.id }));
                        setQuantity(1);
                      }}
                      className={cn(
                        "rounded-md border px-3 py-2 text-sm transition-colors",
                        active
                          ? "border-ink bg-ink text-white"
                          : "border-line text-ink-soft hover:border-ink",
                        disabled &&
                          "cursor-not-allowed border-line text-muted line-through hover:border-line",
                      )}
                      title={state === "tukendi" ? "Tükendi" : undefined}
                    >
                      {value.value}
                    </button>
                  );
                })}
              </div>
            </div>
          ))
        : null}

      {/* adet + sepet */}
      <div className="space-y-3">
        {variant && variant.available > 0 ? (
          <div className="flex items-center gap-3">
            <label htmlFor="adet" className="text-sm text-ink-soft">
              Adet
            </label>
            <div className="flex items-center rounded-md border border-line">
              <button
                type="button"
                aria-label="Azalt"
                onClick={() => setQuantity((n) => Math.max(1, n - 1))}
                className="px-3 py-2 text-ink-soft hover:bg-surface-alt"
              >
                −
              </button>
              <input
                id="adet"
                value={quantity}
                onChange={(event) => {
                  const next = Number(event.target.value.replace(/\D/g, ""));
                  setQuantity(Math.min(maxQuantity, Math.max(1, next || 1)));
                }}
                inputMode="numeric"
                className="tnum w-14 border-x border-line py-2 text-center focus:outline-none"
              />
              <button
                type="button"
                aria-label="Artır"
                onClick={() => setQuantity((n) => Math.min(maxQuantity, n + 1))}
                className="px-3 py-2 text-ink-soft hover:bg-surface-alt"
              >
                +
              </button>
            </div>
            <span className="text-xs text-muted">düzine</span>
          </div>
        ) : null}

        <Button
          size="lg"
          className="w-full"
          onClick={submit}
          disabled={!variant || variant.available <= 0 || isPending}
        >
          {isPending
            ? "Ekleniyor…"
            : !variant
              ? "Seçim yapın"
              : variant.available <= 0
                ? "Tükendi"
                : "Sepete ekle"}
        </Button>

        {feedback ? (
          <p
            role="status"
            className={cn(
              "rounded-md px-3 py-2 text-center text-sm",
              feedback.ok ? "bg-ok-soft text-ok" : "bg-danger-soft text-danger",
            )}
          >
            {feedback.text}
            {feedback.ok ? (
              <>
                {" "}
                <a href="/sepet" className="font-medium underline">
                  Sepete git
                </a>
              </>
            ) : null}
          </p>
        ) : null}

        {whatsappHref ? (
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-12 w-full items-center justify-center gap-2 rounded-md border border-line text-sm font-medium text-ink-soft transition-colors hover:border-ink hover:text-ink"
          >
            WhatsApp&apos;tan sipariş ver
          </a>
        ) : null}

        <p className="text-center text-xs text-muted">
          Ödeme mağazada alınır. Site üzerinden ödeme yapılmaz.
        </p>
      </div>

      {variant?.sku ? (
        <p className="text-xs text-muted">Ürün kodu: {variant.sku}</p>
      ) : null}
    </div>
  );
}

function findVariant(
  product: ProductDetail,
  chosenIds: string[],
  singleVariant: ProductDetail["variants"][number] | null,
) {
  if (singleVariant) return singleVariant;
  if (chosenIds.length !== product.optionTypes.length) return null;

  const target = [...chosenIds].sort().join("|");
  return (
    product.variants.find(
      (candidate) => [...candidate.optionValueIds].sort().join("|") === target,
    ) ?? null
  );
}
