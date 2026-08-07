"use client";

import { Search, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { indentOption, type CategoryOption } from "@/lib/category-tree";

export function ProductFilters({
  categories,
}: {
  categories: CategoryOption[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");

  function apply(changes: Record<string, string>) {
    const next = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    next.delete("sayfa"); // filtre değişince ilk sayfaya dön
    router.push(`/panel/urunler?${next.toString()}`);
  }

  const hasFilters =
    searchParams.get("q") ||
    searchParams.get("kategori") ||
    searchParams.get("stok") ||
    searchParams.get("durum");

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          apply({ q: query });
        }}
        className="relative min-w-56 flex-1"
      >
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Ürün adı veya SKU ara…"
          className="pl-9"
          aria-label="Ürün ara"
        />
      </form>

      <Select
        value={searchParams.get("kategori") ?? ""}
        onChange={(event) => apply({ kategori: event.target.value })}
        aria-label="Kategori filtresi"
        className="w-auto min-w-44"
      >
        <option value="">Tüm kategoriler</option>
        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {indentOption(category.depth)}
            {category.name}
          </option>
        ))}
      </Select>

      <Select
        value={searchParams.get("stok") ?? ""}
        onChange={(event) => apply({ stok: event.target.value })}
        aria-label="Stok filtresi"
        className="w-auto min-w-36"
      >
        <option value="">Tüm stoklar</option>
        <option value="bitti">Stoğu bitenler</option>
        <option value="kritik">Kritik stok</option>
      </Select>

      <Select
        value={searchParams.get("durum") ?? ""}
        onChange={(event) => apply({ durum: event.target.value })}
        aria-label="Durum filtresi"
        className="w-auto min-w-32"
      >
        <option value="">Tüm durumlar</option>
        <option value="aktif">Aktif</option>
        <option value="pasif">Pasif</option>
      </Select>

      {hasFilters ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setQuery("");
            router.push("/panel/urunler");
          }}
        >
          <X className="size-4" />
          Temizle
        </Button>
      ) : null}
    </div>
  );
}
