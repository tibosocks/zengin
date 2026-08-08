"use client";

import { Printer } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/surface";
import { Textarea } from "@/components/ui/field";
import type { OrderStatus } from "@/generated/prisma/client";
import { changeOrderStatus, saveOrderNote } from "@/lib/actions/orders-admin";
import { ORDER_STATUSES, orderStatusLabel, stockWarning } from "@/lib/order-status";
import { cn } from "@/lib/utils";

export function OrderStatusPanel({
  orderId,
  status,
  adminNote,
}: {
  orderId: string;
  status: OrderStatus;
  adminNote: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [note, setNote] = useState(adminNote);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(
    null,
  );

  function change(next: OrderStatus) {
    const warning = stockWarning(status, next);
    const label = orderStatusLabel(next);

    if (
      !confirm(
        `Durum "${label}" olarak değiştirilsin mi?${warning ? `\n\n${warning}` : ""}`,
      )
    ) {
      return;
    }

    setFeedback(null);
    startTransition(async () => {
      const result = await changeOrderStatus(orderId, next);
      setFeedback({
        ok: result.ok,
        text: result.ok
          ? (result.message ?? "Güncellendi.")
          : (result.error ?? "Güncellenemedi."),
      });
      if (result.ok) router.refresh();
    });
  }

  function persistNote() {
    startTransition(async () => {
      const result = await saveOrderNote(orderId, note);
      setFeedback({
        ok: result.ok,
        text: result.ok ? "Not kaydedildi." : (result.error ?? "Kaydedilemedi."),
      });
    });
  }

  return (
    <Card>
      <CardHeader title="Durum" />
      <div className="space-y-4 p-5">
        <div className="space-y-1.5">
          {ORDER_STATUSES.map((item) => {
            const active = item.key === status;
            return (
              <button
                key={item.key}
                type="button"
                disabled={isPending || active}
                onClick={() => change(item.key)}
                className={cn(
                  "flex w-full items-center justify-between rounded-md border px-3 py-2 text-sm transition-colors",
                  active
                    ? "cursor-default border-ink bg-ink text-white"
                    : "border-line text-ink-soft hover:border-ink hover:text-ink",
                  isPending && !active && "opacity-50",
                )}
              >
                {item.label}
                {active ? <span className="text-xs opacity-70">şu an</span> : null}
              </button>
            );
          })}
        </div>

        <div>
          <label
            htmlFor="adminNote"
            className="mb-1.5 block text-sm font-medium text-ink-soft"
          >
            İç not
            <span className="ml-2 font-normal text-muted">müşteri görmez</span>
          </label>
          <Textarea
            id="adminNote"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={3}
          />
          <Button
            variant="secondary"
            size="sm"
            className="mt-2 w-full"
            onClick={persistNote}
            disabled={isPending || note === adminNote}
          >
            Notu kaydet
          </Button>
        </div>

        <Button
          variant="secondary"
          className="w-full"
          onClick={() => window.print()}
        >
          <Printer className="size-4" />
          Fiş yazdır
        </Button>

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
