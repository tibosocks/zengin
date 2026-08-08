import type { Metadata } from "next";

import { ProductGrid } from "@/components/shop/product-card";
import { getCustomerSession } from "@/lib/auth";
import { getProductCards, getViewerDiscount } from "@/lib/shop/catalog";

export const metadata: Metadata = { title: "Yeni Ürünler" };
export const dynamic = "force-dynamic";

export default async function NewProductsPage() {
  const session = await getCustomerSession();
  const { discountPercent } = await getViewerDiscount(session?.customerId);

  const { items, total } = await getProductCards({
    isNew: true,
    take: 48,
    sort: "yeni",
    discountPercent,
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
      <h1 className="font-display text-3xl text-ink">Yeni Ürünler</h1>
      <p className="mt-1 mb-6 text-sm text-muted">{total} ürün</p>
      {items.length === 0 ? (
        <p className="py-16 text-center text-muted">Henüz yeni ürün yok.</p>
      ) : (
        <ProductGrid products={items} />
      )}
    </div>
  );
}
