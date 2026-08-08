"use client";

import { AlertTriangle, ImageOff, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { buttonStyles } from "@/components/ui/button";
import { removeCartLine, updateCartLine } from "@/lib/actions/cart";
import { formatKurus } from "@/lib/price";
import type { CartSummary } from "@/lib/shop/cart";

export function CartTable({ cart }: { cart: CartSummary }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function change(variantId: string, quantity: number) {
    startTransition(async () => {
      await updateCartLine(variantId, quantity);
      router.refresh();
    });
  }

  function remove(variantId: string) {
    startTransition(async () => {
      await removeCartLine(variantId);
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      {cart.problems.length > 0 ? (
        <div className="rounded-md bg-warn-soft p-3">
          <p className="mb-1 flex items-center gap-2 text-sm font-medium text-warn">
            <AlertTriangle className="size-4" />
            Sepetinizde değişiklik oldu
          </p>
          <ul className="space-y-0.5 text-sm text-ink-soft">
            {cart.problems.map((problem) => (
              <li key={problem}>{problem}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="divide-y divide-line rounded-card border border-line bg-white">
        {cart.items.map((item) => (
          <div key={item.variantId} className="flex gap-4 p-4">
            <div className="relative size-20 shrink-0 overflow-hidden rounded border border-line bg-surface-alt">
              {item.imageUrl ? (
                <Image
                  src={item.imageUrl}
                  alt=""
                  fill
                  sizes="80px"
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <div className="flex size-full items-center justify-center text-muted">
                  <ImageOff className="size-5" strokeWidth={1.25} />
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <Link
                href={`/urun/${item.productSlug}`}
                className="font-medium text-ink hover:underline"
              >
                {item.productName}
              </Link>
              {item.optionLabel ? (
                <p className="text-sm text-muted">{item.optionLabel}</p>
              ) : null}
              {item.sku ? (
                <p className="text-xs text-muted">{item.sku}</p>
              ) : null}

              <div className="mt-2 flex flex-wrap items-center gap-3">
                <div className="flex items-center rounded-md border border-line">
                  <button
                    type="button"
                    aria-label="Azalt"
                    disabled={isPending}
                    onClick={() => change(item.variantId, item.quantity - 1)}
                    className="px-2.5 py-1.5 text-ink-soft hover:bg-surface-alt disabled:opacity-50"
                  >
                    −
                  </button>
                  <span className="tnum w-10 border-x border-line py-1.5 text-center text-sm">
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    aria-label="Artır"
                    disabled={isPending || item.quantity >= item.available}
                    onClick={() => change(item.variantId, item.quantity + 1)}
                    className="px-2.5 py-1.5 text-ink-soft hover:bg-surface-alt disabled:opacity-50"
                  >
                    +
                  </button>
                </div>
                <span className="text-xs text-muted">
                  düzine · birim {formatKurus(item.unitGrossKurus)}
                </span>

                <button
                  type="button"
                  onClick={() => remove(item.variantId)}
                  disabled={isPending}
                  className="ml-auto rounded p-1.5 text-muted hover:text-danger"
                  aria-label="Sepetten çıkar"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>

            <div className="shrink-0 text-right">
              <p className="tnum font-semibold text-ink">
                {formatKurus(item.lineGrossKurus)}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* toplam */}
      <div className="rounded-card border border-line bg-white p-5">
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted">Ara toplam (KDV hariç)</dt>
            <dd className="tnum text-ink-soft">
              {formatKurus(cart.subtotalNetKurus)}
            </dd>
          </div>
          {cart.discountKurus > 0 ? (
            <div className="flex justify-between">
              <dt className="text-ok">
                Bayi indiriminiz (%{cart.discountPercent})
              </dt>
              <dd className="tnum text-ok">−{formatKurus(cart.discountKurus)}</dd>
            </div>
          ) : null}
          <div className="flex justify-between">
            <dt className="text-muted">KDV</dt>
            <dd className="tnum text-ink-soft">{formatKurus(cart.vatKurus)}</dd>
          </div>
          <div className="flex justify-between border-t border-line pt-2 text-base">
            <dt className="font-medium text-ink">Toplam</dt>
            <dd className="tnum font-semibold text-ink">
              {formatKurus(cart.totalGrossKurus)}
            </dd>
          </div>
        </dl>

        <Link
          href="/siparis"
          className={`${buttonStyles({ size: "lg" })} mt-5 w-full`}
        >
          Siparişi tamamla
        </Link>
        <p className="mt-2 text-center text-xs text-muted">
          Ödeme mağazada alınır. Site üzerinden ödeme yapılmaz.
        </p>
      </div>
    </div>
  );
}
