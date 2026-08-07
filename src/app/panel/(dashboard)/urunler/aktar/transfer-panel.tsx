"use client";

import {
  AlertTriangle,
  Download,
  FileSpreadsheet,
  Loader2,
  Upload,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { Button, buttonStyles } from "@/components/ui/button";
import { Badge, Card, CardHeader } from "@/components/ui/surface";
import type { ImportResponse } from "@/app/api/panel/katalog/ice-aktar/route";

export function TransferPanel() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [report, setReport] = useState<ImportResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"onizleme" | "uygulama" | null>(null);
  const [withImages, setWithImages] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  async function send(apply: boolean) {
    if (!file) return;

    setBusy(apply ? "uygulama" : "onizleme");
    setError(null);

    try {
      const body = new FormData();
      body.append("file", file);
      body.append("uygula", apply ? "1" : "0");
      body.append("gorsel", withImages ? "1" : "0");

      const response = await fetch("/api/panel/katalog/ice-aktar", {
        method: "POST",
        body,
      });
      const payload = await response.json();

      if (!response.ok) {
        setError(payload.error ?? "İşlem başarısız.");
        return;
      }

      setReport(payload as ImportResponse);
      if (apply) router.refresh();
    } catch {
      setError("Bağlantı hatası. Dosya çok büyük olabilir.");
    } finally {
      setBusy(null);
    }
  }

  function pick(next: File | null) {
    setFile(next);
    setReport(null);
    setError(null);
  }

  const errors = report?.issues.filter((issue) => issue.level === "hata") ?? [];
  const warnings = report?.issues.filter((issue) => issue.level === "uyari") ?? [];

  return (
    <div className="max-w-3xl space-y-5">
      {/* --- dışa aktar --- */}
      <Card>
        <CardHeader
          title="Excel'e aktar"
          description="Tüm ürün ve varyantlar tek dosyada. Yazılabilir tek fiyat sütunu liste fiyatıdır; bayi fiyatları müşteri iskontosundan hesaplandığı için dosyada tutulmaz."
        />
        <div className="p-5">
          <a
            href="/api/panel/katalog/disa-aktar"
            className={buttonStyles({ variant: "secondary" })}
          >
            <Download className="size-4" />
            Kataloğu indir (.xlsx)
          </a>
          <p className="mt-3 text-sm text-muted">
            Zam yaparken bu dosyayı indirin, fiyat sütununu güncelleyin, aşağıdan
            geri yükleyin. Ürün ID sütununu <strong>silmeyin</strong> — eşleştirme
            onun üzerinden yapılıyor.
          </p>
        </div>
      </Card>

      {/* --- içe aktar --- */}
      <Card>
        <CardHeader
          title="Excel'den yükle"
          description="Önce önizleme alınır, hiçbir şey yazılmaz. Raporu onayladıktan sonra uygulanır."
        />
        <div className="space-y-4 p-5">
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx"
            onChange={(event) => pick(event.target.files?.[0] ?? null)}
            className="sr-only"
            id="katalog-dosya"
          />

          <label
            htmlFor="katalog-dosya"
            className="flex cursor-pointer items-center gap-3 rounded-md border-2 border-dashed border-line px-4 py-5 transition-colors hover:border-ink"
          >
            <FileSpreadsheet className="size-6 shrink-0 text-muted" strokeWidth={1.5} />
            <span className="min-w-0 text-sm">
              {file ? (
                <>
                  <span className="font-medium text-ink">{file.name}</span>
                  <span className="ml-2 text-muted">
                    {(file.size / 1024).toFixed(0)} KB
                  </span>
                </>
              ) : (
                <>
                  <span className="font-medium text-ink underline">Dosya seçin</span>
                  <span className="text-muted"> · .xlsx</span>
                </>
              )}
            </span>
          </label>

          <label className="flex items-center gap-2 text-sm text-ink-soft">
            <input
              type="checkbox"
              checked={withImages}
              onChange={(event) => setWithImages(event.target.checked)}
              className="size-4 accent-ink"
            />
            Görselleri indir
            <span className="text-muted">
              (kapalıyken aktarım çok daha hızlı)
            </span>
          </label>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              disabled={!file || busy !== null}
              onClick={() => send(false)}
            >
              {busy === "onizleme" ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  İnceleniyor…
                </>
              ) : (
                "Önizleme al"
              )}
            </Button>

            {report && !report.applied && report.parsedRows > 0 ? (
              <Button disabled={busy !== null} onClick={() => send(true)}>
                {busy === "uygulama" ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Aktarılıyor…
                  </>
                ) : (
                  <>
                    <Upload className="size-4" />
                    Uygula
                  </>
                )}
              </Button>
            ) : null}
          </div>

          {error ? (
            <p className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">
              {error}
            </p>
          ) : null}
        </div>
      </Card>

      {/* --- rapor --- */}
      {report ? (
        <Card>
          <CardHeader
            title={report.applied ? "Aktarım tamamlandı" : "Önizleme"}
            description={
              report.applied
                ? "Değişiklikler kaydedildi."
                : "Hiçbir şey yazılmadı. Aşağıdaki rapor doğruysa Uygula'ya basın."
            }
            action={
              report.applied ? <Badge tone="ok">Uygulandı</Badge> : <Badge>Kuru çalışma</Badge>
            }
          />

          <div className="space-y-5 p-5">
            <p className="text-sm text-muted">
              Sayfa &ldquo;{report.sheetName || "?"}&rdquo; · {report.totalRows} satır
              okundu → {report.parsedRows} geçerli satır → {report.productCount} ürün
              {report.skipped > 0 ? ` · ${report.skipped} satır atlandı` : ""}
            </p>

            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Stat label="Yeni ürün" value={report.counts.productsToCreate} />
              <Stat label="Güncellenen ürün" value={report.counts.productsToUpdate} />
              <Stat label="Yeni varyant" value={report.counts.variantsToCreate} />
              <Stat label="Güncellenen varyant" value={report.counts.variantsToUpdate} />
              <Stat label="Açılacak kategori" value={report.newCategories.length} />
              <Stat
                label={report.applied ? "İndirilen görsel" : "İndirilecek görsel"}
                value={
                  report.applied
                    ? report.imagesDownloaded
                    : report.counts.imagesToDownload
                }
              />
              <Stat label="Toplam stok" value={report.totalStock} />
              {report.applied && report.imagesFailed > 0 ? (
                <Stat label="Başarısız görsel" value={report.imagesFailed} tone="warn" />
              ) : null}
            </dl>

            {report.unknownColumns.length > 0 ? (
              <p className="text-sm text-muted">
                Tanınmayan sütunlar (yok sayıldı):{" "}
                {report.unknownColumns.join(", ")}
              </p>
            ) : null}

            {report.newCategories.length > 0 ? (
              <div>
                <p className="mb-1 text-sm font-medium text-ink">
                  Açılacak kategoriler
                </p>
                <ul className="space-y-0.5 text-sm text-ink-soft">
                  {report.newCategories.slice(0, 15).map((path) => (
                    <li key={path}>{path}</li>
                  ))}
                  {report.newCategories.length > 15 ? (
                    <li className="text-muted">
                      … ve {report.newCategories.length - 15} tane daha
                    </li>
                  ) : null}
                </ul>
              </div>
            ) : null}

            {errors.length > 0 ? (
              <IssueList
                title={`Hatalar (${errors.length}) — bu satırlar aktarılmaz`}
                tone="danger"
                issues={errors}
              />
            ) : null}

            {warnings.length > 0 ? (
              <IssueList
                title={`Uyarılar (${warnings.length})`}
                tone="warn"
                issues={warnings}
              />
            ) : null}
          </div>
        </Card>
      ) : null}
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "warn";
}) {
  return (
    <div className="rounded-md border border-line px-3 py-2">
      <dt className="text-xs text-muted">{label}</dt>
      <dd
        className={
          tone === "warn"
            ? "tnum text-xl font-semibold text-warn"
            : "tnum text-xl font-semibold text-ink"
        }
      >
        {value}
      </dd>
    </div>
  );
}

function IssueList({
  title,
  tone,
  issues,
}: {
  title: string;
  tone: "danger" | "warn";
  issues: Array<{ rowNumber: number; field?: string; message: string }>;
}) {
  return (
    <div
      className={
        tone === "danger"
          ? "rounded-md bg-danger-soft p-3"
          : "rounded-md bg-warn-soft p-3"
      }
    >
      <p
        className={
          tone === "danger"
            ? "mb-2 flex items-center gap-2 text-sm font-medium text-danger"
            : "mb-2 flex items-center gap-2 text-sm font-medium text-warn"
        }
      >
        <AlertTriangle className="size-4" />
        {title}
      </p>
      <ul className="max-h-56 space-y-1 overflow-y-auto text-sm text-ink-soft">
        {issues.slice(0, 60).map((issue, index) => (
          <li key={`${issue.rowNumber}-${index}`}>
            <span className="text-muted">satır {issue.rowNumber}</span>
            {issue.field ? <span className="text-muted"> · {issue.field}</span> : null}
            : {issue.message}
          </li>
        ))}
        {issues.length > 60 ? (
          <li className="text-muted">… ve {issues.length - 60} tane daha</li>
        ) : null}
      </ul>
    </div>
  );
}
