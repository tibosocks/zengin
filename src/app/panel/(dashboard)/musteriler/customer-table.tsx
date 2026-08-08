"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Badge, Card } from "@/components/ui/surface";
import { approveDealer, updateDiscount } from "@/lib/actions/customers";
import { formatKurus } from "@/lib/price";
import { cn } from "@/lib/utils";

export interface CustomerRow {
  id: string;
  fullName: string;
  companyName: string | null;
  phone: string;
  email: string | null;
  type: "bireysel" | "bayi";
  status: "aktif" | "onay_bekliyor" | "pasif";
  discountBp: number;
  orderCount: number;
  revenueKurus: number;
}

export function CustomerTable({ rows }: { rows: CustomerRow[] }) {
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(
    null,
  );

  return (
    <div className="space-y-3">
      {message ? (
        <p
          role="status"
          className={cn(
            "rounded-md px-3 py-2 text-sm",
            message.ok ? "bg-ok-soft text-ok" : "bg-danger-soft text-danger",
          )}
        >
          {message.text}
        </p>
      ) : null}

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-line bg-surface-alt text-left text-xs text-muted">
            <tr>
              <th className="px-4 py-2 font-medium">Müşteri</th>
              <th className="px-4 py-2 font-medium">İletişim</th>
              <th className="px-4 py-2 font-medium">Durum</th>
              <th className="px-4 py-2 text-right font-medium">İskonto</th>
              <th className="px-4 py-2 text-right font-medium">Sipariş</th>
              <th className="px-4 py-2 text-right font-medium">Ciro</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                className="border-b border-line-soft last:border-0 hover:bg-surface-alt"
              >
                <td className="px-4 py-2.5">
                  <Link
                    href={`/panel/musteriler/${row.id}`}
                    className="font-medium text-ink hover:underline"
                  >
                    {row.companyName || row.fullName}
                  </Link>
                  {row.companyName ? (
                    <span className="block text-xs text-muted">{row.fullName}</span>
                  ) : null}
                </td>
                <td className="px-4 py-2.5">
                  <a
                    href={`tel:0${row.phone}`}
                    className="tnum text-ink-soft hover:text-ink"
                  >
                    0{row.phone}
                  </a>
                  {row.email ? (
                    <span className="block truncate text-xs text-muted">
                      {row.email}
                    </span>
                  ) : null}
                </td>
                <td className="px-4 py-2.5">
                  {row.status === "onay_bekliyor" ? (
                    <Badge tone="warn">Onay bekliyor</Badge>
                  ) : row.status === "pasif" ? (
                    <Badge tone="danger">Pasif</Badge>
                  ) : row.type === "bayi" ? (
                    <Badge tone="info">Bayi</Badge>
                  ) : (
                    <Badge>Bireysel</Badge>
                  )}
                </td>
                <td className="px-4 py-2.5 text-right">
                  {row.status === "onay_bekliyor" ? (
                    <ApproveCell customer={row} onMessage={setMessage} />
                  ) : (
                    <DiscountCell customer={row} onMessage={setMessage} />
                  )}
                </td>
                <td className="tnum px-4 py-2.5 text-right text-muted">
                  {row.orderCount}
                </td>
                <td className="tnum px-4 py-2.5 text-right">
                  {formatKurus(row.revenueKurus)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

type Notify = (message: { ok: boolean; text: string } | null) => void;

/** Yüzdeye tıkla, yaz, Enter. Müşteri detayına girmeye gerek yok. */
function DiscountCell({
  customer,
  onMessage,
}: {
  customer: CustomerRow;
  onMessage: Notify;
}) {
  const router = useRouter();
  const initial = String(customer.discountBp / 100).replace(".", ",");
  const [value, setValue] = useState(initial);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function commit() {
    if (value === initial) return;

    const numeric = Number(value.replace(",", "."));
    // %50 üstü büyük ihtimalle yanlış yazım; sormadan uygulamak riskli
    if (numeric > 50 && !confirm(`İskonto %${numeric} olarak ayarlansın mı?`)) {
      setValue(initial);
      return;
    }

    startTransition(async () => {
      const result = await updateDiscount(customer.id, value.replace(",", "."));
      if (result.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 1200);
        onMessage(null);
        router.refresh();
      } else {
        setValue(initial);
        onMessage({ ok: false, text: result.error ?? "Güncellenemedi." });
      }
    });
  }

  return (
    <div className="flex items-center justify-end gap-1">
      <span className="text-muted">%</span>
      <input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
          if (event.key === "Escape") {
            setValue(initial);
            event.currentTarget.blur();
          }
        }}
        disabled={isPending}
        aria-label={`${customer.fullName} iskonto yüzdesi`}
        className={cn(
          "tnum w-14 rounded border bg-transparent px-2 py-1 text-right",
          "hover:border-line focus:border-ink focus:bg-white focus:outline-none",
          saved ? "border-ok bg-ok-soft" : "border-transparent",
          customer.discountBp > 0 && !saved && "font-medium text-ok",
        )}
      />
    </div>
  );
}

/** Onay bekleyen bayide yüzdeyi girip tek adımda aktifleştiriyoruz. */
function ApproveCell({
  customer,
  onMessage,
}: {
  customer: CustomerRow;
  onMessage: Notify;
}) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [isPending, startTransition] = useTransition();

  function approve() {
    if (value.trim() === "") {
      onMessage({ ok: false, text: "Önce iskonto yüzdesini girin." });
      return;
    }

    startTransition(async () => {
      const result = await approveDealer(customer.id, value.replace(",", "."));
      onMessage({
        ok: result.ok,
        text: result.ok
          ? (result.message ?? "Onaylandı.")
          : (result.error ?? "Onaylanamadı."),
      });
      if (result.ok) router.refresh();
    });
  }

  return (
    <div className="flex items-center justify-end gap-1.5">
      <input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="%"
        aria-label={`${customer.fullName} için iskonto`}
        className="tnum w-14 rounded border border-line px-2 py-1 text-right focus:border-ink focus:outline-none"
      />
      <Button size="sm" onClick={approve} disabled={isPending}>
        Onayla
      </Button>
    </div>
  );
}
