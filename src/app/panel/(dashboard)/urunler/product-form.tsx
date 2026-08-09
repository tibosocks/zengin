"use client";

import { ArrowLeft, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Card, CardHeader } from "@/components/ui/surface";
import { deleteProduct, saveProduct } from "@/lib/actions/products";
import type { CategoryOption } from "@/lib/category-tree";
import { slugify } from "@/lib/slug";
import { cn } from "@/lib/utils";

import { ImageUploader, type ImageDraft } from "./image-uploader";
import { VariantEditor, type OptionTypeData, type VariantDraft } from "./variant-editor";

export interface ProductFormData {
  id?: string;
  name: string;
  slug: string;
  shortDesc: string;
  description: string;
  isActive: boolean;
  isNew: boolean;
  isFeatured: boolean;
  metaTitle: string;
  metaDescription: string;
  categoryIds: string[];
  primaryCategoryId: string | null;
  images: ImageDraft[];
  variants: VariantDraft[];
}

export function ProductForm({
  initial,
  categories,
  optionTypes,
  defaultVatRate,
}: {
  initial: ProductFormData;
  categories: CategoryOption[];
  optionTypes: OptionTypeData[];
  defaultVatRate: string;
}) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const slugTouched = useRef(Boolean(initial.id));

  function set<K extends keyof ProductFormData>(key: K, value: ProductFormData[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  // Görsellere renk atayabilmek için ürünün varyantlarında gerçekten
  // kullanılan renk değerleri; katalogdaki tüm renkler değil.
  const usedValueIds = new Set(form.variants.flatMap((variant) => variant.optionValueIds));
  const colorValues =
    optionTypes
      .find((type) => type.name.trim().toLocaleLowerCase("tr") === "renk")
      ?.values.filter((value) => usedValueIds.has(value.id)) ?? [];

  function handleName(value: string) {
    setForm((current) => ({
      ...current,
      name: value,
      slug: slugTouched.current ? current.slug : slugify(value),
    }));
  }

  function toggleCategory(id: string) {
    setForm((current) => {
      const has = current.categoryIds.includes(id);
      const categoryIds = has
        ? current.categoryIds.filter((item) => item !== id)
        : [...current.categoryIds, id];

      // Ana kategori listeden çıkarıldıysa ilk kalana devret
      const primaryCategoryId =
        current.primaryCategoryId && categoryIds.includes(current.primaryCategoryId)
          ? current.primaryCategoryId
          : (categoryIds[0] ?? null);

      return { ...current, categoryIds, primaryCategoryId };
    });
  }

  function submit() {
    setError(null);

    if (form.variants.length === 0) {
      setError("En az bir varyant oluşturmalısınız.");
      return;
    }
    const missingPrice = form.variants.find(
      (variant) => variant.price.trim() === "" || Number(variant.price.replace(",", ".")) <= 0,
    );
    if (missingPrice) {
      setError(`"${missingPrice.optionLabel}" varyantının fiyatı girilmemiş.`);
      return;
    }

    startTransition(async () => {
      const result = await saveProduct({
        id: form.id,
        name: form.name,
        slug: form.slug,
        shortDesc: form.shortDesc,
        description: form.description,
        isActive: form.isActive,
        isNew: form.isNew,
        isFeatured: form.isFeatured,
        metaTitle: form.metaTitle,
        metaDescription: form.metaDescription,
        categoryIds: form.categoryIds,
        primaryCategoryId: form.primaryCategoryId,
        images: form.images.map((image) => ({
          id: image.id,
          url: image.url,
          alt: image.alt,
          optionValueId: image.optionValueId ?? null,
        })),
        variants: form.variants.map((variant) => ({
          id: variant.id,
          optionValueIds: variant.optionValueIds,
          sku: variant.sku,
          price: variant.price.replace(",", "."),
          vatRate: variant.vatRate.replace(",", "."),
          stock: variant.stock,
          lowStockThreshold: variant.lowStockThreshold,
          isActive: variant.isActive,
        })),
      });

      if (result.ok) {
        router.push("/panel/urunler");
        router.refresh();
      } else {
        setError(result.error ?? "Kaydedilemedi.");
      }
    });
  }

  function handleDelete() {
    if (!form.id) return;
    if (!confirm(`"${form.name}" silinsin mi?`)) return;

    startTransition(async () => {
      const result = await deleteProduct(form.id!);
      if (result.error) alert(result.error);
      router.push("/panel/urunler");
      router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5 pb-24">
      <div className="flex items-center gap-3">
        <Link
          href="/panel/urunler"
          className="rounded p-1.5 text-muted hover:bg-line-soft hover:text-ink"
          aria-label="Ürün listesine dön"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="font-display text-2xl text-ink">
          {form.id ? form.name || "Ürünü düzenle" : "Yeni ürün"}
        </h1>
      </div>

      {/* 1 — temel bilgiler */}
      <Card>
        <CardHeader title="Temel bilgiler" />
        <div className="space-y-4 p-5">
          <Field label="Ürün adı" htmlFor="name">
            <Input
              id="name"
              value={form.name}
              onChange={(event) => handleName(event.target.value)}
              placeholder="Kadın Penye Patik Emojili"
              autoFocus={!form.id}
            />
          </Field>

          <Field label="Adres (slug)" htmlFor="slug" hint="boş bırakılırsa addan üretilir">
            <Input
              id="slug"
              value={form.slug}
              onChange={(event) => {
                slugTouched.current = true;
                set("slug", event.target.value);
              }}
            />
          </Field>

          <Field label="Kısa açıklama" htmlFor="shortDesc">
            <Input
              id="shortDesc"
              value={form.shortDesc}
              onChange={(event) => set("shortDesc", event.target.value)}
              placeholder="Ürün kartında görünen tek satırlık açıklama"
            />
          </Field>

          <Field label="Açıklama" htmlFor="description">
            <Textarea
              id="description"
              value={form.description}
              onChange={(event) => set("description", event.target.value)}
              rows={5}
            />
          </Field>

          <div className="flex flex-wrap gap-6">
            {(
              [
                ["isActive", "Aktif"],
                ["isNew", "Yeni ürün"],
                ["isFeatured", "Öne çıkan"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 text-sm text-ink-soft">
                <input
                  type="checkbox"
                  checked={form[key]}
                  onChange={(event) => set(key, event.target.checked)}
                  className="size-4 accent-ink"
                />
                {label}
              </label>
            ))}
          </div>
        </div>
      </Card>

      {/* 2 — kategoriler */}
      <Card>
        <CardHeader
          title="Kategoriler"
          description="Birden fazla seçebilirsiniz. İlk seçilen ana kategori olur; ürün yolu ondan kurulur."
        />
        <div className="p-5">
          {categories.length === 0 ? (
            <p className="text-sm text-muted">
              Henüz kategori yok.{" "}
              <Link href="/panel/kategoriler" className="underline">
                Kategori ekleyin
              </Link>
              .
            </p>
          ) : (
            <ul className="max-h-72 space-y-0.5 overflow-y-auto">
              {categories.map((category) => {
                const checked = form.categoryIds.includes(category.id);
                const isPrimary = form.primaryCategoryId === category.id;
                return (
                  <li key={category.id}>
                    <div
                      className="flex items-center gap-2 rounded px-2 py-1 hover:bg-surface-alt"
                      style={{ paddingLeft: `${category.depth * 20 + 8}px` }}
                    >
                      <input
                        type="checkbox"
                        id={`cat-${category.id}`}
                        checked={checked}
                        onChange={() => toggleCategory(category.id)}
                        className="size-4 accent-ink"
                      />
                      <label
                        htmlFor={`cat-${category.id}`}
                        className="flex-1 cursor-pointer text-sm text-ink-soft"
                      >
                        {category.name}
                      </label>
                      {checked ? (
                        <button
                          type="button"
                          onClick={() => set("primaryCategoryId", category.id)}
                          className={cn(
                            "rounded px-2 py-0.5 text-xs",
                            isPrimary
                              ? "bg-ink text-white"
                              : "text-muted hover:bg-line-soft hover:text-ink",
                          )}
                        >
                          {isPrimary ? "Ana kategori" : "Ana yap"}
                        </button>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </Card>

      {/* 3 — görseller */}
      <Card>
        <CardHeader title="Görseller" />
        <div className="p-5">
          <ImageUploader
            images={form.images}
            colorValues={colorValues}
            onChange={(images) => set("images", images)}
          />
        </div>
      </Card>

      {/* 4 — varyantlar */}
      <Card>
        <CardHeader
          title="Varyantlar"
          description="Bedenleri seçin, tablo otomatik oluşsun. Fiyatlar KDV hariç."
        />
        <div className="p-5">
          <VariantEditor
            optionTypes={optionTypes}
            variants={form.variants}
            defaultVatRate={defaultVatRate}
            onChange={(variants) => set("variants", variants)}
          />
        </div>
      </Card>

      {/* 5 — SEO */}
      <Card>
        <CardHeader title="SEO" description="Boş bırakılırsa ürün bilgilerinden üretilir." />
        <div className="space-y-4 p-5">
          <Field label="Meta başlık" htmlFor="metaTitle">
            <Input
              id="metaTitle"
              value={form.metaTitle}
              onChange={(event) => set("metaTitle", event.target.value)}
            />
          </Field>
          <Field label="Meta açıklama" htmlFor="metaDescription">
            <Textarea
              id="metaDescription"
              value={form.metaDescription}
              onChange={(event) => set("metaDescription", event.target.value)}
              rows={2}
            />
          </Field>
        </div>
      </Card>

      {error ? (
        <p
          role="alert"
          className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger"
        >
          {error}
        </p>
      ) : null}

      {/* kaydet çubuğu — uzun formda hep erişilebilir olmalı */}
      <div className="sticky bottom-0 -mx-4 flex items-center justify-between gap-3 border-t border-line bg-white px-4 py-3 lg:-mx-8 lg:px-8">
        {form.id ? (
          <Button variant="ghost" onClick={handleDelete} disabled={isPending} className="hover:text-danger">
            <Trash2 className="size-4" />
            Sil
          </Button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <Link href="/panel/urunler" className="text-sm text-muted hover:text-ink self-center">
            Vazgeç
          </Link>
          <Button onClick={submit} disabled={isPending}>
            {isPending ? "Kaydediliyor…" : "Kaydet"}
          </Button>
        </div>
      </div>
    </div>
  );
}
