"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { adminLogin, type FormState } from "@/lib/actions/auth";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? "Giriş yapılıyor…" : "Giriş yap"}
    </Button>
  );
}

export function LoginForm({ next }: { next?: string }) {
  const [state, formAction] = useActionState<FormState, FormData>(adminLogin, {});

  return (
    <form action={formAction} className="space-y-4">
      {next ? <input type="hidden" name="next" value={next} /> : null}

      <Field label="E-posta" htmlFor="email">
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
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

      <SubmitButton />
    </form>
  );
}
