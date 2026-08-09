"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { PhoneInput } from "@/components/ui/phone-input";
import { Card, CardHeader } from "@/components/ui/surface";
import { createCustomer } from "@/lib/actions/customers";

export function NewCustomerForm({ defaultDiscount }: { defaultDiscount: string }) {
  const router = useRouter();
  const [type, setType] = useState<"bireysel" | "bayi">("bireysel");
  const [error, setError] = useState<string | null>(null);
  const [existingId, setExistingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit(formData: FormData) {
    setError(null);
    setExistingId(null);
    startTransition(async () => {
      const result = await createCustomer(formData);
      if (result.ok && result.customerId) {
        router.push(`/panel/musteriler/${result.customerId}`);
        router.refresh();
      } else {
        setError(result.error ?? "Oluşturulamadı.");
        setExistingId(result.customerId ?? null);
      }
    });
  }

  return (
    <form action={submit} className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/panel/musteriler"
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"
        >
          <ArrowLeft className="size-4" />
          Müşteriler
        </Link>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Oluşturuluyor…" : "Müşteriyi oluştur"}
        </Button>
      </div>

      {error ? (
        <p className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
          {existingId ? (
            <>
              {" "}
              <Link
                href={`/panel/musteriler/${existingId}`}
                className="font-medium underline"
              >
                Mevcut kayda git
              </Link>
            </>
          ) : null}
        </p>
      ) : null}

      <Card>
        <CardHeader title="Müşteri bilgileri" />
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <Field label="Ad soyad" htmlFor="fullName" className="sm:col-span-2">
            <Input id="fullName" name="fullName" required maxLength={160} />
          </Field>

          <Field label="Telefon" htmlFor="phone" hint="0532 111 22 33">
            <PhoneInput required />
          </Field>

          <Field label="E-posta" htmlFor="email" hint="isteğe bağlı">
            <Input id="email" name="email" type="email" maxLength={200} />
          </Field>

          <Field label="Müşteri tipi" htmlFor="type">
            <Select
              id="type"
              name="type"
              value={type}
              onChange={(event) =>
                setType(event.target.value as "bireysel" | "bayi")
              }
            >
              <option value="bireysel">Bireysel</option>
              <option value="bayi">Bayi</option>
            </Select>
          </Field>

          <Field
            label="İskonto (%)"
            htmlFor="discountPercent"
            hint="ondalıklı olabilir: 17,5"
          >
            <Input
              id="discountPercent"
              name="discountPercent"
              inputMode="decimal"
              placeholder="0"
              defaultValue={type === "bayi" ? defaultDiscount : ""}
              key={type}
            />
          </Field>

          <Field label="Firma unvanı" htmlFor="companyName" hint="isteğe bağlı">
            <Input id="companyName" name="companyName" maxLength={200} />
          </Field>

          <Field label="Vergi no" htmlFor="taxNo" hint="isteğe bağlı">
            <Input id="taxNo" name="taxNo" maxLength={40} />
          </Field>

          <Field
            label="Bayi girişi parolası"
            htmlFor="password"
            hint="isteğe bağlı · en az 8 karakter"
            className="sm:col-span-2"
          >
            <Input
              id="password"
              name="password"
              type="text"
              autoComplete="off"
              placeholder="Boş bırakırsanız müşteri siteye giriş yapamaz"
            />
          </Field>

          <Field label="Not" htmlFor="note" className="sm:col-span-2">
            <Textarea id="note" name="note" maxLength={1000} />
          </Field>
        </div>
      </Card>

      <div className="rounded-md bg-info-soft px-4 py-3 text-sm text-info">
        İskonto <strong>KDV hariç</strong> fiyattan düşülür, KDV indirimli tutar
        üzerinden hesaplanır. Panelden açılan müşteri onay beklemez, doğrudan
        aktif olur. Parolayı şimdi girmezseniz müşteri kartından sonradan da
        belirleyebilirsiniz.
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Oluşturuluyor…" : "Müşteriyi oluştur"}
        </Button>
      </div>
    </form>
  );
}
