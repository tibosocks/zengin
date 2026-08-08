// R2 bağlantı testi: bucket'ı bulur, örnek dosya yükler, herkese açık
// adresten okunabildiğini doğrular, sonra siler.
import "dotenv/config";

import {
  DeleteObjectCommand,
  ListBucketsCommand,
  S3Client,
} from "@aws-sdk/client-s3";

import { storageDriver, storeImageFromUrl } from "../src/lib/storage";

async function main() {
  console.log("Sürücü:", storageDriver());
  if (storageDriver() !== "r2") {
    console.error("R2 ayarları eksik, yerel diske düşüyor.");
    process.exit(1);
  }

  const client = new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });

  const buckets = await client.send(new ListBucketsCommand({}));
  const names = (buckets.Buckets ?? []).map((b) => b.Name);
  console.log("Hesaptaki bucket'lar:", names.join(", ") || "(yok)");

  const target = process.env.R2_BUCKET!;
  if (!names.includes(target)) {
    console.error(`\nHATA: "${target}" adında bucket yok.`);
    console.error("Cloudflare'de bucket adını kontrol edin veya R2_BUCKET'ı düzeltin.");
    process.exit(1);
  }

  console.log(`\n"${target}" bulundu. Örnek görsel yükleniyor…`);
  const stored = await storeImageFromUrl(
    "https://zengin-production.up.railway.app/brand/logo.png",
    "test",
  );
  console.log("  yüklendi:", stored.url, `${(stored.bytes / 1024).toFixed(0)} KB`);

  console.log("Herkese açık adresten okunuyor…");
  const check = await fetch(stored.url);
  console.log(`  HTTP ${check.status} · ${check.headers.get("content-type")}`);

  if (!check.ok) {
    console.error("\nHATA: dosya yüklendi ama herkese açık adresten okunamıyor.");
    console.error("Bucket → Settings → Public access → R2.dev subdomain açık mı?");
    process.exit(1);
  }

  const key = new URL(stored.url).pathname.replace(/^\//, "");
  await client.send(new DeleteObjectCommand({ Bucket: target, Key: key }));
  console.log("  test dosyası silindi");
  console.log("\nR2 hazır.");
}

main().catch((error) => {
  console.error("\nHATA:", error instanceof Error ? error.message : error);
  process.exit(1);
});
