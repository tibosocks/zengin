"use client";

import { ImageOff } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

import { cn } from "@/lib/utils";

export function ProductGallery({
  images,
  productName,
}: {
  images: Array<{ url: string; alt: string | null }>;
  productName: string;
}) {
  const [active, setActive] = useState(0);

  if (images.length === 0) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-card border border-line bg-surface-alt text-muted">
        <div className="text-center">
          <ImageOff className="mx-auto size-10" strokeWidth={1.25} />
          <p className="mt-2 text-sm">Görsel yok</p>
        </div>
      </div>
    );
  }

  const current = images[Math.min(active, images.length - 1)];

  return (
    <div className="space-y-3">
      <div className="relative aspect-square overflow-hidden rounded-card border border-line bg-surface-alt">
        <Image
          src={current.url}
          alt={current.alt ?? productName}
          fill
          sizes="(max-width: 1024px) 100vw, 50vw"
          priority
          className="object-cover"
          unoptimized
        />
      </div>

      {images.length > 1 ? (
        <div className="grid grid-cols-5 gap-2 sm:grid-cols-6">
          {images.map((image, index) => (
            <button
              key={image.url}
              type="button"
              onClick={() => setActive(index)}
              aria-label={`${index + 1}. görsel`}
              aria-current={index === active}
              className={cn(
                "relative aspect-square overflow-hidden rounded border bg-surface-alt transition-colors",
                index === active ? "border-ink" : "border-line hover:border-muted",
              )}
            >
              <Image
                src={image.url}
                alt=""
                fill
                sizes="80px"
                className="object-cover"
                unoptimized
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
