// Ticimax XML servisinden katalog aktarımı.
//
//   npx tsx scripts/import-ticimax.ts [--uygula] [--gorselsiz] [--gorsel-siniri N]
//
// Adres .env içindeki TICIMAX_XML_URL değerinden okunur.
// Varsayılan KURU ÇALIŞMA: hiçbir şey yazılmaz, sadece ne olacağı raporlanır.
import "dotenv/config";

import { runImport } from "../src/lib/catalog/import";
import { fetchTicimaxCatalog } from "../src/lib/catalog/ticimax";
import type { RowIssue } from "../src/lib/catalog/types";
import { formatKurus } from "../src/lib/price";

function printIssues(issues: RowIssue[], limit = 20) {
  const errors = issues.filter((issue) => issue.level === "hata");
  const warnings = issues.filter((issue) => issue.level === "uyari");

  for (const [title, list] of [
    ["HATALAR", errors],
    ["UYARILAR", warnings],
  ] as const) {
    if (list.length === 0) continue;
    console.log(`\n${title} (${list.length}):`);
    for (const issue of list.slice(0, limit)) {
      console.log(`  ${issue.field ? `${issue.field}: ` : ""}${issue.message}`);
    }
    if (list.length > limit) console.log(`  … ve ${list.length - limit} tane daha`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes("--uygula");
  const skipImages = args.includes("--gorselsiz");

  const limitFlag = args.findIndex((arg) => arg === "--gorsel-siniri");
  const imageLimit = limitFlag >= 0 ? Number(args[limitFlag + 1]) || 8 : 8;

  const baseUrl = process.env.TICIMAX_XML_URL;
  if (!baseUrl) {
    console.error(
      "TICIMAX_XML_URL tanımlı değil.\n" +
        ".env dosyasına Ticimax panelindeki 'Tek Link' adresini ekleyin:\n" +
        '  TICIMAX_XML_URL="https://tibosocks.com/TicimaxXml/<anahtar>"',
    );
    process.exit(1);
  }

  console.log("Ticimax XML servisinden okunuyor…\n");

  const catalog = await fetchTicimaxCatalog({
    baseUrl,
    imageLimit,
    onProgress: (message) => console.log(`  ${message}`),
  });

  const s = catalog.stats;

  console.log(`\n${"─".repeat(60)}`);
  console.log("KAYNAKTA NE VAR");
  console.log("─".repeat(60));
  console.log(`  Kategori                 ${s.categories}`);
  console.log(`  Ürün                     ${s.products}`);
  console.log(`  Varyant                  ${s.variants}`);
  console.log(`  Ürün-kategori bağı       ${s.categoryLinks}`);
  console.log(`  Görsel kaydı             ${s.imageRecords}`);
  if (s.orphanImages > 0) {
    console.log(
      `    └ pasif ürüne ait      ${s.orphanImages}  (aktarılmayacak)`,
    );
  }
  if (s.orphanCategoryLinks > 0) {
    console.log(`    └ pasif ürün kategorisi ${s.orphanCategoryLinks}`);
  }
  console.log(`  Aktarılacak görsel       ${s.imagesSelected}  (ürün başına en fazla ${imageLimit})`);
  console.log(`  Toplam stok adedi        ${s.totalStock.toLocaleString("tr-TR")}`);
  console.log(`  Fiyat toplamı            ${formatKurus(s.priceSumKurus)}`);
  if (s.renamedSkus > 0) {
    console.log(`  Yeniden adlandırılan SKU ${s.renamedSkus}`);
  }

  const report = await runImport(catalog.products, {
    dryRun: !apply,
    downloadImages: !skipImages,
    onProgress: apply
      ? (message) => process.stdout.write(`\r  ${message.padEnd(72).slice(0, 72)}`)
      : undefined,
  });

  if (apply) process.stdout.write(`\r${" ".repeat(76)}\r`);

  const c = report.plan.counts;
  console.log(`\n${"─".repeat(60)}`);
  console.log(apply ? "AKTARIM SONUCU" : "KURU ÇALIŞMA (hiçbir şey yazılmadı)");
  console.log("─".repeat(60));
  console.log(`  Yeni ürün                ${c.productsToCreate}`);
  console.log(`  Güncellenen ürün         ${c.productsToUpdate}`);
  console.log(`  Yeni varyant             ${c.variantsToCreate}`);
  console.log(`  Güncellenen varyant      ${c.variantsToUpdate}`);
  console.log(`  Açılacak kategori        ${report.plan.newCategories.length}`);
  console.log(`  Yeni beden/renk değeri   ${report.plan.newOptionValues.length}`);
  console.log(`  İndirilecek görsel       ${c.imagesToDownload}`);
  if (apply) {
    console.log(`  İndirilen görsel         ${report.imagesDownloaded}`);
    if (report.imagesFailed > 0) {
      console.log(`  Başarısız görsel         ${report.imagesFailed}`);
    }
    if (report.failedProducts > 0) {
      console.log(`  ATLANAN ÜRÜN             ${report.failedProducts}  (tekrar çalıştırın)`);
    }
  }
  console.log("─".repeat(60));

  if (report.plan.newOptionValues.length > 0) {
    console.log("\nYeni seçenek değerleri:");
    console.log(`  ${report.plan.newOptionValues.join(", ")}`);
  }

  if (report.plan.newCategories.length > 0) {
    console.log(`\nAçılacak kategoriler (${report.plan.newCategories.length}):`);
    for (const path of report.plan.newCategories.slice(0, 25)) {
      console.log(`  ${path}`);
    }
    if (report.plan.newCategories.length > 25) {
      console.log(`  … ve ${report.plan.newCategories.length - 25} tane daha`);
    }
  }

  printIssues([...catalog.issues, ...report.issues]);

  console.log(
    apply
      ? "\nAktarım tamamlandı."
      : "\nRapor doğruysa aynı komutu --uygula ekleyerek çalıştırın.",
  );
}

main().catch((error) => {
  console.error("\nAktarım başarısız:", error);
  process.exit(1);
});
