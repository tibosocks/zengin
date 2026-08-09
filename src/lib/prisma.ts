import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";

// Geliştirmede hot reload her seferinde yeni client üretmesin diye global'de
// tutuyoruz; yoksa bağlantı havuzu kısa sürede doluyor.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL tanımlı değil. Yerelde .env dosyasını (örnek: .env.example), " +
        "Railway'de servis değişkenlerini kontrol edin.",
    );
  }

  return new PrismaClient({
    adapter: new PrismaPg({
      connectionString,

      // Zaman aşımları şart. Railway'in genel TCP proxy'si boşta kalan
      // bağlantıyı sessizce düşürüyor; varsayılan ayarlarla sorgu sonsuza
      // kadar bekliyor, hata bile fırlatmıyor. Uzun süren aktarımlar
      // böyle saatlerce asılı kaldı.
      connectionTimeoutMillis: 15_000,
      idleTimeoutMillis: 30_000,
      statement_timeout: 60_000,
      query_timeout: 60_000,
      // Ölü bağlantıyı erken fark etmek için TCP keepalive
      keepAlive: true,
      keepAliveInitialDelayMillis: 10_000,
    }),
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

function getClient(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createClient();
  }
  return globalForPrisma.prisma;
}

/**
 * Client TEMBEL oluşturulur: ilk gerçek sorguda, modül yüklenirken değil.
 *
 * Sebebi: `next build` "collecting page data" aşamasında her sayfa modülünü
 * içe aktarıyor. Derleme ortamında DATABASE_URL yoksa (Railway'de derleme ve
 * çalışma değişkenleri ayrı olabiliyor) import anında hata fırlatılırsa
 * derleme komple çöküyor — sayfalar `force-dynamic` olsa ve tek bir sorgu
 * çalışmasa bile.
 *
 * Proxy sayesinde `prisma.product.findMany()` çağrılana kadar hiçbir bağlantı
 * kurulmuyor, hiçbir hata fırlatılmıyor.
 */
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const client = getClient();
    const value = Reflect.get(client, property) as unknown;
    // $transaction, $connect gibi metotların `this` bağı korunmalı
    return typeof value === "function" ? value.bind(client) : value;
  },
});
