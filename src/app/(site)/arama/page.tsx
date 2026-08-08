import type { Metadata } from "next";

import { ProductGrid } from "@/components/shop/product-card";
import { getCustomerSession } from "@/lib/auth";
import { getProductCards, getViewerDiscount } from "@/lib/shop/catalog";

export const metadata: Metadata = { title: "Arama", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function SearchPage({ searchParams }: PageProps<"/arama">) {
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q.trim() : "";

  const session = await getCustomerSession();
  const { discountPercent } = await getViewerDiscount(session?.customerId);

  const { items, total } =
    query === ""
      ? { items: [], total: 0 }
      : await getProductCards({ search: query, take: 48, discountPercent });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
      <h1 className="font-display text-2xl text-ink">
        {query ? `"${query}" için sonuçlar` : "Arama"}
      </h1>
      <p className="mt-1 mb-6 text-sm text-muted">
        {query ? `${total} ürün bulundu` : "Aramak istediğiniz ürünü yazın."}
      </p>
      {items.length > 0 ? <ProductGrid products={items} /> : null}
      {query && items.length === 0 ? (
        <p className="py-16 text-center text-muted">
          Sonuç bulunamadı. Farklı bir kelime deneyin.
        </p>
      ) : null}
    </div>
  );
}
