"use client";

import { ArrowLeft, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Card, CardHeader } from "@/components/ui/surface";
import { deletePage, savePage } from "@/lib/actions/pages";
import { slugify } from "@/lib/slug";
import { cn } from "@/lib/utils";

export interface PageDraft {
  id?: string;
  title: string;
  slug: string;
  contentHtml: string;
  isActive: boolean;
  metaTitle: string;
  metaDescription: string;
}

export function PageEditor({ initial }: { initial: PageDraft }) {
  const router = useRouter();
  const [title, setTitle] = useState(initial.title);
  const [slug, setSlug] = useState(initial.slug);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  // Kullanıcı adresi elle değiştirdiyse başlıktan türetmeyi bırakıyoruz
  const slugTouched = useRef(Boolean(initial.id));

  function submit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await savePage(formData);
      if (result.ok) {
        router.push("/panel/sayfalar");
        router.refresh();
      } else {
        setError(result.error ?? "Kaydedilemedi.");
      }
    });
  }

  function handleDelete() {
    if (!initial.id) return;
    if (!confirm(`"${initial.title}" sayfası silinsin mi?`)) return;

    startTransition(async () => {
      const result = await deletePage(initial.id!);
      if (result.ok) {
        router.push("/panel/sayfalar");
        router.refresh();
      } else {
        setError(result.error ?? "Silinemedi.");
      }
    });
  }

  return (
    <form action={submit} className="space-y-5">
      {initial.id ? <input type="hidden" name="id" value={initial.id} /> : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/panel/sayfalar"
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"
        >
          <ArrowLeft className="size-4" />
          Sayfalar
        </Link>

        <div className="flex items-center gap-2">
          {initial.id ? (
            <Button
              type="button"
              variant="ghost"
              onClick={handleDelete}
              disabled={isPending}
              className="text-danger"
            >
              <Trash2 className="size-4" />
              Sil
            </Button>
          ) : null}
          <Button type="submit" disabled={isPending}>
            {isPending ? "Kaydediliyor…" : "Kaydet"}
          </Button>
        </div>
      </div>

      {error ? (
        <p className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}

      <Card>
        <CardHeader title="Sayfa" />
        <div className="space-y-4 p-5">
          <Field label="Başlık" htmlFor="title">
            <Input
              id="title"
              name="title"
              value={title}
              onChange={(event) => {
                setTitle(event.target.value);
                if (!slugTouched.current) setSlug(slugify(event.target.value));
              }}
              required
            />
          </Field>

          <Field
            label="Adres"
            htmlFor="slug"
            hint={`zenginsocks.com/sayfa/${slug || "…"}`}
          >
            <Input
              id="slug"
              name="slug"
              value={slug}
              onChange={(event) => {
                slugTouched.current = true;
                setSlug(event.target.value);
              }}
            />
          </Field>

          <Field
            label="İçerik"
            htmlFor="contentHtml"
            hint="HTML yazabilirsiniz — <p>, <h2>, <ul>, <a>"
          >
            <Textarea
              id="contentHtml"
              name="contentHtml"
              defaultValue={initial.contentHtml}
              rows={20}
              className="min-h-96 font-mono text-sm"
            />
          </Field>

          <label className="flex items-center gap-2 text-sm text-ink-soft">
            <input
              type="checkbox"
              name="isActive"
              defaultChecked={initial.isActive}
              className="size-4 rounded border-line"
            />
            Yayında
          </label>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Arama motoru"
          description="Boş bırakılırsa sayfa başlığı kullanılır."
        />
        <div className="space-y-4 p-5">
          <Field label="Meta başlık" htmlFor="metaTitle">
            <Input
              id="metaTitle"
              name="metaTitle"
              defaultValue={initial.metaTitle}
              maxLength={200}
            />
          </Field>
          <Field label="Meta açıklama" htmlFor="metaDescription">
            <Textarea
              id="metaDescription"
              name="metaDescription"
              defaultValue={initial.metaDescription}
              maxLength={400}
            />
          </Field>
        </div>
      </Card>

      <div className={cn("flex justify-end", isPending && "opacity-60")}>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Kaydediliyor…" : "Kaydet"}
        </Button>
      </div>
    </form>
  );
}
