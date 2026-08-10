import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

import { DealerRegisterForm } from "./register-form";

export const metadata: Metadata = {
  title: "Bayi başvurusu",
  alternates: { canonical: "/bayi-basvurusu" },
};
export const dynamic = "force-dynamic";

export default async function DealerRegisterPage({
  searchParams,
}: PageProps<"/bayi-basvurusu">) {
  const params = await searchParams;

  if (params.durum === "alindi") {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <CheckCircle2 className="mx-auto size-12 text-ok" strokeWidth={1.5} />
        <h1 className="mt-4 font-display text-2xl text-ink">Başvurunuz alındı</h1>
        <p className="mt-3 text-ink-soft">
          Bilgilerinizi inceleyip sizi arayacağız. Onaylandıktan sonra bayi
          girişi yapıp size özel fiyatları görebilirsiniz.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block text-sm text-muted hover:text-ink"
        >
          Ana sayfaya dön
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <h1 className="mb-1 font-display text-2xl text-ink">Bayi başvurusu</h1>
      <p className="mb-6 text-sm text-muted">
        Toptan alım yapan firmalar için. Başvurunuz onaylandığında hesabınızla
        giriş yapıp sipariş geçmişinizi takip edebilirsiniz.
      </p>

      <div className="rounded-card border border-line bg-white p-5">
        <DealerRegisterForm />
      </div>

      <p className="mt-5 text-center text-sm text-muted">
        Zaten bayi misiniz?{" "}
        <Link href="/bayi-girisi" className="font-medium text-ink underline">
          Giriş yapın
        </Link>
      </p>
    </div>
  );
}
