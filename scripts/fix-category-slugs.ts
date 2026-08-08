// Çakışan kategori slug'larını onarır.
//
//   npx tsx scripts/fix-category-slugs.ts [--uygula]
//
// Aynı ad birden fazla kategoride geçtiğinde (ör. "Bambu Patik" hem Kadın
// hem Erkek altında) düz benzersizleştirme "bambu-patik" / "bambu-patik-2"
// üretiyor. İkisi de hangi bölüme ait olduğunu söylemiyor.
// Bu script ikisini de üst kategoriyle önekler: kadin-bambu-patik /
// erkek-bambu-patik.
import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";
import { categorySlugCandidates } from "../src/lib/slug";

async function main() {
  const apply = process.argv.includes("--uygula");

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });

  const all = await prisma.category.findMany({
    select: { id: true, name: true, slug: true, parentId: true },
  });

  const byId = new Map(all.map((category) => [category.id, category]));

  function ancestorsOf(id: string): string[] {
    const names: string[] = [];
    let cursor = byId.get(id)?.parentId ?? null;
    for (let depth = 0; depth < 20 && cursor; depth += 1) {
      const node = byId.get(cursor);
      if (!node) break;
      names.unshift(node.name);
      cursor = node.parentId;
    }
    return names;
  }

  // Adı birden fazla kategoride geçenler belirsiz; hepsi öneklenmeli
  const nameCounts = new Map<string, number>();
  for (const category of all) {
    nameCounts.set(category.name, (nameCounts.get(category.name) ?? 0) + 1);
  }

  const ambiguous = all.filter(
    (category) => (nameCounts.get(category.name) ?? 0) > 1,
  );

  const taken = new Set(all.map((category) => category.slug));
  const changes: Array<{ id: string; name: string; from: string; to: string }> = [];

  for (const category of ambiguous) {
    const ancestors = ancestorsOf(category.id);
    const candidates = categorySlugCandidates(category.name, ancestors);

    // İlk aday (düz ad) belirsiz olanlar için zaten uygun değil
    const preferred = candidates.slice(1).find((candidate) => !taken.has(candidate));
    if (!preferred || preferred === category.slug) continue;

    taken.delete(category.slug);
    taken.add(preferred);
    changes.push({
      id: category.id,
      name: category.name,
      from: category.slug,
      to: preferred,
    });
  }

  if (changes.length === 0) {
    console.log("Düzeltilecek slug yok.");
    await prisma.$disconnect();
    return;
  }

  console.log(`${changes.length} kategori slug'ı değişecek:\n`);
  for (const change of changes) {
    console.log(`  ${change.name.padEnd(24)} ${change.from}  →  ${change.to}`);
  }

  if (!apply) {
    console.log("\nUygulamak için --uygula ekleyin.");
    await prisma.$disconnect();
    return;
  }

  // Geçici ada alıp sonra hedefe yazıyoruz: iki kategori birbirinin slug'ını
  // alacaksa doğrudan güncelleme benzersizlik kısıtına takılır.
  await prisma.$transaction(
    changes.map((change, index) =>
      prisma.category.update({
        where: { id: change.id },
        data: { slug: `__gecici_${index}__` },
      }),
    ),
  );
  await prisma.$transaction(
    changes.map((change) =>
      prisma.category.update({
        where: { id: change.id },
        data: { slug: change.to },
      }),
    ),
  );

  console.log(`\n${changes.length} slug güncellendi.`);
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
