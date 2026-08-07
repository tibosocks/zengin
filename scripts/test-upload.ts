// Görsel yükleme uçtan uca testi: gerçek HTTP isteği, gerçek oturum çerezi.
// Çalıştırma:  npx tsx scripts/test-upload.ts
import "dotenv/config";

import { readFile } from "node:fs/promises";

import { SignJWT } from "jose";
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";

const BASE = process.env.TEST_BASE_URL ?? "http://localhost:3000";

async function main() {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
  const admin = await prisma.adminUser.findFirstOrThrow();
  await prisma.$disconnect();

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

  const path = "resimler/Ekran Resmi 2026-08-07 17.52.27.png";
  const buf = await readFile(path);
  console.log("girdi :", (buf.length / 1024 / 1024).toFixed(2), "MB  2828x1642 PNG");

  const body = new FormData();
  body.append("files", new File([new Uint8Array(buf)], "test.png", { type: "image/png" }));

  const response = await fetch(`${BASE}/api/panel/upload`, {
    method: "POST",
    headers: { cookie: `zs_admin=${token}` },
    body,
  });

  const payload = await response.json();
  if (!response.ok) {
    console.error("HATA", response.status, payload);
    process.exit(1);
  }

  const image = payload.images[0];
  console.log(
    "cikti :",
    (image.bytes / 1024).toFixed(0),
    "KB ",
    `${image.width}x${image.height}`,
    image.url,
  );
  console.log("kucultme:", (buf.length / image.bytes).toFixed(1) + "x");

  // Yetkisiz istek reddediliyor mu?
  const anon = new FormData();
  anon.append("files", new File([new Uint8Array(buf)], "x.png", { type: "image/png" }));
  const denied = await fetch(`${BASE}/api/panel/upload`, { method: "POST", body: anon });
  console.log("yetkisiz istek:", denied.status, (await denied.json()).error);
}

main().catch((error) => {
  console.error("HATA:", error);
  process.exit(1);
});
