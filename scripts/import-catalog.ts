// Katalog aktarımı.
//
//   npx tsx scripts/import-catalog.ts <dosya.xlsx> [--uygula] [--gorselsiz]
//
// Varsayılan KURU ÇALIŞMA: hiçbir şey yazılmaz, sadece ne olacağı raporlanır.
// Yazmak için --uygula gerekir. Bu bilinçli: 400 ürünlük bir aktarımı yanlış
// dosyayla çalıştırmak katalogu bozar.
import "dotenv/config";

import { readTable } from "../src/lib/catalog/excel";
import { runImport } from "../src/lib/catalog/import";
import { groupRows, parseTable } from "../src/lib/catalog/parse";
import type { RowIssue } from "../src/lib/catalog/types";
import { formatKurus } from "../src/lib/price";

function printIssues(issues: RowIssue[], limit = 25) {
  const errors = issues.filter((issue) => issue.level === "hata");
  const warnings = issues.filter((issue) => issue.level === "uyari");

  if (errors.length > 0) {
    console.log(`\nHATALAR (${errors.length}) — bu satırlar aktarılmaz:`);
    for (const issue of errors.slice(0, limit)) {
      console.log(
        `  satır ${issue.rowNumber}${issue.field ? ` · ${issue.field}` : ""}: ${issue.message}`,
      );
    }
    if (errors.length > limit) console.log(`  … ve ${errors.length - limit} tane daha`);
  }

  if (warnings.length > 0) {
    console.log(`\nUYARILAR (${warnings.length}):`);
    for (const issue of warnings.slice(0, limit)) {
      console.log(
        `  satır ${issue.rowNumber}${issue.field ? ` · ${issue.field}` : ""}: ${issue.message}`,
      );
    }
    if (warnings.length > limit)
      console.log(`  … ve ${warnings.length - limit} tane daha`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const file = args.find((arg) => !arg.startsWith("--"));
  const apply = args.includes("--uygula");
  const skipImages = args.includes("--gorselsiz");

  if (!file) {
    console.error(
      "Kullanım: npx tsx scripts/import-catalog.ts <dosya.xlsx> [--uygula] [--gorselsiz]",
    );
    process.exit(1);
  }

  console.log(`Dosya okunuyor: ${file}`);
  const { table, sheetName } = await readTable(file);
  console.log(
    `  sayfa "${sheetName || "?"}" · ${Math.max(0, table.length - 1)} veri satırı, ` +
      `${table[0]?.length ?? 0} sütun\n`,
  );

  const parsed = parseTable(table);

  if (parsed.unknownColumns.length > 0) {
    console.log(`Tanınmayan sütunlar (yok sayıldı): ${parsed.unknownColumns.join(", ")}`);
  }

  const grouped = groupRows(parsed.rows);
  const allIssues = [...parsed.issues, ...grouped.issues];

  if (parsed.rows.length === 0) {
    printIssues(allIssues);
    console.error("\nAktarılabilir satır yok. Çıkılıyor.");
    process.exit(1);
  }

  console.log(
    `Okunan: ${parsed.rows.length} satır → ${grouped.products.length} ürün` +
      (parsed.skipped > 0 ? ` (${parsed.skipped} satır atlandı)` : ""),
  );

  const report = await runImport(grouped.products, {
    dryRun: !apply,
    downloadImages: !skipImages,
    onProgress: apply
      ? (message) => process.stdout.write(`\r  ${message.padEnd(70).slice(0, 70)}`)
      : undefined,
  });

  if (apply) process.stdout.write("\r".padEnd(74) + "\r");

  const { counts } = report.plan;
  const totalStock = parsed.rows.reduce((sum, row) => sum + row.stock, 0);
  const priceSum = parsed.rows.reduce((sum, row) => sum + row.priceKurus, 0);
  const withoutImage = grouped.products.filter((p) => p.imageUrls.length === 0);
  const withoutCategory = grouped.products.filter((p) => !p.categoryPath);

  console.log(`\n${"─".repeat(58)}`);
  console.log(apply ? "AKTARIM RAPORU" : "KURU ÇALIŞMA RAPORU (hiçbir şey yazılmadı)");
  console.log("─".repeat(58));
  console.log(`  Yeni ürün            ${counts.productsToCreate}`);
  console.log(`  Güncellenen ürün     ${counts.productsToUpdate}`);
  console.log(`  Yeni varyant         ${counts.variantsToCreate}`);
  console.log(`  Güncellenen varyant  ${counts.variantsToUpdate}`);
  console.log(`  Açılacak kategori    ${report.plan.newCategories.length}`);
  console.log(`  Yeni beden/renk      ${report.plan.newOptionValues.length}`);
  console.log(`  İndirilecek görsel   ${counts.imagesToDownload}`);
  if (apply) {
    console.log(`  İndirilen görsel     ${report.imagesDownloaded}`);
    if (report.imagesFailed > 0) {
      console.log(`  Başarısız görsel     ${report.imagesFailed}`);
    }
  }
  console.log("─".repeat(58));
  console.log("  KARŞILAŞTIRMA — Ticimax ile tutuyor mu:");
  console.log(`  Toplam stok adedi    ${totalStock}`);
  console.log(`  Fiyat toplamı        ${formatKurus(priceSum)}`);
  console.log(`  Görseli olmayan ürün ${withoutImage.length}`);
  console.log(`  Kategorisiz ürün     ${withoutCategory.length}`);
  console.log("─".repeat(58));

  if (report.plan.newCategories.length > 0) {
    console.log("\nAçılacak kategoriler:");
    for (const path of report.plan.newCategories.slice(0, 30)) {
      console.log(`  ${path}`);
    }
    if (report.plan.newCategories.length > 30) {
      console.log(`  … ve ${report.plan.newCategories.length - 30} tane daha`);
    }
  }

  printIssues([...allIssues, ...report.issues]);

  if (!apply) {
    console.log(
      "\nRapor doğru görünüyorsa aynı komutu --uygula ekleyerek çalıştırın.",
    );
  } else {
    console.log("\nAktarım tamamlandı.");
  }
}

main().catch((error) => {
  console.error("\nAktarım başarısız:", error);
  process.exit(1);
});
