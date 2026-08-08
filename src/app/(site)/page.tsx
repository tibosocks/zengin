import Link from "next/link";

import { ProductGrid } from "@/components/shop/product-card";
import { buttonStyles } from "@/components/ui/button";
import { getCustomerSession } from "@/lib/auth";
import { getMenuTree, getProductCards, getViewerDiscount } from "@/lib/shop/catalog";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await getCustomerSession();
  const { discountPercent } = await getViewerDiscount(session?.customerId);

  const [menu, newest] = await Promise.all([
    getMenuTree(),
    getProductCards({ isNew: true, take: 8, sort: "yeni", discountPercent }),
  ]);

  const fallback =
    newest.items.length === 0
      ? await getProductCards({ take: 8, discountPercent })
      : null;

  const products = fallback?.items ?? newest.items;

  return (
    <>
      <section className="border-b border-line bg-surface-alt">
        <div className="mx-auto max-w-7xl px-4 py-16 text-center lg:px-8">
          <h1 className="font-display text-3xl text-ink sm:text-4xl">
            Toptan Çorap
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-muted">
            Kadın, erkek, çocuk ve bebe çorapları. Siparişinizi buradan verin,
            ödemeyi mağazada yapın.
          </p>
          <Link href="/yeni-urunler" className={`${buttonStyles()} mt-6`}>
            Yeni ürünlere göz atın
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 lg:px-8">
        <h2 className="mb-5 font-display text-2xl text-ink">Kategoriler</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {menu.map((category) => (
            <Link
              key={category.id}
              href={`/kategori/${category.slug}`}
              className="rounded-card border border-line bg-white p-5 transition-colors hover:border-ink"
            >
              <p className="font-medium text-ink">{category.name}</p>
              <p className="mt-1 text-xs text-muted">
                {category.children.length} alt kategori
              </p>
            </Link>
          ))}
        </div>
      </section>

      {products.length > 0 ? (
        <section className="mx-auto max-w-7xl px-4 pb-12 lg:px-8">
          <div className="mb-5 flex items-end justify-between">
            <h2 className="font-display text-2xl text-ink">
              {fallback ? "Ürünler" : "Yeni Ürünler"}
            </h2>
            <Link href="/yeni-urunler" className="text-sm text-muted hover:text-ink">
              Tümü →
            </Link>
          </div>
          <ProductGrid products={products} />
        </section>
      ) : null}
    </>
  );
}
