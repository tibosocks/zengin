"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { dealerLogin, type AuthState } from "@/lib/actions/customer-auth";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? "Giriş yapılıyor…" : "Giriş yap"}
    </Button>
  );
}

export function DealerLoginForm() {
  const [state, formAction] = useActionState<AuthState, FormData>(dealerLogin, {});

  return (
    <form action={formAction} className="space-y-4">
      <Field label="Cep telefonu" htmlFor="phone">
        <Input
          id="phone"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="username"
          placeholder="05XX XXX XX XX"
          autoFocus
          required
        />
      </Field>

      <Field label="Parola" htmlFor="password">
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
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
    </form>
  );
}
