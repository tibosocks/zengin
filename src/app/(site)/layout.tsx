import Link from "next/link";

import { SiteHeader } from "@/components/shop/site-header";
import { getMenuTree } from "@/lib/shop/catalog";

export const dynamic = "force-dynamic";

export default async function SiteLayout({ children }: LayoutProps<"/">) {
  const menu = await getMenuTree();

  return (
    <>
      <SiteHeader menu={menu} />

      <main className="flex-1">{children}</main>

      <footer className="mt-16 border-t border-line bg-surface-alt">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4 lg:px-8">
          <div>
            <p className="font-display text-lg text-ink">Zengin Socks</p>
            <p className="mt-2 text-sm text-muted">
              Toptan çorap satışı. Siparişinizi buradan verin, ödemeyi mağazada
              yapın.
            </p>
          </div>

          <div>
            <p className="mb-3 text-sm font-medium text-ink">Kategoriler</p>
            <ul className="space-y-1.5 text-sm text-muted">
              {menu.slice(0, 5).map((category) => (
                <li key={category.id}>
                  <Link
                    href={`/kategori/${category.slug}`}
                    className="hover:text-ink"
                  >
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="mb-3 text-sm font-medium text-ink">Kurumsal</p>
            <ul className="space-y-1.5 text-sm text-muted">
              <li>
                <Link href="/sayfa/hakkimizda" className="hover:text-ink">
                  Hakkımızda
                </Link>
              </li>
              <li>
                <Link href="/sayfa/iletisim" className="hover:text-ink">
                  İletişim
                </Link>
              </li>
              <li>
                <Link href="/sayfa/kvkk" className="hover:text-ink">
                  KVKK Aydınlatma Metni
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <p className="mb-3 text-sm font-medium text-ink">Bayilik</p>
            <ul className="space-y-1.5 text-sm text-muted">
              <li>
                <Link href="/bayi-girisi" className="hover:text-ink">
                  Bayi girişi
                </Link>
              </li>
              <li>
                <Link href="/bayi-basvurusu" className="hover:text-ink">
                  Bayi başvurusu
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-line">
          <div className="mx-auto max-w-7xl px-4 py-4 text-xs text-muted lg:px-8">
            © {new Date().getFullYear()} Zengin Socks
          </div>
        </div>
      </footer>
    </>
  );
}
