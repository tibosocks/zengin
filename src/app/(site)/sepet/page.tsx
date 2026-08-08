import type { Metadata } from "next";
import Link from "next/link";

import { CartTable } from "@/components/shop/cart-table";
import { buttonStyles } from "@/components/ui/button";
import { getCart } from "@/lib/shop/cart";

export const metadata: Metadata = { title: "Sepet", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function CartPage() {
  const cart = await getCart();

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 lg:px-8">
      <h1 className="mb-6 font-display text-3xl text-ink">Sepet</h1>

      {cart.items.length === 0 ? (
        <div className="rounded-card border border-line bg-white px-6 py-16 text-center">
          <p className="text-ink">Sepetiniz boş.</p>
          <Link href="/" className={`${buttonStyles({ variant: "secondary" })} mt-4`}>
            Ürünlere göz atın
          </Link>
        </div>
      ) : (
        <CartTable cart={cart} />
      )}
    </div>
  );
}
