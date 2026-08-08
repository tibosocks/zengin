"use client";

import { Menu, Search, ShoppingBag, User, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import type { MenuCategory } from "@/lib/shop/catalog";
import { cn } from "@/lib/utils";

export function SiteHeader({
  menu,
  cartCount,
}: {
  menu: MenuCategory[];
  cartCount: number;
}) {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  function search(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = query.trim();
    if (trimmed === "") return;
    setMobileOpen(false);
    router.push(`/arama?q=${encodeURIComponent(trimmed)}`);
  }

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 lg:px-8">
        <button
          type="button"
          aria-label="Menü"
          onClick={() => setMobileOpen(true)}
          className="rounded p-2 text-ink-soft hover:bg-line-soft lg:hidden"
        >
          <Menu className="size-5" />
        </button>

        <Link href="/" className="shrink-0" aria-label="Zengin Socks ana sayfa">
          <Image
            src="/brand/logo.png"
            alt="Zengin Socks"
            width={1499}
            height={414}
            priority
            className="h-7 w-auto"
          />
        </Link>

        {/* masaüstü menü */}
        <nav className="hidden flex-1 items-center justify-center gap-1 lg:flex">
          {menu.map((category) => (
            <div
              key={category.id}
              className="relative"
              onMouseEnter={() => setOpenMenu(category.id)}
              onMouseLeave={() => setOpenMenu(null)}
            >
              <Link
                href={`/kategori/${category.slug}`}
                className="block px-3 py-2 text-sm font-medium text-ink-soft transition-colors hover:text-ink"
              >
                {category.name}
              </Link>

              {category.children.length > 0 && openMenu === category.id ? (
                <div className="absolute top-full left-0 min-w-56 rounded-b-card border border-t-0 border-line bg-white py-2 shadow-sm">
                  {category.children.map((child) => (
                    <div key={child.id}>
                      <Link
                        href={`/kategori/${child.slug}`}
                        className="block px-4 py-1.5 text-sm text-ink-soft hover:bg-surface-alt hover:text-ink"
                      >
                        {child.name}
                      </Link>
                      {child.children.map((grand) => (
                        <Link
                          key={grand.id}
                          href={`/kategori/${grand.slug}`}
                          className="block py-1 pr-4 pl-8 text-sm text-muted hover:bg-surface-alt hover:text-ink"
                        >
                          {grand.name}
                        </Link>
                      ))}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
          <Link
            href="/yeni-urunler"
            className="px-3 py-2 text-sm font-medium text-ink-soft transition-colors hover:text-ink"
          >
            Yeni Ürünler
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-1">
          <form onSubmit={search} className="hidden md:block">
            <label className="relative block">
              <span className="sr-only">Ürün ara</span>
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Ara…"
                className="h-9 w-40 rounded-md border border-line bg-white pr-3 pl-8 text-sm placeholder:text-muted focus:w-56 focus:border-ink focus:outline-none"
              />
            </label>
          </form>

          <Link
            href="/hesabim"
            aria-label="Hesabım"
            className="rounded p-2 text-ink-soft hover:bg-line-soft"
          >
            <User className="size-5" strokeWidth={1.75} />
          </Link>
          <Link
            href="/sepet"
            aria-label={
              cartCount > 0 ? `Sepet — ${cartCount} ürün` : "Sepet"
            }
            className="relative rounded p-2 text-ink-soft hover:bg-line-soft"
          >
            <ShoppingBag className="size-5" strokeWidth={1.75} />
            {cartCount > 0 ? (
              <span className="tnum absolute -top-0.5 -right-0.5 flex size-4.5 min-w-4.5 items-center justify-center rounded-full bg-ink px-1 text-[10px] font-medium text-white">
                {cartCount > 99 ? "99+" : cartCount}
              </span>
            ) : null}
          </Link>
        </div>
      </div>

      {/* mobil çekmece */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Menüyü kapat"
            className="absolute inset-0 bg-ink/40"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 flex w-80 max-w-[85vw] flex-col bg-white">
            <div className="flex h-16 items-center justify-between border-b border-line px-4">
              <Image
                src="/brand/logo.png"
                alt="Zengin Socks"
                width={1499}
                height={414}
                className="h-6 w-auto"
              />
              <button
                type="button"
                aria-label="Kapat"
                onClick={() => setMobileOpen(false)}
                className="rounded p-1 text-muted hover:text-ink"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={search} className="border-b border-line p-4">
              <label className="relative block">
                <span className="sr-only">Ürün ara</span>
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Ürün ara…"
                  className="h-10 w-full rounded-md border border-line pr-3 pl-9 text-sm focus:border-ink focus:outline-none"
                />
              </label>
            </form>

            <nav className="flex-1 overflow-y-auto p-2">
              {menu.map((category) => (
                <div key={category.id} className="py-1">
                  <Link
                    href={`/kategori/${category.slug}`}
                    onClick={() => setMobileOpen(false)}
                    className="block rounded px-3 py-2 font-medium text-ink hover:bg-surface-alt"
                  >
                    {category.name}
                  </Link>
                  {category.children.map((child) => (
                    <Link
                      key={child.id}
                      href={`/kategori/${child.slug}`}
                      onClick={() => setMobileOpen(false)}
                      className="block rounded py-1.5 pr-3 pl-6 text-sm text-ink-soft hover:bg-surface-alt"
                    >
                      {child.name}
                    </Link>
                  ))}
                </div>
              ))}
              <Link
                href="/yeni-urunler"
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "mt-1 block rounded px-3 py-2 font-medium text-ink hover:bg-surface-alt",
                )}
              >
                Yeni Ürünler
              </Link>
            </nav>
          </div>
        </div>
      ) : null}
    </header>
  );
}
