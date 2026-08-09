"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Card, CardHeader } from "@/components/ui/surface";
import { saveSettings } from "@/lib/actions/settings";
import { cn } from "@/lib/utils";

export function SettingsForm({ values }: { values: Record<string, string> }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(
    null,
  );

  function submit(formData: FormData) {
    // Onay kutusu işaretsizken tarayıcı hiçbir şey göndermiyor; sunucunun
    // "kapatıldı" ile "gönderilmedi" ayrımını yapabilmesi için açıkça yazıyoruz
    if (!formData.get("showPricesToGuests")) {
      formData.set("showPricesToGuests", "false");
    }

    setFeedback(null);
    startTransition(async () => {
      const result = await saveSettings(formData);
      setFeedback({
        ok: result.ok,
        text: result.ok
          ? (result.message ?? "Kaydedildi.")
          : (result.error ?? "Kaydedilemedi."),
      });
      if (result.ok) router.refresh();
    });
  }

  return (
    <form action={submit}>
      <Card>
        <CardHeader title="Site bilgileri" />
        <div className="space-y-4 p-5">
          <Field label="Site başlığı" htmlFor="siteTitle">
            <Input id="siteTitle" name="siteTitle" defaultValue={values.siteTitle} />
          </Field>

          <Field label="Site açıklaması" htmlFor="siteDescription" hint="arama sonuçlarında görünür">
            <Textarea
              id="siteDescription"
              name="siteDescription"
              rows={2}
              defaultValue={values.siteDescription}
            />
          </Field>

          <Field
            label="WhatsApp numarası"
            htmlFor="whatsappNumber"
            hint="ülke koduyla, ör. 905321112233"
          >
            <Input
              id="whatsappNumber"
              name="whatsappNumber"
              inputMode="numeric"
              placeholder="905321112233"
              defaultValue={values.whatsappNumber}
            />
          </Field>

          <Field label="İletişim telefonu" htmlFor="contactPhone">
            <Input id="contactPhone" name="contactPhone" defaultValue={values.contactPhone} />
          </Field>

          <Field label="Adres" htmlFor="contactAddress">
            <Textarea
              id="contactAddress"
              name="contactAddress"
              rows={2}
              defaultValue={values.contactAddress}
            />
          </Field>
        </div>
      </Card>

      <Card className="mt-5">
        <CardHeader title="Fiyat ve bayi" />
        <div className="space-y-4 p-5">
          <Field label="Varsayılan KDV oranı (%)" htmlFor="defaultVatRate">
            <Input
              id="defaultVatRate"
              name="defaultVatRate"
              inputMode="decimal"
              className="tnum w-24"
              defaultValue={values.defaultVatRate}
            />
          </Field>

          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              name="showPricesToGuests"
              value="true"
              defaultChecked={values.showPricesToGuests === "true"}
              className="mt-0.5 size-4 accent-ink"
            />
            <span>
              <span className="font-medium text-ink-soft">
                Fiyatları girişsiz ziyaretçilere göster
              </span>
              <span className="block text-muted">
                Kapatırsanız fiyatları sadece giriş yapmış bayiler görür.
              </span>
            </span>
          </label>

          <Field
            label="Yeni bayi başvurularında varsayılan iskonto (%)"
            htmlFor="newDealerDefaultDiscount"
            hint="onay ekranına hazır gelir"
          >
            <Input
              id="newDealerDefaultDiscount"
              name="newDealerDefaultDiscount"
              inputMode="decimal"
              className="tnum w-24"
              defaultValue={values.newDealerDefaultDiscount}
            />
          </Field>
        </div>
      </Card>

      <Card className="mt-5">
        <CardHeader title="Bildirimler" />
        <div className="space-y-4 p-5">
          <Field
            label="Sipariş bildirimi gidecek e-postalar"
            htmlFor="orderNotificationEmails"
            hint="virgülle ayırın"
          >
            <Textarea
              id="orderNotificationEmails"
              name="orderNotificationEmails"
              rows={2}
              placeholder="siparis@zenginsocks.com, omer@zenginsocks.com"
              defaultValue={values.orderNotificationEmails}
            />
          </Field>

          <Field
            label="Kritik stok eşiği"
            htmlFor="lowStockThreshold"
            hint="bu adedin altına düşünce uyarılır"
          >
            <Input
              id="lowStockThreshold"
              name="lowStockThreshold"
              inputMode="numeric"
              className="tnum w-24"
              defaultValue={values.lowStockThreshold}
            />
          </Field>

          <Field
            label="Bekleyen sipariş uyarısı (gün)"
            htmlFor="pendingOrderWarningDays"
            hint="bu süre boyunca 'yeni' kalan siparişler uyarı verir"
          >
            <Input
              id="pendingOrderWarningDays"
              name="pendingOrderWarningDays"
              inputMode="numeric"
              className="tnum w-24"
              defaultValue={values.pendingOrderWarningDays}
            />
          </Field>

          <p className="rounded-md bg-info-soft px-3 py-2 text-sm text-info">
            E-posta gönderimi için Resend kurulumu gerekiyor (SETUP.md adım 7).
            Kurulana kadar bildirimler yalnızca panelde görünür.
          </p>
        </div>
      </Card>

      {feedback ? (
        <p
          role="status"
          className={cn(
            "mt-4 rounded-md px-3 py-2 text-sm",
            feedback.ok ? "bg-ok-soft text-ok" : "bg-danger-soft text-danger",
          )}
        >
          {feedback.text}
        </p>
      ) : null}

      <div className="mt-5">
        <Button type="submit" size="lg" disabled={isPending}>
          {isPending ? "Kaydediliyor…" : "Ayarları kaydet"}
        </Button>
      </div>
    </form>
  );
}
