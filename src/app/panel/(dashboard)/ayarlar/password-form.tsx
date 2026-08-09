"use client";

import { useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Card, CardHeader } from "@/components/ui/surface";
import { changeAdminPassword } from "@/lib/actions/settings";
import { cn } from "@/lib/utils";

export function PasswordForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(
    null,
  );

  function submit(formData: FormData) {
    setFeedback(null);
    startTransition(async () => {
      const result = await changeAdminPassword(formData);
      setFeedback({
        ok: result.ok,
        text: result.ok
          ? (result.message ?? "Değiştirildi.")
          : (result.error ?? "Değiştirilemedi."),
      });
      // Başarılıysa alanları temizle; parolalar formda asılı kalmasın
      if (result.ok) formRef.current?.reset();
    });
  }

  return (
    <Card>
      <CardHeader
        title="Parolamı değiştir"
        description="Kurulumda verilen geçici parolayı mutlaka değiştirin."
      />
      <form ref={formRef} action={submit} className="space-y-4 p-5">
        <Field label="Mevcut parola" htmlFor="current">
          <Input
            id="current"
            name="current"
            type="password"
            autoComplete="current-password"
            required
          />
        </Field>

        <Field label="Yeni parola" htmlFor="next" hint="en az 8 karakter">
          <Input
            id="next"
            name="next"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
          />
        </Field>

        <Field label="Yeni parola (tekrar)" htmlFor="confirm">
          <Input
            id="confirm"
            name="confirm"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
          />
        </Field>

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

        <Button type="submit" disabled={isPending}>
          {isPending ? "Değiştiriliyor…" : "Parolayı değiştir"}
        </Button>
      </form>
    </Card>
  );
}
