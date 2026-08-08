"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { placeOrder, type CheckoutState } from "@/lib/actions/orders";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? "Gönderiliyor…" : "Siparişi gönder"}
    </Button>
  );
}

export function CheckoutForm() {
  const [state, formAction] = useActionState<CheckoutState, FormData>(
    placeOrder,
    {},
  );

  return (
    <form action={formAction} className="space-y-5">
      <div className="rounded-card border border-line bg-white p-5">
        <h2 className="mb-4 font-medium text-ink">İletişim bilgileri</h2>

        <div className="space-y-4">
          <Field
            label="Ad soyad"
            htmlFor="fullName"
            error={state.fieldErrors?.fullName}
          >
            <Input id="fullName" name="fullName" autoComplete="name" required />
          </Field>

          <Field
            label="Cep telefonu"
            htmlFor="phone"
            hint="sizi bu numaradan arayacağız"
            error={state.fieldErrors?.phone}
          >
            <Input
              id="phone"
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="05XX XXX XX XX"
              required
            />
          </Field>

          <Field
            label="E-posta"
            htmlFor="email"
            hint="isteğe bağlı"
            error={state.fieldErrors?.email}
          >
            <Input id="email" name="email" type="email" autoComplete="email" />
          </Field>
        </div>
      </div>

      <div className="rounded-card border border-line bg-white p-5">
        <h2 className="mb-1 font-medium text-ink">Fatura bilgileri</h2>
        <p className="mb-4 text-sm text-muted">
          Firma adına fatura istiyorsanız doldurun.
        </p>

        <div className="space-y-4">
          <Field label="Firma adı" htmlFor="companyName" hint="isteğe bağlı">
            <Input id="companyName" name="companyName" autoComplete="organization" />
          </Field>
          <Field label="Vergi no / TCKN" htmlFor="taxNo" hint="isteğe bağlı">
            <Input id="taxNo" name="taxNo" inputMode="numeric" />
          </Field>
        </div>
      </div>

      <div className="rounded-card border border-line bg-white p-5">
        <Field label="Sipariş notu" htmlFor="note" hint="isteğe bağlı">
          <Textarea
            id="note"
            name="note"
            rows={3}
            placeholder="Eklemek istediğiniz bir şey var mı?"
          />
        </Field>
      </div>

      {state.error ? (
        <p
          role="alert"
          className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger"
        >
          {state.error}
        </p>
      ) : null}

      <SubmitButton />

      <p className="text-center text-xs text-muted">
        Siparişi göndererek satış sözleşmesi kurmuş olmazsınız; talebiniz bize
        ulaşır ve sizi arayarak teyit ederiz.
      </p>
    </form>
  );
}
