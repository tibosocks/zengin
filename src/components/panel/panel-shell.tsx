"use client";

import {
  Bell,
  FolderTree,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Settings,
  ShoppingCart,
  Users,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";

import { adminLogout } from "@/lib/actions/auth";
import type { AdminSession } from "@/lib/auth";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/panel", label: "Özet", icon: LayoutDashboard, exact: true },
  { href: "/panel/siparisler", label: "Siparişler", icon: ShoppingCart },
  { href: "/panel/urunler", label: "Ürünler", icon: Package },
  { href: "/panel/kategoriler", label: "Kategoriler", icon: FolderTree },
  { href: "/panel/musteriler", label: "Müşteriler", icon: Users },
  { href: "/panel/ayarlar", label: "Ayarlar", icon: Settings },
];

function isActive(pathname: string, href: string, exact?: boolean) {
  return exact ? pathname === href : pathname.startsWith(href);
}

export function PanelShell({
  session,
  unreadCount,
  children,
}: {
  session: AdminSession;
  unreadCount: number;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const nav = (
    <nav className="space-y-0.5">
      {NAV.map((item) => {
        const active = isActive(pathname, item.href, item.exact);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMobileOpen(false)}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
              active
                ? "bg-ink text-white"
                : "text-ink-soft hover:bg-line-soft hover:text-ink",
            )}
          >
            <Icon className="size-4 shrink-0" strokeWidth={1.75} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="flex min-h-screen bg-surface-alt">
      {/* masaüstü yan menü */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-line bg-white lg:flex">
        <div className="flex h-16 items-center border-b border-line px-5">
          <Link href="/panel">
            <Image
              src="/brand/logo.png"
              alt="Zengin Socks"
              width={1499}
              height={414}
              className="h-6 w-auto"
              priority
            />
          </Link>
        </div>
        <div className="flex-1 overflow-y-auto p-3">{nav}</div>
        <UserBox session={session} />
      </aside>

      {/* mobil çekmece */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Menüyü kapat"
            className="absolute inset-0 bg-ink/40"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-64 flex-col bg-white">
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
            <div className="flex-1 overflow-y-auto p-3">{nav}</div>
            <UserBox session={session} />
          </aside>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-white px-4 lg:px-8">
          <button
            type="button"
            aria-label="Menü"
            onClick={() => setMobileOpen(true)}
            className="rounded p-2 text-ink-soft hover:bg-line-soft lg:hidden"
          >
            <Menu className="size-5" />
          </button>

          <div className="flex-1" />

          <Link
            href="/panel/bildirimler"
            aria-label={
              unreadCount > 0
                ? `Bildirimler — ${unreadCount} okunmamış`
                : "Bildirimler"
            }
            className="relative rounded p-2 text-ink-soft hover:bg-line-soft"
          >
            <Bell className="size-5" strokeWidth={1.75} />
            {unreadCount > 0 ? (
              <span className="tnum absolute top-0.5 right-0.5 flex min-w-4 items-center justify-center rounded-full bg-warn px-1 text-[10px] font-medium text-white">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            ) : null}
          </Link>

          <Link
            href="/"
            target="_blank"
            className="hidden text-sm text-muted hover:text-ink sm:block"
          >
            Siteyi gör ↗
          </Link>
        </header>

        <main className="flex-1 p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

function UserBox({ session }: { session: AdminSession }) {
  return (
    <div className="border-t border-line p-3">
      <div className="mb-2 px-3">
        <p className="truncate text-sm font-medium text-ink">{session.name}</p>
        <p className="truncate text-xs text-muted">{session.email}</p>
      </div>
      <form action={adminLogout}>
        <button
          type="submit"
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-ink-soft transition-colors hover:bg-line-soft hover:text-ink"
        >
          <LogOut className="size-4" strokeWidth={1.75} />
          Çıkış yap
        </button>
      </form>
    </div>
  );
}
