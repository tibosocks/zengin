import type { Metadata } from "next";
import Image from "next/image";

import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Panel Girişi",
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: PageProps<"/panel/giris">) {
  const params = await searchParams;
  const next = typeof params.devam === "string" ? params.devam : undefined;

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface-alt px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-10 flex justify-center">
          <Image
            src="/brand/logo.png"
            alt="Zengin Socks"
            width={1499}
            height={414}
            priority
            className="h-9 w-auto"
          />
        </div>

        <div className="rounded-card border border-line bg-white p-6">
          <h1 className="text-lg font-semibold text-ink">Yönetim Paneli</h1>
          <p className="mt-1 mb-6 text-sm text-muted">
            Devam etmek için giriş yapın.
          </p>

          <LoginForm next={next} />
        </div>
      </div>
    </main>
  );
}
