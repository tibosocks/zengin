// "İndir, fiyat sütununu değiştir, geri yükle" senaryosu.
import "dotenv/config";

import { SignJWT } from "jose";
import { PrismaPg } from "@prisma/adapter-pg";
import readXlsxFile from "read-excel-file/node";
import writeXlsxFile from "write-excel-file/node";
import { Readable } from "node:stream";

import { PrismaClient } from "../src/generated/prisma/client";

const BASE = process.env.TEST_BASE_URL ?? "http://localhost:3000";

async function main() {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
  const admin = await prisma.adminUser.findFirstOrThrow();
  const token = await new SignJWT({
    userId: admin.id, email: admin.email, name: admin.name, role: admin.role,
  }).setProtectedHeader({ alg: "HS256" }).setIssuedAt()
    .setExpirationTime("10m").sign(new TextEncoder().encode(process.env.AUTH_SECRET!));
  const cookie = `zs_admin=${token}`;

  const before = await prisma.variant.findMany({
    orderBy: { sku: "asc" }, select: { sku: true, price: true, stock: true },
  });
  console.log("Önce:", before.slice(0, 3).map((v) => `${v.sku}=${v.price}`).join("  "));

  // indir
  const xlsx = Buffer.from(
    await (await fetch(`${BASE}/api/panel/katalog/disa-aktar`, { headers: { cookie } })).arrayBuffer(),
  );

  // fiyat sütununu %25 artır (kullanıcının Excel'de yapacağı şey)
  const sheets = (await readXlsxFile(Readable.from(xlsx))) as unknown as Array<{ data: unknown[][] }>;
  const table = sheets[0].data;
  const priceCol = (table[0] as string[]).findIndex((h) => String(h).startsWith("Fiyat"));
  console.log(`Fiyat sütunu: ${priceCol} ("${table[0][priceCol]}")`);

  for (let i = 1; i < table.length; i += 1) {
    const current = Number(String(table[i][priceCol]).replace(",", "."));
    table[i][priceCol] = (Math.round(current * 125) / 100).toFixed(2);
  }

  const data = table.map((row, i) =>
    (row as unknown[]).map((v) =>
      i === 0 ? { value: String(v ?? ""), fontWeight: "bold" as const }
              : { value: v === null || v === undefined ? "" : String(v), type: String }));
  const edited = await writeXlsxFile(data, { sheet: "Ürünler" }).toBuffer();

  // geri yükle
  const body = new FormData();
  body.append("file", new File([new Uint8Array(edited)], "zamli.xlsx"));
  body.append("uygula", "1");
  body.append("gorsel", "0");
  const report = await (await fetch(`${BASE}/api/panel/katalog/ice-aktar`, {
    method: "POST", headers: { cookie }, body,
  })).json();

  console.log(
    `Geri yükleme: ${report.parsedRows} satır · yeni ürün ${report.counts.productsToCreate} · ` +
      `güncellenen varyant ${report.counts.variantsToUpdate}`,
  );

  const after = await prisma.variant.findMany({
    orderBy: { sku: "asc" }, select: { sku: true, price: true, stock: true },
  });

  let ok = true;
  for (let i = 0; i < before.length; i += 1) {
    const expected = Math.round(Number(before[i].price) * 125) / 100;
    const actual = Number(after[i].price);
    if (Math.abs(expected - actual) > 0.001) {
      console.error(`  HATA ${before[i].sku}: beklenen ${expected}, gelen ${actual}`);
      ok = false;
    }
    if (before[i].stock !== after[i].stock) {
      console.error(`  HATA ${before[i].sku}: stok değişti ${before[i].stock} -> ${after[i].stock}`);
      ok = false;
    }
  }

  console.log("Sonra:", after.slice(0, 3).map((v) => `${v.sku}=${v.price}`).join("  "));
  console.log(ok ? "\nBAŞARILI: tüm fiyatlar %25 arttı, stoklar değişmedi." : "\nBAŞARISIZ");
  await prisma.$disconnect();
  if (!ok) process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
