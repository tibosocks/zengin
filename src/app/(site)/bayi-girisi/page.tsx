import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getCustomerSession } from "@/lib/auth";

import { DealerLoginForm } from "./login-form";

export const metadata: Metadata = { title: "Bayi girişi" };
export const dynamic = "force-dynamic";

export default async function DealerLoginPage() {
  const session = await getCustomerSession();
  if (session) redirect("/hesabim");

  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <h1 className="mb-1 font-display text-2xl text-ink">Bayi girişi</h1>
      <p className="mb-6 text-sm text-muted">
        Sipariş geçmişinizi görüntüleyin, hesabınıza tanımlı fiyatlarla
        sipariş verin.
      </p>

      <div className="rounded-card border border-line bg-white p-5">
        <DealerLoginForm />
      </div>

      <p className="mt-5 text-center text-sm text-muted">
        Henüz bayi değil misiniz?{" "}
        <Link href="/bayi-basvurusu" className="font-medium text-ink underline">
          Başvuru yapın
        </Link>
      </p>
    </div>
  );
}
