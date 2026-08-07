"use client";

import { X } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { saveCategory } from "@/lib/actions/categories";
import { slugify } from "@/lib/slug";

import type { CategoryNode } from "./category-manager";

export function CategoryDialog({
  category,
  defaultParentId,
  allCategories,
  onClose,
}: {
  category: CategoryNode | null;
  defaultParentId: string | null;
  allCategories: Array<{ id: string; name: string; depth: number }>;
  onClose: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState(category?.name ?? "");
  const [slug, setSlug] = useState(category?.slug ?? "");
  const slugTouched = useRef(category !== null);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Esc ile kapatma — form dolduran biri için fare kadar önemli
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  function handleNameChange(value: string) {
    setName(value);
    // Kullanıcı slug'a elle dokunmadıysa addan türetmeye devam et
    if (!slugTouched.current) setSlug(slugify(value));
  }

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await saveCategory(formData);
      if (result.ok) {
        onClose();
      } else {
        setError(result.error ?? "Kaydedilemedi.");
      }
    });
  }

  // Kategoriyi kendi altına taşımayı listede baştan engelliyoruz
  const parentOptions = allCategories.filter((option) => option.id !== category?.id);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/40 p-4 sm:p-8">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={category ? "Kategori düzenle" : "Kategori ekle"}
        className="w-full max-w-lg rounded-card bg-white shadow-lg"
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-base font-semibold text-ink">
            {category ? "Kategoriyi düzenle" : "Yeni kategori"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Kapat"
            className="rounded p-1 text-muted hover:text-ink"
          >
            <X className="size-5" />
          </button>
        </div>

        <form action={handleSubmit} className="space-y-4 px-5 py-5">
          {category ? <input type="hidden" name="id" value={category.id} /> : null}

          <Field label="Kategori adı" htmlFor="name">
            <Input
              id="name"
              name="name"
              value={name}
              onChange={(event) => handleNameChange(event.target.value)}
              autoFocus
              required
            />
          </Field>

          <Field
            label="Adres (slug)"
            htmlFor="slug"
            hint="boş bırakılırsa addan üretilir"
          >
            <Input
              id="slug"
              name="slug"
              value={slug}
              onChange={(event) => {
                slugTouched.current = true;
                setSlug(event.target.value);
              }}
              placeholder="kadin-coraplari"
            />
          </Field>

          <Field label="Üst kategori" htmlFor="parentId">
            <Select
              id="parentId"
              name="parentId"
              defaultValue={defaultParentId ?? ""}
            >
              <option value="">— Ana kategori —</option>
              {parentOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {" ".repeat(option.depth * 4)}
                  {option.name}
                </option>
              ))}
            </Select>
          </Field>

          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm text-ink-soft">
              <input
                type="checkbox"
                name="isActive"
                defaultChecked={category?.isActive ?? true}
                className="size-4 accent-ink"
              />
              Aktif
            </label>
            <label className="flex items-center gap-2 text-sm text-ink-soft">
              <input
                type="checkbox"
                name="showInMenu"
                defaultChecked={category?.showInMenu ?? true}
                className="size-4 accent-ink"
              />
              Menüde göster
            </label>
          </div>

          <details className="rounded-md border border-line px-3 py-2">
            <summary className="cursor-pointer text-sm text-ink-soft">
              SEO alanları
            </summary>
            <div className="mt-3 space-y-3">
              <Field label="Meta başlık" htmlFor="metaTitle">
                <Input
                  id="metaTitle"
                  name="metaTitle"
                  defaultValue={category?.metaTitle ?? ""}
                  placeholder="Boşsa kategori adı kullanılır"
                />
              </Field>
              <Field label="Meta açıklama" htmlFor="metaDescription">
                <Textarea
                  id="metaDescription"
                  name="metaDescription"
                  defaultValue={category?.metaDescription ?? ""}
                  rows={2}
                />
              </Field>
            </div>
          </details>

          {error ? (
            <p
              role="alert"
              className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger"
            >
              {error}
            </p>
          ) : null}

          <div className="flex justify-end gap-2 border-t border-line pt-4">
            <Button type="button" variant="secondary" onClick={onClose}>
              Vazgeç
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Kaydediliyor…" : "Kaydet"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
