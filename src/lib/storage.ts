import "server-only";

import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import sharp from "sharp";

// İki sürücü var: R2 ayarlıysa oraya, değilse public/uploads klasörüne yazar.
// Yerel sürücü sayesinde R2 hesabı açılmadan da geliştirme yapılabiliyor.

export interface StoredImage {
  url: string;
  width: number;
  height: number;
  bytes: number;
}

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024; // 15 MB
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
]);

// Ürün fotoğrafları için üst sınır. Telefon/fotoğraf makinesinden gelen
// 4000px'lik dosyaları olduğu gibi saklamanın anlamı yok; vitrinde en fazla
// bu boyutta gösteriliyor.
const MAX_DIMENSION = 1600;

function r2Config() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET;
  const publicUrl = process.env.R2_PUBLIC_URL;

  if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !publicUrl) {
    return null;
  }

  return { accountId, accessKeyId, secretAccessKey, bucket, publicUrl };
}

export function storageDriver(): "r2" | "local" {
  return r2Config() ? "r2" : "local";
}

let cachedClient: S3Client | null = null;

function client(config: NonNullable<ReturnType<typeof r2Config>>) {
  if (!cachedClient) {
    cachedClient = new S3Client({
      region: "auto",
      endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }
  return cachedClient;
}

export class UploadError extends Error {}

/**
 * Yüklenen görseli WebP'ye çevirir, boyutlandırır ve saklar.
 *
 * WebP'ye çevirmenin sebebi: çorap fotoğrafları JPEG olarak geliyor ve
 * aynı kalitede WebP tipik olarak yarı boyutta. 400 ürün × 4 görselde bu
 * hem depolama hem sayfa açılış hızı farkı demek.
 */
export async function storeImage(
  file: File,
  prefix = "urunler",
): Promise<StoredImage> {
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new UploadError(
      "Sadece JPG, PNG, WebP veya AVIF görseller yüklenebilir.",
    );
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new UploadError("Dosya 15 MB sınırını aşıyor.");
  }

  const input = Buffer.from(await file.arrayBuffer());

  let pipeline = sharp(input, { failOn: "error" }).rotate(); // EXIF yönünü uygula
  const meta = await pipeline.metadata();

  if ((meta.width ?? 0) > MAX_DIMENSION || (meta.height ?? 0) > MAX_DIMENSION) {
    pipeline = pipeline.resize(MAX_DIMENSION, MAX_DIMENSION, {
      fit: "inside",
      withoutEnlargement: true,
    });
  }

  const { data, info } = await pipeline
    .webp({ quality: 82 })
    .toBuffer({ resolveWithObject: true });

  const key = `${prefix}/${new Date().getFullYear()}/${randomUUID()}.webp`;
  const config = r2Config();

  if (config) {
    await client(config).send(
      new PutObjectCommand({
        Bucket: config.bucket,
        Key: key,
        Body: data,
        ContentType: "image/webp",
        // Görsel adları benzersiz (uuid), içerik hiç değişmiyor:
        // uzun süreli önbellek güvenli.
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );

    return {
      url: `${config.publicUrl.replace(/\/$/, "")}/${key}`,
      width: info.width,
      height: info.height,
      bytes: info.size,
    };
  }

  const target = path.join(process.cwd(), "public", "uploads", key);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, data);

  return {
    url: `/uploads/${key}`,
    width: info.width,
    height: info.height,
    bytes: info.size,
  };
}
