import "dotenv/config";

import bcrypt from "bcryptjs";

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

// Ekran görüntülerinden çıkarılan mevcut kategori yapısı.
// Ticimax aktarımı bunun üstüne yazacak; buradaki amaç panelin ilk günden
// boş olmaması ve yapının doğrulanabilmesi.
const CATEGORIES: Array<{ name: string; slug: string; children?: Array<{ name: string; slug: string }> }> = [
  {
    name: "Kadın Çorapları",
    slug: "kadin-coraplari",
    children: [
      { name: "Kadın Patik Çorap", slug: "kadin-patik-corap" },
      { name: "Kadın Soket Çorap", slug: "kadin-soket-corap" },
      { name: "Kadın Kısa Konç Çorap", slug: "kadin-kisa-konc-corap" },
    ],
  },
  {
    name: "Erkek Çorapları",
    slug: "erkek-coraplari",
    children: [
      { name: "Erkek Patik Çorap", slug: "erkek-patik-corap" },
      { name: "Erkek Soket Çorap", slug: "erkek-soket-corap" },
      { name: "Erkek Diyabetik Çorap", slug: "erkek-diyabetik-corap" },
    ],
  },
  {
    name: "Çocuk Çorapları",
    slug: "cocuk-coraplari",
    children: [
      { name: "Kız Çocuk Çorapları", slug: "kiz-cocuk-coraplari" },
      { name: "Erkek Çocuk Çorapları", slug: "erkek-cocuk-coraplari" },
    ],
  },
  {
    name: "Bebe Çorapları",
    slug: "bebe-coraplari",
    children: [
      { name: "Kız Bebe Çorapları", slug: "kiz-bebe-coraplari" },
      { name: "Erkek Bebe Çorapları", slug: "erkek-bebe-coraplari" },
    ],
  },
];

// Ekran görüntülerinde geçen bedenler.
const SIZES = [
  "36-40",
  "41-44",
  "0-6 Ay",
  "6-12 Ay",
  "1-2 Yaş",
  "3-4 Yaş",
  "5-6 Yaş",
  "7-8 Yaş",
  "9-10 Yaş",
  "11-12 Yaş",
];

const SETTINGS: Record<string, string> = {
  siteTitle: "Zengin Socks",
  siteDescription: "Toptan çorap satışı — kadın, erkek, çocuk ve bebe çorapları",
  defaultVatRate: "10",
  showVatIncluded: "true",
  showPricesToGuests: "true",
  newDealerDefaultDiscount: "0",
  orderPrefix: "ZG",
  whatsappNumber: "",
  contactPhone: "",
  contactAddress: "",
  orderNotificationEmails: "",
  lowStockThreshold: "5",
  pendingOrderWarningDays: "3",
};

async function main() {
  console.log("Seed başlıyor...\n");

  // --- yönetici -----------------------------------------------------
  const email = (process.env.SEED_ADMIN_EMAIL ?? "").trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD ?? "";

  if (!email || !password) {
    throw new Error(
      "SEED_ADMIN_EMAIL ve SEED_ADMIN_PASSWORD tanımlı olmalı (.env dosyası).",
    );
  }
  if (password.length < 8) {
    throw new Error("SEED_ADMIN_PASSWORD en az 8 karakter olmalı.");
  }

  const admin = await prisma.adminUser.upsert({
    where: { email },
    // Parolayı her seed'de sıfırlamıyoruz; hesap varsa sadece aktif tutuyoruz.
    update: { isActive: true },
    create: {
      email,
      name: process.env.SEED_ADMIN_NAME ?? "Yönetici",
      passwordHash: await bcrypt.hash(password, 12),
      role: "owner",
      isActive: true,
    },
  });
  console.log(`  yönetici: ${admin.email} (${admin.role})`);

  // --- marka --------------------------------------------------------
  await prisma.brand.upsert({
    where: { slug: "zengin" },
    update: {},
    create: { name: "Zengin", slug: "zengin" },
  });
  console.log("  marka: Zengin");

  // --- kategoriler --------------------------------------------------
  let categoryCount = 0;
  for (const [index, parent] of CATEGORIES.entries()) {
    const created = await prisma.category.upsert({
      where: { slug: parent.slug },
      update: { name: parent.name, sortOrder: index },
      create: { name: parent.name, slug: parent.slug, sortOrder: index },
    });
    categoryCount += 1;

    for (const [childIndex, child] of (parent.children ?? []).entries()) {
      await prisma.category.upsert({
        where: { slug: child.slug },
        update: { name: child.name, parentId: created.id, sortOrder: childIndex },
        create: {
          name: child.name,
          slug: child.slug,
          parentId: created.id,
          sortOrder: childIndex,
        },
      });
      categoryCount += 1;
    }
  }
  console.log(`  kategori: ${categoryCount} adet`);

  // --- beden seçenekleri --------------------------------------------
  const sizeType = await prisma.optionType.upsert({
    where: { name: "Beden" },
    update: {},
    create: { name: "Beden", displayType: "button", sortOrder: 0 },
  });

  for (const [index, value] of SIZES.entries()) {
    await prisma.optionValue.upsert({
      where: { optionTypeId_value: { optionTypeId: sizeType.id, value } },
      update: { sortOrder: index },
      create: { optionTypeId: sizeType.id, value, sortOrder: index },
    });
  }
  console.log(`  beden: ${SIZES.length} değer`);

  await prisma.optionType.upsert({
    where: { name: "Renk" },
    update: {},
    create: { name: "Renk", displayType: "swatch", sortOrder: 1 },
  });
  console.log("  seçenek tipi: Renk");

  // --- ayarlar ------------------------------------------------------
  for (const [key, value] of Object.entries(SETTINGS)) {
    await prisma.setting.upsert({
      where: { key },
      update: {}, // mevcut ayarların üstüne yazma
      create: { key, value },
    });
  }
  console.log(`  ayar: ${Object.keys(SETTINGS).length} anahtar`);

  console.log("\nSeed tamamlandı.");
}

main()
  .catch((error) => {
    console.error("\nSeed başarısız:", error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
