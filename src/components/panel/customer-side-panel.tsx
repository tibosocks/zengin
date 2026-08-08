"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Card, CardHeader } from "@/components/ui/surface";
import type { CustomerStatus } from "@/generated/prisma/client";
import {
  approveDealer,
  saveCustomerNote,
  updateCustomerStatus,
  updateDiscount,
} from "@/lib/actions/customers";
import { cn } from "@/lib/utils";

const STATUSES: Array<{ key: CustomerStatus; label: string }> = [
  { key: "aktif", label: "Aktif" },
  { key: "pasif", label: "Pasif" },
];

export function CustomerSidePanel({
  customerId,
  status,
  discountBp,
  note,
}: {
  customerId: string;
  status: CustomerStatus;
  discountBp: number;
  note: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [percent, setPercent] = useState(
    String(discountBp / 100).replace(".", ","),
  );
  const [reason, setReason] = useState("");
  const [noteValue, setNoteValue] = useState(note);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(
    null,
  );

  function notify(result: { ok: boolean; error?: string; message?: string }) {
    setFeedback({
      ok: result.ok,
      text: result.ok
        ? (result.message ?? "Kaydedildi.")
        : (result.error ?? "İşlem başarısız."),
    });
    if (result.ok) router.refresh();
  }

  function saveDiscount() {
    const numeric = Number(percent.replace(",", "."));
    if (numeric > 50 && !confirm(`İskonto %${numeric} olarak ayarlansın mı?`)) {
      return;
    }
    startTransition(async () => {
      notify(await updateDiscount(customerId, percent.replace(",", "."), reason));
      setReason("");
    });
  }

  function approve() {
    startTransition(async () => {
      notify(await approveDealer(customerId, percent.replace(",", ".")));
    });
  }

  return (
    <Card>
      <CardHeader title={status === "onay_bekliyor" ? "Bayi başvurusu" : "Bayi ayarları"} />
      <div className="space-y-4 p-5">
        <Field
          label="İskonto yüzdesi"
          htmlFor="percent"
          hint="ondalıklı olabilir"
        >
          <div className="flex items-center gap-2">
            <span className="text-muted">%</span>
            <Input
              id="percent"
              value={percent}
              onChange={(event) => setPercent(event.target.value)}
              inputMode="decimal"
              className="tnum text-right"
            />
          </div>
        </Field>

        {status === "onay_bekliyor" ? (
          <>
            <p className="text-sm text-muted">
              Onaylandığında müşteri bayi olarak işaretlenir ve girdiğiniz
              iskonto uygulanır.
            </p>
            <Button className="w-full" onClick={approve} disabled={isPending}>
              Bayiyi onayla
            </Button>
          </>
        ) : (
          <>
            <Field label="Değişiklik sebebi" htmlFor="reason" hint="isteğe bağlı">
              <Input
                id="reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Ciro indirimi, pazarlık…"
              />
            </Field>
            <Button
              className="w-full"
              onClick={saveDiscount}
              disabled={
                isPending ||
                percent.replace(",", ".") === String(discountBp / 100)
              }
            >
              İskontoyu kaydet
            </Button>

            <div className="border-t border-line pt-4">
              <p className="mb-2 text-sm font-medium text-ink-soft">Hesap durumu</p>
              <div className="flex gap-2">
                {STATUSES.map((item) => (
                  <Button
                    key={item.key}
                    variant={status === item.key ? "primary" : "secondary"}
                    size="sm"
                    className="flex-1"
                    disabled={isPending || status === item.key}
                    onClick={() =>
                      startTransition(async () => {
                        notify(await updateCustomerStatus(customerId, item.key));
                      })
                    }
                  >
                    {item.label}
                  </Button>
                ))}
              </div>
              <p className="mt-2 text-xs text-muted">
                Pasif müşteri giriş yapamaz ve iskontosu uygulanmaz.
              </p>
            </div>
          </>
        )}

        <div className="border-t border-line pt-4">
          <Field label="İç not" htmlFor="note" hint="müşteri görmez">
            <Textarea
              id="note"
              value={noteValue}
              onChange={(event) => setNoteValue(event.target.value)}
              rows={3}
            />
          </Field>
          <Button
            variant="secondary"
            size="sm"
            className="mt-2 w-full"
            disabled={isPending || noteValue === note}
            onClick={() =>
              startTransition(async () => {
                notify(await saveCustomerNote(customerId, noteValue));
              })
            }
          >
            Notu kaydet
          </Button>
        </div>

        {feedback ? (
          <p
            role="status"
            className={cn(
              "rounded-md px-3 py-2 text-sm",
              feedback.ok ? "bg-ok-soft text-ok" : "bg-danger-soft text-danger",
            )}
          >
            {feedback.text}
          </p>
        ) : null}
      </div>
    </Card>
  );
}
