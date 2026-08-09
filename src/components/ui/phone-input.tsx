"use client";

import { useState } from "react";

import { Input } from "@/components/ui/field";
import { formatPhoneInput } from "@/lib/phone";

/**
 * Telefon alanı — yazdıkça "0547 813 19 03" biçimine sokar.
 *
 * Denetimli bileşen; sunucuya boşluklu değer gider ama `normalizePhone`
 * rakam dışını attığı için sorun olmuyor.
 */
export function PhoneInput({
  id = "phone",
  name = "phone",
  defaultValue = "",
  required,
  autoFocus,
  autoComplete,
}: {
  id?: string;
  name?: string;
  defaultValue?: string;
  required?: boolean;
  autoFocus?: boolean;
  autoComplete?: string;
}) {
  const [value, setValue] = useState(() => formatPhoneInput(defaultValue));

  return (
    <Input
      id={id}
      name={name}
      type="tel"
      inputMode="tel"
      autoComplete={autoComplete}
      placeholder="05XX XXX XX XX"
      value={value}
      onChange={(event) => setValue(formatPhoneInput(event.target.value))}
      required={required}
      autoFocus={autoFocus}
    />
  );
}
