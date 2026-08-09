import type { NextConfig } from "next";

/**
 * Uzak görsel kaynakları.
 *
 * Bunlar tanımlı olmadan `next/image` uzak adresleri optimize etmeyi
 * reddediyor; proje bu yüzden her yerde `unoptimized` kullanıyordu ve
 * tarayıcı 250 piksellik ürün kartı için 1600 piksellik dosyayı indiriyordu.
 *
 * Adres `R2_PUBLIC_URL`'den okunuyor ki bucket `cdn.zenginsocks.com`'a
 * taşındığında burayı elle düzeltmek gerekmesin. Değişken yoksa (yerel
 * geliştirme) bilinen iki alan adı yedek olarak duruyor.
 */
function remoteImagePatterns() {
  const patterns: Array<{ protocol: "https"; hostname: string }> = [
    { protocol: "https", hostname: "cdn.zenginsocks.com" },
    { protocol: "https", hostname: "pub-04b03e2e7ed64307bd8bec014f06e204.r2.dev" },
  ];

  const publicUrl = process.env.R2_PUBLIC_URL;
  if (publicUrl) {
    try {
      const { hostname } = new URL(publicUrl);
      if (!patterns.some((pattern) => pattern.hostname === hostname)) {
        patterns.push({ protocol: "https", hostname });
      }
    } catch {
      // Bozuk değer derlemeyi durdurmasın; yedek alan adları devrede kalır
    }
  }

  return patterns;
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns: remoteImagePatterns(),
    // Ürün görselleri kapak/kart/detay olarak bu genişliklerde çıkıyor.
    // Varsayılan liste 8 boy üretiyor, her boy ayrı dönüştürme demek.
    imageSizes: [64, 96, 128, 256, 384],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    // Dosya adları içerik bazlı (uuid), aynı adres asla değişmiyor —
    // dönüştürülmüş kopya uzun süre saklanabilir.
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
};

export default nextConfig;
