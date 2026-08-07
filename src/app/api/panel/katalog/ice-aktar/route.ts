import { NextResponse } from "next/server";

import { getAdminSession } from "@/lib/auth";
import { readTable } from "@/lib/catalog/excel";
import { runImport } from "@/lib/catalog/import";
import { groupRows, parseTable } from "@/lib/catalog/parse";
import type { RowIssue } from "@/lib/catalog/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export interface ImportResponse {
  sheetName: string;
  totalRows: number;
  parsedRows: number;
  skipped: number;
  productCount: number;
  unknownColumns: string[];
  counts: {
    productsToCreate: number;
    productsToUpdate: number;
    variantsToCreate: number;
    variantsToUpdate: number;
    imagesToDownload: number;
  };
  newCategories: string[];
  newOptionValues: string[];
  totalStock: number;
  issues: RowIssue[];
  applied: boolean;
  imagesDownloaded: number;
  imagesFailed: number;
}

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }
  // Katalog yazma yetkisi depo rolünde olmamalı
  if (session.role === "depo") {
    return NextResponse.json(
      { error: "Bu işlem için yetkiniz yok." },
      { status: 403 },
    );
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const apply = formData.get("uygula") === "1";
  const downloadImages = formData.get("gorsel") !== "0";

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Dosya bulunamadı" }, { status: 400 });
  }
  if (file.size > 25 * 1024 * 1024) {
    return NextResponse.json(
      { error: "Dosya 25 MB sınırını aşıyor." },
      { status: 400 },
    );
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const { table, sheetName } = await readTable(buffer);

    const parsed = parseTable(table);
    const grouped = groupRows(parsed.rows);

    if (parsed.rows.length === 0) {
      return NextResponse.json<ImportResponse>({
        sheetName,
        totalRows: Math.max(0, table.length - 1),
        parsedRows: 0,
        skipped: parsed.skipped,
        productCount: 0,
        unknownColumns: parsed.unknownColumns,
        counts: {
          productsToCreate: 0,
          productsToUpdate: 0,
          variantsToCreate: 0,
          variantsToUpdate: 0,
          imagesToDownload: 0,
        },
        newCategories: [],
        newOptionValues: [],
        totalStock: 0,
        issues: [...parsed.issues, ...grouped.issues],
        applied: false,
        imagesDownloaded: 0,
        imagesFailed: 0,
      });
    }

    const report = await runImport(grouped.products, {
      dryRun: !apply,
      downloadImages,
    });

    return NextResponse.json<ImportResponse>({
      sheetName,
      totalRows: Math.max(0, table.length - 1),
      parsedRows: parsed.rows.length,
      skipped: parsed.skipped,
      productCount: grouped.products.length,
      unknownColumns: parsed.unknownColumns,
      counts: report.plan.counts,
      newCategories: report.plan.newCategories,
      newOptionValues: report.plan.newOptionValues,
      totalStock: parsed.rows.reduce((sum, row) => sum + row.stock, 0),
      issues: [...parsed.issues, ...grouped.issues, ...report.issues],
      applied: report.applied,
      imagesDownloaded: report.imagesDownloaded,
      imagesFailed: report.imagesFailed,
    });
  } catch (error) {
    console.error("Katalog aktarım hatası:", error);
    return NextResponse.json(
      {
        error:
          "Dosya okunamadı. Geçerli bir .xlsx dosyası olduğundan emin olun.",
      },
      { status: 400 },
    );
  }
}
