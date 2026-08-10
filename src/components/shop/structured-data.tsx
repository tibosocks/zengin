/**
 * Arama motorları için yapısal veri (JSON-LD).
 *
 * Ayrı dosyada: aynı `<script type="application/ld+json">` kalıbı üç sayfada
 * tekrar ediyordu ve her birinde `dangerouslySetInnerHTML` elle yazılıyordu.
 * İçerik bizim ürettiğimiz nesneden geliyor, dışarıdan HTML gelmiyor.
 */

function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/+$/, "");

/** Ana sayfada: marka kimliği ve site içi arama kutusu. */
export function OrganizationJsonLd({
  phone,
  address,
}: {
  phone?: string | null;
  address?: string | null;
}) {
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "Zengin Socks",
          url: SITE_URL || undefined,
          logo: SITE_URL ? `${SITE_URL}/brand/favicon-512.png` : undefined,
          description:
            "Kadın, erkek, çocuk ve bebe çoraplarında toptan üretim ve satış.",
          ...(phone
            ? {
                contactPoint: {
                  "@type": "ContactPoint",
                  telephone: phone,
                  contactType: "sales",
                  areaServed: "TR",
                  availableLanguage: "Turkish",
                },
              }
            : {}),
          ...(address
            ? { address: { "@type": "PostalAddress", streetAddress: address } }
            : {}),
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "Zengin Socks",
          url: SITE_URL || undefined,
          inLanguage: "tr-TR",
          potentialAction: SITE_URL
            ? {
                "@type": "SearchAction",
                target: {
                  "@type": "EntryPoint",
                  urlTemplate: `${SITE_URL}/arama?q={search_term_string}`,
                },
                "query-input": "required name=search_term_string",
              }
            : undefined,
        }}
      />
    </>
  );
}

/** Ürün ve kategori sayfalarında kırıntı yolu. */
export function BreadcrumbJsonLd({
  trail,
}: {
  /** Kökten aşağıya; "Ana sayfa" burada eklenir */
  trail: Array<{ name: string; path: string }>;
}) {
  if (!SITE_URL) return null;

  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [{ name: "Ana sayfa", path: "/" }, ...trail].map(
          (item, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: item.name,
            item: `${SITE_URL}${item.path}`,
          }),
        ),
      }}
    />
  );
}

/** Kategori sayfasında listelenen ürünler. */
export function ItemListJsonLd({
  products,
}: {
  products: Array<{ name: string; slug: string }>;
}) {
  if (!SITE_URL || products.length === 0) return null;

  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "ItemList",
        numberOfItems: products.length,
        itemListElement: products.map((product, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: product.name,
          url: `${SITE_URL}/urun/${product.slug}`,
        })),
      }}
    />
  );
}
