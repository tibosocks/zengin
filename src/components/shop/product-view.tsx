"use client";

import { useState } from "react";

import { ProductBuyBox } from "@/components/shop/product-buy-box";
import { ProductGallery } from "@/components/shop/product-gallery";
import type { ProductDetail, ProductDetailImage } from "@/lib/shop/catalog";

/**
 * Ürün detayının üst yarısı: galeri ile satın alma kutusu aynı seçim
 * durumunu paylaşır. Renk seçimi galeriyi de değiştirdiği için durum
 * ikisinin de üstünde, burada tutuluyor.
 */
export function ProductView({
  product,
  whatsappNumber,
}: {
  product: ProductDetail;
  whatsappNumber: string | null;
}) {
  const colorType = findColorType(product);
  const singleVariant = product.variants.length === 1 ? product.variants[0] : null;

  const [selected, setSelected] = useState<Record<string, string>>(() =>
    initialSelection(product, colorType, singleVariant),
  );

  const image = pickImage(product.images, colorType ? selected[colorType.id] : null);

  return (
    <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
      <ProductGallery image={image} productName={product.name} />

      <div>
        <p className="text-sm text-muted">Zengin</p>
        <h1 className="mt-1 mb-4 font-display text-2xl text-ink sm:text-3xl">
          {product.name}
        </h1>

        {product.shortDesc ? (
          <p className="mb-5 text-ink-soft">{product.shortDesc}</p>
        ) : null}

        <ProductBuyBox
          product={product}
          whatsappNumber={whatsappNumber}
          selected={selected}
          onSelect={setSelected}
        />
      </div>
    </div>
  );
}

type ColorType = ProductDetail["optionTypes"][number] | null;

/** Renk seçeneği. Ticimax'ten gelen adlar "Renk" olarak normalize edildi. */
function findColorType(product: ProductDetail): ColorType {
  return (
    product.optionTypes.find(
      (type) => type.name.trim().toLocaleLowerCase("tr") === "renk",
    ) ?? null
  );
}

/**
 * Tek görsel gösteriyoruz: renk seçiliyse o rengin görseli, değilse kapak.
 *
 * Aktarılan üründe aynı fotoğrafın birden çok kopyası olabiliyor; küçük
 * görsel şeridi bunları üst üste tekrar ettiği için kaldırıldı.
 */
function pickImage(
  images: ProductDetailImage[],
  colorValueId: string | null | undefined,
): ProductDetailImage | null {
  if (colorValueId) {
    const match = images.find((image) => image.optionValueId === colorValueId);
    if (match) return match;
  }
  return images[0] ?? null;
}

/**
 * Açılışta renk seçili gelir — müşteri hiçbir şeye dokunmadan bir varyantın
 * görselini ve fiyatını görsün diye. Beden bilerek boş bırakılıyor.
 */
function initialSelection(
  product: ProductDetail,
  colorType: ColorType,
  singleVariant: ProductDetail["variants"][number] | null,
): Record<string, string> {
  if (singleVariant) {
    return Object.fromEntries(
      product.optionTypes.map((type, index) => [
        type.id,
        singleVariant.optionValueIds[index] ?? "",
      ]),
    );
  }

  if (!colorType) return {};

  const inStock = new Set(
    product.variants
      .filter((variant) => variant.available > 0)
      .flatMap((variant) => variant.optionValueIds),
  );

  // Kapak görselinin rengi varsayılan olsun; listede görülen fotoğrafla
  // ürüne girildiğinde görülen fotoğraf aynı olur.
  const coverColorId = product.images[0]?.optionValueId;
  const coverValue = colorType.values.find((value) => value.id === coverColorId);

  const preferred =
    (coverValue && inStock.has(coverValue.id) ? coverValue : null) ??
    colorType.values.find((value) => inStock.has(value.id)) ??
    coverValue ??
    colorType.values[0];

  return preferred ? { [colorType.id]: preferred.id } : {};
}
