import { ImageOff } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { formatKurus } from "@/lib/price";
import type { ProductCardData } from "@/lib/shop/catalog";

export function ProductCard({ product }: { product: ProductCardData }) {
  return (
    <Link
      href={`/urun/${product.slug}`}
      className="group flex flex-col overflow-hidden rounded-card border border-line bg-white transition-colors hover:border-ink"
    >
      <div className="relative aspect-square overflow-hidden bg-surface-alt">
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            unoptimized
          />
        ) : (
          <div className="flex size-full items-center justify-center text-muted">
            <ImageOff className="size-8" strokeWidth={1.25} />
          </div>
        )}

        {!product.inStock ? (
          <span className="absolute inset-x-0 bottom-0 bg-ink/80 py-1.5 text-center text-xs font-medium text-white">
            Tükendi
          </span>
        ) : product.isNew ? (
          <span className="absolute top-2 left-2 rounded bg-ink px-2 py-0.5 text-[11px] font-medium text-white">
            Yeni
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-1 p-3">
        <p className="text-xs text-muted">Zengin</p>
        <h3 className="line-clamp-2 text-sm font-medium text-ink">{product.name}</h3>

        <div className="mt-auto pt-2">
          {product.listGrossKurus ? (
            <p className="tnum text-xs text-muted line-through">
              {formatKurus(product.listGrossKurus)}
            </p>
          ) : null}
          <p className="tnum text-base font-semibold text-ink">
            {formatKurus(product.grossKurus)}
          </p>
          {/* Toptan satış: fiyat düzine üzerinden. Bunu yazmazsak müşteri
              tek çift fiyatı sanıyor. */}
          <p className="text-[11px] text-muted">KDV dahil · düzine</p>
        </div>
      </div>
    </Link>
  );
}

export function ProductGrid({ products }: { products: ProductCardData[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
