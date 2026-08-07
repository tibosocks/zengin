"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import {
  authenticateAdmin,
  createAdminSession,
  destroyAdminSession,
} from "@/lib/auth";

export interface FormState {
  error?: string;
}

const loginSchema = z.object({
  email: z.string().trim().min(1, "E-posta gerekli").email("Geçerli bir e-posta girin"),
  password: z.string().min(1, "Parola gerekli"),
  next: z.string().optional(),
});

export async function adminLogin(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  // formData.get() alan yoksa null döner. Zod'un .optional() hali undefined'a
  // izin verir ama null'a vermez; null geçilirse doğrulama "expected string,
  // received null" ile kırılır ve kullanıcı hiç giriş yapamaz.
  // Boş metne çevirince kendi Türkçe mesajlarımız devreye giriyor.
  const parsed = loginSchema.safeParse({
    email: formData.get("email") ?? "",
    password: formData.get("password") ?? "",
    next: formData.get("next") ?? undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Bilgileri kontrol edin" };
  }

  const session = await authenticateAdmin(parsed.data.email, parsed.data.password);

  // Hangisinin yanlış olduğunu söylemiyoruz: e-postanın kayıtlı olup
  // olmadığı bilgisi deneme yanılmayı kolaylaştırır.
  if (!session) {
    return { error: "E-posta veya parola hatalı" };
  }

  await createAdminSession(session);

  // Açık yönlendirme açığı olmaması için sadece site içi yollara izin var
  const next = parsed.data.next;
  const target =
    next && next.startsWith("/") && !next.startsWith("//") ? next : "/panel";

  redirect(target);
}

export async function adminLogout() {
  await destroyAdminSession();
  redirect("/panel/giris");
}
