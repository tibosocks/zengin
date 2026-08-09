import {
  ArrowRight,
  Boxes,
  ImageOff,
  Layers,
  MessageCircle,
  Store,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { ProductGrid } from "@/components/shop/product-card";
import { buttonStyles } from "@/components/ui/button";
import { getCustomerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getCatalogStats,
  getCategoryHighlights,
  getProductCards,
  getViewerDiscount,
} from "@/lib/shop/catalog";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await getCustomerSession();
  const { discountPercent } = await getViewerDiscount(session?.customerId);

  const [categories, stats, featured, newest, whatsapp] = await Promise.all([
    getCategoryHighlights(),
    getCatalogStats(),
    getProductCards({ isFeatured: true, take: 8, discountPercent }),
    getProductCards({ take: 8, sort: "yeni", discountPercent }),
    prisma.setting.findUnique({ where: { key: "whatsappNumber" } }),
  ]);

  // Panelde hiçbir ürün "öne çıkan" işaretlenmemiş olabilir; o durumda
  // vitrin boş kalmasın diye en son eklenenler gösteriliyor.
  const showcase =
    featured.items.length > 0
      ? { title: "Öne çıkan ürünler", items: featured.items }
      : { title: "Kataloğumuzdan", items: newest.items };

  const whatsappHref = whatsapp?.value
    ? `https://wa.me/${whatsapp.value.replace(/\D/g, "")}`
    : null;

  return (
    <>
      {/* --- giriş ------------------------------------------------------ */}
      <section className="border-b border-line bg-surface-alt">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:gap-16 lg:px-8 lg:py-24">
          <div>
            <p className="text-sm font-medium tracking-wide text-muted uppercase">
              Zengin Socks · Toptan
            </p>
            <h1 className="mt-3 font-display text-4xl leading-tight text-ink sm:text-5xl">
              Çorapta toptan çözüm ortağınız
            </h1>
            <p className="mt-4 max-w-xl text-lg leading-relaxed text-ink-soft">
              Kadın, erkek, çocuk ve bebe gruplarında {stats.products} ürün.
              Tüm fiyatlar <strong className="text-ink">düzine</strong> üzerinden
              ve KDV hariç gösterilir.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/yeni-urunler" className={buttonStyles({ size: "lg" })}>
                Ürünleri inceleyin
                <ArrowRight className="size-4" />
              </Link>
              <Link
                href="/sayfa/iletisim"
                className={buttonStyles({ variant: "secondary", size: "lg" })}
              >
                Bize ulaşın
              </Link>
            </div>

            <dl className="mt-10 grid max-w-md grid-cols-3 gap-6 border-t border-line pt-6">
              {[
                { value: stats.products, label: "ürün" },
                { value: stats.variants, label: "beden & renk" },
                { value: stats.categories, label: "ana grup" },
              ].map((item) => (
                <div key={item.label}>
                  <dt className="tnum font-display text-2xl text-ink">
                    {item.value}
                  </dt>
                  <dd className="text-sm text-muted">{item.label}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Kategori görsellerinden mozaik — ayrı bir tanıtım görseli
              tutmuyoruz, katalogdaki gerçek ürünler gösteriliyor.
              Sağ sütun bilerek aşağı kaydırılıyor; eşit kutulardan oluşan
              düz ızgara katalog sayfası gibi duruyordu. */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {categories.slice(0, 4).map((category, index) => (
              <Link
                key={category.id}
                href={`/kategori/${category.slug}`}
                className={`group relative aspect-square overflow-hidden rounded-card border border-line bg-surface ${
                  index % 2 === 1 ? "lg:translate-y-8" : ""
                }`}
              >
                {category.imageUrl ? (
                  <Image
                    src={category.imageUrl}
                    alt={category.name}
                    fill
                    sizes="(max-width: 1024px) 45vw, 22vw"
                    className="object-contain p-3 transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex size-full items-center justify-center text-muted">
                    <ImageOff className="size-7" strokeWidth={1.25} />
                  </div>
                )}
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/80 to-transparent px-3 pt-8 pb-2.5 text-sm font-medium text-white">
                  {category.name}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* --- çalışma şeklimiz -------------------------------------------- */}
      <section className="border-b border-line">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4 lg:px-8">
          {[
            {
              icon: Layers,
              title: "Düzine satış",
              text: "Tüm ürünler düzine birimiyle satılır, listelenen fiyat bir düzinenin fiyatıdır.",
            },
            {
              icon: Boxes,
              title: "Geniş beden ve renk",
              text: "Kadın, erkek, çocuk ve bebe gruplarında bambu, penye, havlu ve yün seçenekleri.",
            },
            {
              icon: Store,
              title: "Ödeme mağazada",
              text: "Site üzerinden ödeme alınmaz. Siparişinizi iletirsiniz, ödemeyi mağazada yaparsınız.",
            },
            {
              icon: MessageCircle,
              title: "WhatsApp desteği",
              text: "Ürün, stok ve termin sorularınız için doğrudan yazabilirsiniz.",
            },
          ].map((item) => (
            <div key={item.title}>
              <item.icon className="size-5 text-ink" strokeWidth={1.5} />
              <h3 className="mt-3 font-medium text-ink">{item.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">
                {item.text}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* --- kategoriler -------------------------------------------------- */}
      <section className="mx-auto max-w-7xl px-4 py-14 lg:px-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl text-ink sm:text-3xl">
              Ürün grupları
            </h2>
            <p className="mt-1 text-sm text-muted">
              Dört ana grupta {stats.products} ürün
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((category) => (
            <div
              key={category.id}
              className="group flex flex-col overflow-hidden rounded-card border border-line bg-white transition-colors hover:border-ink"
            >
              <Link
                href={`/kategori/${category.slug}`}
                className="relative aspect-square overflow-hidden bg-surface-alt"
              >
                {category.imageUrl ? (
                  <Image
                    src={category.imageUrl}
                    alt={category.name}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    className="object-contain p-4 transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex size-full items-center justify-center text-muted">
                    <ImageOff className="size-8" strokeWidth={1.25} />
                  </div>
                )}
              </Link>

              <div className="flex flex-1 flex-col p-4">
                <Link href={`/kategori/${category.slug}`}>
                  <h3 className="font-display text-lg text-ink">{category.name}</h3>
                </Link>
                <p className="mt-0.5 text-xs text-muted">
                  {category.productCount} ürün
                </p>

                {category.children.length > 0 ? (
                  <ul className="mt-3 space-y-1 border-t border-line-soft pt-3">
                    {category.children.map((child) => (
                      <li key={child.slug}>
                        <Link
                          href={`/kategori/${child.slug}`}
                          className="text-sm text-ink-soft hover:text-ink hover:underline"
                        >
                          {child.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : null}

                <Link
                  href={`/kategori/${category.slug}`}
                  className="mt-auto inline-flex items-center gap-1 pt-4 text-sm font-medium text-ink hover:gap-2"
                >
                  Tümünü gör
                  <ArrowRight className="size-3.5 transition-all" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* --- ürün vitrini -------------------------------------------------- */}
      {showcase.items.length > 0 ? (
        <section className="border-y border-line bg-surface-alt">
          <div className="mx-auto max-w-7xl px-4 py-14 lg:px-8">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
              <h2 className="font-display text-2xl text-ink sm:text-3xl">
                {showcase.title}
              </h2>
              <Link
                href="/yeni-urunler"
                className="inline-flex items-center gap-1 text-sm font-medium text-ink-soft hover:gap-2 hover:text-ink"
              >
                Tüm ürünler
                <ArrowRight className="size-3.5 transition-all" />
              </Link>
            </div>
            <ProductGrid products={showcase.items} />
          </div>
        </section>
      ) : null}

      {/* --- nasıl çalışır -------------------------------------------------- */}
      <section className="mx-auto max-w-7xl px-4 py-14 lg:px-8">
        <h2 className="font-display text-2xl text-ink sm:text-3xl">
          Sipariş nasıl veriliyor
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Sitemiz bir ödeme sistemi değil, sipariş toplama kanalı. Üç adımda
          tamamlanıyor.
        </p>

        <ol className="mt-8 grid gap-8 sm:grid-cols-3">
          {[
            {
              title: "Sepetinizi hazırlayın",
              text: "Beden ve rengi seçip düzine adedini girin. Fiyatlar KDV hariç, düzine üzerinden.",
            },
            {
              title: "Siparişi iletin",
              text: "İletişim bilgilerinizi bırakın. Siparişiniz bize ulaştığında sizi arayıp teyit ediyoruz.",
            },
            {
              title: "Mağazada ödeyin",
              text: "Ürünleri teslim alırken ödemeyi mağazamızda yaparsınız. Site üzerinden tahsilat yok.",
            },
          ].map((step, index) => (
            <li key={step.title} className="border-t-2 border-ink pt-4">
              <span className="tnum font-display text-3xl text-ink">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-2 font-medium text-ink">{step.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">
                {step.text}
              </p>
            </li>
          ))}
        </ol>
      </section>

      {/* --- iletişim çağrısı ------------------------------------------- */}
      <section className="border-t border-line bg-ink">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-14 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="max-w-2xl">
            <h2 className="font-display text-2xl text-white sm:text-3xl">
              Aradığınızı bulamadınız mı?
            </h2>
            <p className="mt-2 leading-relaxed text-white/70">
              Stok durumu, termin ve toptan alım koşulları için bize doğrudan
              yazın. Kataloğa girmemiş modellerimiz de olabiliyor.
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap gap-3">
            {whatsappHref ? (
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-white px-6 text-sm font-medium text-ink transition-opacity hover:opacity-90"
              >
                <MessageCircle className="size-4" />
                WhatsApp&apos;tan yazın
              </a>
            ) : null}
            <Link
              href="/sayfa/iletisim"
              className="inline-flex h-11 items-center justify-center rounded-md border border-white/25 px-6 text-sm font-medium text-white transition-colors hover:bg-white/10"
            >
              İletişim bilgileri
            </Link>
          </div>
        </div>
      </section>

    </>
  );
}
