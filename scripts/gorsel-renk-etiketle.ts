/**
 * Aktarılan ürün görsellerini rengiyle etiketler.
 *
 * Ticimax'in UrunResimleri.xml dosyasındaki VaryasyonID, Urunler.xml
 * içindeki varyantın id'siyle aynı — yani her görselin hangi varyanta
 * (dolayısıyla hangi renge) ait olduğu kaynakta yazıyor. İlk aktarımda bu
 * bilgiyi kullanmamıştık; bu script geriye dönük dolduruyor.
 *
 * Eşleştirme ProductImage.sourceUrl üzerinden yapılır, tekrar
 * çalıştırılabilir. Sadece Renk seçeneği olan ürünlere dokunur.
 *
 *   npx tsx --env-file=.env scripts/gorsel-renk-etiketle.ts [--kuru]
 *
 * --kuru : hiçbir şey yazmaz, ne olacağını gösterir.
 */
import { XMLParser } from "fast-xml-parser";

import { prisma } from "@/lib/prisma";

const OPTION_TYPE_MAP: Record<string, string> = { RENK: "Renk" };

function asArray<T>(value: unknown): T[] {
  if (value === undefined || value === null) return [];
  return (Array.isArray(value) ? value : [value]) as T[];
}

function text(value: unknown): string {
  return value === undefined || value === null ? "" : String(value).trim();
}

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase("tr");
}

interface RawOption {
  "@Tanim"?: string;
  "@Deger"?: string;
}

interface RawVariant {
  VaryasyonID?: string;
  EkSecenekOzellik?: { Ozellik?: RawOption | RawOption[] };
}

interface RawProduct {
  UrunSecenek?: { Secenek?: RawVariant | RawVariant[] };
}

interface RawImage {
  VaryasyonID?: string;
  ResimAdresi?: string;
}

async function main() {
  const dryRun = process.argv.includes("--kuru");
  const base = (process.env.TICIMAX_XML_URL ?? "").replace(/\/+$/, "");
  if (base === "") throw new Error("TICIMAX_XML_URL tanımlı değil.");

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@",
    trimValues: true,
    parseTagValue: false,
    parseAttributeValue: false,
  });

  async function fetchXml(name: string) {
    const response = await fetch(`${base}/${name}`, {
      signal: AbortSignal.timeout(180_000),
    });
    if (!response.ok) throw new Error(`${name} okunamadı (HTTP ${response.status})`);
    return parser.parse(await response.text()) as unknown;
  }

  console.log("Urunler.xml ve UrunResimleri.xml indiriliyor…");
  const [productsXml, imagesXml] = await Promise.all([
    fetchXml("Urunler.xml"),
    fetchXml("UrunResimleri.xml"),
  ]);

  // --- varyant id -> renk adı ------------------------------------------
  const colorOfVariant = new Map<string, string>();
  for (const raw of asArray<RawProduct>(
    (productsXml as { Root?: { Urunler?: { Urun?: unknown } } }).Root?.Urunler?.Urun,
  )) {
    for (const variant of asArray<RawVariant>(raw.UrunSecenek?.Secenek)) {
      const variantId = text(variant.VaryasyonID);
      if (variantId === "") continue;

      for (const option of asArray<RawOption>(variant.EkSecenekOzellik?.Ozellik)) {
        const type = OPTION_TYPE_MAP[text(option["@Tanim"]).toLocaleUpperCase("tr")];
        const value = text(option["@Deger"]);
        if (type === "Renk" && value !== "") colorOfVariant.set(variantId, value);
      }
    }
  }

  // --- görsel adresi -> renk adı ---------------------------------------
  const colorOfImageUrl = new Map<string, string>();
  for (const image of asArray<RawImage>(
    (imagesXml as { Resimler?: { Resim?: unknown } }).Resimler?.Resim,
  )) {
    const url = text(image.ResimAdresi);
    const variantId = text(image.VaryasyonID);
    const color = colorOfVariant.get(variantId);
    if (url !== "" && color) colorOfImageUrl.set(url, color);
  }

  console.log(
    `  renkli varyant ${colorOfVariant.size}, renge bağlanan görsel adresi ${colorOfImageUrl.size}`,
  );

  // --- veritabanındaki görselleri etiketle -------------------------------
  const products = await prisma.product.findMany({
    select: {
      id: true,
      name: true,
      images: { select: { id: true, sourceUrl: true, optionValueId: true } },
      variants: {
        select: {
          optionValues: {
            select: {
              optionValue: {
                select: {
                  id: true,
                  value: true,
                  optionType: { select: { name: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  let tagged = 0;
  let alreadyTagged = 0;
  let unmatched = 0;
  let touchedProducts = 0;

  for (const product of products) {
    // Ürünün renk değerleri: ada göre arayabilmek için sözlük
    const colorValues = new Map<string, string>();
    for (const variant of product.variants) {
      for (const link of variant.optionValues) {
        if (link.optionValue.optionType.name !== "Renk") continue;
        colorValues.set(normalize(link.optionValue.value), link.optionValue.id);
      }
    }
    if (colorValues.size < 2) continue;

    let touched = false;

    for (const image of product.images) {
      const colorName = image.sourceUrl
        ? colorOfImageUrl.get(image.sourceUrl)
        : undefined;
      const valueId = colorName ? colorValues.get(normalize(colorName)) : undefined;

      if (!valueId) {
        unmatched += 1;
        continue;
      }
      if (image.optionValueId === valueId) {
        alreadyTagged += 1;
        continue;
      }

      if (!dryRun) {
        await prisma.productImage.update({
          where: { id: image.id },
          data: { optionValueId: valueId },
        });
      }
      tagged += 1;
      touched = true;
    }

    if (touched) touchedProducts += 1;
  }

  console.log(dryRun ? "\n— kuru çalışma, yazılmadı —" : "\nTamam.");
  console.log(`  etiketlenen görsel      ${tagged}`);
  console.log(`  zaten etiketli          ${alreadyTagged}`);
  console.log(`  eşleşmeyen görsel       ${unmatched}`);
  console.log(`  etkilenen ürün          ${touchedProducts}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
