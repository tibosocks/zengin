import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";

// Geliştirmede hot reload her seferinde yeni client üretmesin diye global'de
// tutuyoruz; yoksa bağlantı havuzu kısa sürede doluyor.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL tanımlı değil. .env dosyasını kontrol edin (örnek: .env.example).",
    );
  }

  return new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
    log:
      process.env.NODE_ENV === "development"
        ? ["warn", "error"]
        : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
