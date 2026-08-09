"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { PhoneInput } from "@/components/ui/phone-input";
import { dealerRegister, type AuthState } from "@/lib/actions/customer-auth";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? "Gönderiliyor…" : "Başvuruyu gönder"}
    </Button>
  );
}

export function DealerRegisterForm() {
  const [state, formAction] = useActionState<AuthState, FormData>(
    dealerRegister,
    {},
  );

  return (
    <form action={formAction} className="space-y-4">
      <Field label="Firma adı" htmlFor="companyName">
        <Input id="companyName" name="companyName" autoComplete="organization" required />
      </Field>

      <Field label="Yetkili ad soyad" htmlFor="fullName">
        <Input id="fullName" name="fullName" autoComplete="name" required />
      </Field>

      <Field label="Cep telefonu" htmlFor="phone" hint="giriş için kullanılacak">
        <PhoneInput required autoComplete="tel" />
      </Field>

      <Field label="E-posta" htmlFor="email" hint="isteğe bağlı">
        <Input id="email" name="email" type="email" autoComplete="email" />
      </Field>

      <Field label="Vergi no / TCKN" htmlFor="taxNo" hint="isteğe bağlı">
        <Input id="taxNo" name="taxNo" inputMode="numeric" />
      </Field>

      <Field label="Parola" htmlFor="password" hint="en az 8 karakter">
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </Field>

      <Field label="Eklemek istedikleriniz" htmlFor="note" hint="isteğe bağlı">
        <Textarea id="note" name="note" rows={3} />
      </Field>

      {state.error ? (
        <p
          role="alert"
          className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger"
        >
          {state.error}
        </p>
      ) : null}

      <Submit />

      <p className="text-xs text-muted">
        Başvurunuz incelendikten sonra onaylanır. Onaya kadar normal
        fiyatlarla sipariş verebilirsiniz.
      </p>
    </form>
  );
}
