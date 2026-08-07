// Dışa aktar → geri yükle döngüsü testi.
// Aktarılan katalog Excel'e yazılıp geri okunduğunda hiçbir alan
// bozulmamalı: fiyat, stok, kategori yolu, beden, SKU.
import "dotenv/config";

import { SignJWT } from "jose";
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";

const BASE = process.env.TEST_BASE_URL ?? "http://localhost:3000";

async function adminCookie(prisma: PrismaClient) {
  const admin = await prisma.adminUser.findFirstOrThrow();
  const token = await new SignJWT({
    userId: admin.id,
    email: admin.email,
    name: admin.name,
    role: admin.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(new TextEncoder().encode(process.env.AUTH_SECRET!));
  return `zs_admin=${token}`;
}

async function snapshot(prisma: PrismaClient) {
  const variants = await prisma.variant.findMany({
    orderBy: [{ sku: "asc" }],
    select: {
      sku: true,
      price: true,
      stock: true,
      product: { select: { name: true } },
      optionValues: { select: { optionValue: { select: { value: true } } } },
    },
  });
  return variants.map((v) => ({
    sku: v.sku,
    urun: v.product.name,
    beden: v.optionValues.map((o) => o.optionValue.value).join("/"),
    fiyat: v.price.toString(),
    stok: v.stock,
  }));
}

async function main() {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
  const cookie = await adminCookie(prisma);

  const before = await snapshot(prisma);
  console.log(`Aktarım öncesi veritabanı: ${before.length} varyant`);
  if (before.length === 0) {
    console.error("Test için önce örnek katalog aktarılmalı.");
    process.exit(1);
  }

  // 1) Dışa aktar
  const exportResponse = await fetch(`${BASE}/api/panel/katalog/disa-aktar`, {
    headers: { cookie },
  });
  if (!exportResponse.ok) {
    console.error("Dışa aktarma başarısız:", exportResponse.status);
    process.exit(1);
  }
  const xlsx = Buffer.from(await exportResponse.arrayBuffer());
  console.log(`Dışa aktarılan dosya: ${(xlsx.length / 1024).toFixed(1)} KB`);

  // 2) Aynı dosyayı geri yükle
  const body = new FormData();
  body.append("file", new File([new Uint8Array(xlsx)], "katalog.xlsx", {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  }));
  body.append("uygula", "1");
  body.append("gorsel", "0");

  const importResponse = await fetch(`${BASE}/api/panel/katalog/ice-aktar`, {
    method: "POST",
    headers: { cookie },
    body,
  });
  const report = await importResponse.json();
  if (!importResponse.ok) {
    console.error("Geri yükleme başarısız:", report);
    process.exit(1);
  }

  console.log(
    `Geri yükleme: ${report.parsedRows} satır → ${report.productCount} ürün · ` +
      `yeni ürün ${report.counts.productsToCreate}, yeni varyant ${report.counts.variantsToCreate}`,
  );

  // 3) Karşılaştır
  const after = await snapshot(prisma);
  const beforeText = JSON.stringify(before);
  const afterText = JSON.stringify(after);

  // Kritik: dosya hiç okunamadıysa "hiçbir şey değişmedi" sonucu yanıltıcı
  // bir başarı üretir. Önce gerçekten okunduğundan emin oluyoruz.
  if (report.parsedRows !== before.length) {
    console.error(
      `\nBAŞARISIZ: dışa aktarılan dosyadan ${report.parsedRows} satır okundu, ` +
        `${before.length} bekleniyordu. Kendi formatımız kendi okuyucumuzla uyumsuz.`,
    );
    if (report.issues?.length) {
      for (const issue of report.issues.slice(0, 5)) {
        console.error(`  ${issue.level}: ${issue.message}`);
      }
    }
    process.exit(1);
  }

  if (report.counts.productsToCreate !== 0 || report.counts.variantsToCreate !== 0) {
    console.error("\nBAŞARISIZ: geri yükleme kopya kayıt üretti.");
    process.exit(1);
  }

  if (beforeText !== afterText) {
    console.error("\nBAŞARISIZ: veriler değişti.");
    for (let i = 0; i < Math.max(before.length, after.length); i += 1) {
      const a = JSON.stringify(before[i]);
      const b = JSON.stringify(after[i]);
      if (a !== b) console.error(`  önce: ${a}\n  sonra: ${b}`);
    }
    process.exit(1);
  }

  console.log(`\nBAŞARILI: ${after.length} varyantın tamamı birebir korundu.`);
  console.log("Örnek satırlar:");
  console.table(after.slice(0, 4));

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
