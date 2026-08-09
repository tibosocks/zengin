"use client";

import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ImagePlus, Loader2, X } from "lucide-react";
import Image from "next/image";
import { useRef, useState } from "react";

import { cn } from "@/lib/utils";

export interface ImageDraft {
  key: string;
  id?: string;
  url: string;
  alt?: string;
  /** Görsel bir renge aitse o renk seçeneğinin değeri. Vitrinde o renk
      seçildiğinde bu görsel gösterilir. */
  optionValueId?: string | null;
}

export function ImageUploader({
  images,
  colorValues,
  onChange,
}: {
  images: ImageDraft[];
  /** Ürünün varyantlarında kullanılan renk değerleri. Boşsa renk seçimi çıkmaz. */
  colorValues: Array<{ id: string; value: string }>;
  onChange: (next: ImageDraft[]) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  async function upload(files: FileList | File[]) {
    const list = Array.from(files);
    if (list.length === 0) return;

    setUploading(true);
    setError(null);

    try {
      const body = new FormData();
      for (const file of list) body.append("files", file);

      const response = await fetch("/api/panel/upload", {
        method: "POST",
        body,
      });
      const payload = await response.json();

      if (!response.ok) {
        setError(payload.error ?? "Yükleme başarısız.");
        return;
      }

      onChange([
        ...images,
        ...payload.images.map((image: { url: string }, index: number) => ({
          key: `up-${Date.now()}-${index}`,
          url: image.url,
        })),
      ]);
    } catch {
      setError("Yükleme sırasında bağlantı hatası oluştu.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = images.findIndex((image) => image.key === active.id);
    const newIndex = images.findIndex((image) => image.key === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    onChange(arrayMove(images, oldIndex, newIndex));
  }

  return (
    <div className="space-y-3">
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragActive(false);
          void upload(event.dataTransfer.files);
        }}
        className={cn(
          "rounded-md border-2 border-dashed px-4 py-6 text-center transition-colors",
          dragActive ? "border-ink bg-surface-alt" : "border-line",
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          multiple
          onChange={(event) => event.target.files && void upload(event.target.files)}
          className="sr-only"
          id="image-upload"
        />
        <label
          htmlFor="image-upload"
          className="inline-flex cursor-pointer flex-col items-center gap-2 text-sm text-muted"
        >
          {uploading ? (
            <>
              <Loader2 className="size-6 animate-spin text-ink" />
              Yükleniyor…
            </>
          ) : (
            <>
              <ImagePlus className="size-6" strokeWidth={1.5} />
              <span>
                Görselleri buraya sürükleyin veya{" "}
                <span className="font-medium text-ink underline">seçin</span>
              </span>
              <span className="text-xs">
                JPG, PNG, WebP · otomatik WebP&apos;ye çevrilir
              </span>
            </>
          )}
        </label>
      </div>

      {error ? (
        <p className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}

      {images.length > 0 ? (
        <>
          <p className="text-xs text-muted">
            İlk görsel kapak olarak kullanılır. Sürükleyerek sırayı değiştirin.
            {colorValues.length > 0
              ? " Renk seçilen görsel, vitrinde o renk seçildiğinde gösterilir."
              : null}
          </p>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={images.map((image) => image.key)}
              strategy={rectSortingStrategy}
            >
              <ul className="grid grid-cols-3 gap-3 sm:grid-cols-5">
                {images.map((image, index) => (
                  <ImageTile
                    key={image.key}
                    image={image}
                    isCover={index === 0}
                    colorValues={colorValues}
                    onColorChange={(optionValueId) =>
                      onChange(
                        images.map((item) =>
                          item.key === image.key ? { ...item, optionValueId } : item,
                        ),
                      )
                    }
                    onRemove={() =>
                      onChange(images.filter((item) => item.key !== image.key))
                    }
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        </>
      ) : null}
    </div>
  );
}

function ImageTile({
  image,
  isCover,
  colorValues,
  onColorChange,
  onRemove,
}: {
  image: ImageDraft;
  isCover: boolean;
  colorValues: Array<{ id: string; value: string }>;
  onColorChange: (optionValueId: string | null) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: image.key });

  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      }}
      className="space-y-1"
    >
      <div className="group relative aspect-square overflow-hidden rounded-md border border-line bg-surface-alt">
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label="Sürükleyerek sırala"
          className="block size-full cursor-grab touch-none active:cursor-grabbing"
        >
          <Image
            src={image.url}
            alt={image.alt ?? ""}
            fill
            sizes="160px"
            className="object-cover"
            unoptimized
          />
        </button>

        {isCover ? (
          <span className="absolute top-1 left-1 rounded bg-ink px-1.5 py-0.5 text-[10px] font-medium text-white">
            Kapak
          </span>
        ) : null}

        <button
          type="button"
          onClick={onRemove}
          aria-label="Görseli kaldır"
          className="absolute top-1 right-1 rounded bg-white/90 p-1 text-ink-soft opacity-0 transition-opacity group-hover:opacity-100 hover:text-danger focus-visible:opacity-100"
        >
          <X className="size-3.5" />
        </button>
      </div>

      {colorValues.length > 0 ? (
        <select
          value={image.optionValueId ?? ""}
          onChange={(event) => onColorChange(event.target.value || null)}
          aria-label="Görselin rengi"
          className="w-full rounded border border-line bg-white px-1.5 py-1 text-xs text-ink-soft"
        >
          <option value="">Renk yok</option>
          {colorValues.map((value) => (
            <option key={value.id} value={value.id}>
              {value.value}
            </option>
          ))}
        </select>
      ) : null}
    </li>
  );
}
