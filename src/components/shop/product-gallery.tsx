import { ImageOff } from "lucide-react";
import Image from "next/image";

/**
 * Ürün görseli. Tek görsel gösterilir: renkli ürünlerde seçili rengin
 * fotoğrafı, diğerlerinde kapak. Hangi görselin geleceğine ProductView
 * karar verir.
 */
export function ProductGallery({
  image,
  productName,
}: {
  image: { url: string; alt: string | null } | null;
  productName: string;
}) {
  if (!image) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-card border border-line bg-surface-alt text-muted">
        <div className="text-center">
          <ImageOff className="mx-auto size-10" strokeWidth={1.25} />
          <p className="mt-2 text-sm">Görsel yok</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative aspect-square overflow-hidden rounded-card border border-line bg-surface-alt">
      <Image
        src={image.url}
        alt={image.alt ?? productName}
        fill
        sizes="(max-width: 1024px) 100vw, 50vw"
        priority
        className="object-cover"
        unoptimized
      />
    </div>
  );
}
