import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { CheckoutForm } from "@/components/shop/checkout-form";
import { formatKurus } from "@/lib/price";
import { getCart } from "@/lib/shop/cart";

export const metadata: Metadata = {
  title: "Siparişi tamamla",
  robots: { index: false },
};
export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const cart = await getCart();

  // Boş sepetle sipariş formuna girmenin anlamı yok
  if (cart.items.length === 0) redirect("/sepet");

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 lg:px-8">
      <h1 className="mb-2 font-display text-3xl text-ink">Siparişi tamamla</h1>
      <p className="mb-8 text-sm text-muted">
        Bilgilerinizi bırakın, sizi arayalım. <strong>Site üzerinden ödeme
        alınmaz</strong> — ödemeyi ürünleri teslim alırken mağazada yaparsınız.
      </p>

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <CheckoutForm />

        <aside className="lg:order-last">
          <div className="rounded-card border border-line bg-white p-5">
            <h2 className="mb-3 font-medium text-ink">Sipariş özeti</h2>

            <ul className="mb-4 space-y-3 text-sm">
              {cart.items.map((item) => (
                <li key={item.variantId} className="flex justify-between gap-3">
                  <span className="min-w-0 text-ink-soft">
                    <span className="line-clamp-2">{item.productName}</span>
                    <span className="text-muted">
                      {item.optionLabel ? `${item.optionLabel} · ` : ""}
                      {item.quantity} düzine
                    </span>
                  </span>
                  <span className="tnum shrink-0 text-ink">
                    {formatKurus(item.lineGrossKurus)}
                  </span>
                </li>
              ))}
            </ul>

            <dl className="space-y-1.5 border-t border-line pt-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted">KDV hariç</dt>
                <dd className="tnum text-ink-soft">
                  {formatKurus(cart.subtotalNetKurus)}
                </dd>
              </div>
              {cart.discountKurus > 0 ? (
                <div className="flex justify-between">
                  <dt className="text-ok">Bayi indirimi</dt>
                  <dd className="tnum text-ok">
                    −{formatKurus(cart.discountKurus)}
                  </dd>
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
              href="/sepet"
              className="mt-4 block text-center text-sm text-muted hover:text-ink"
            >
              Sepeti düzenle
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
