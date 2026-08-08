import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

import { buttonStyles } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Siparişiniz alındı",
  robots: { index: false },
};
export const dynamic = "force-dynamic";

export default async function OrderPlacedPage({
  searchParams,
}: PageProps<"/siparis-alindi">) {
  const params = await searchParams;
  const orderNo = typeof params.no === "string" ? params.no : "";

  const whatsapp = await prisma.setting.findUnique({
    where: { key: "whatsappNumber" },
  });

  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center lg:px-8">
      <CheckCircle2 className="mx-auto size-12 text-ok" strokeWidth={1.5} />
      <h1 className="mt-4 font-display text-3xl text-ink">Siparişiniz alındı</h1>

      {orderNo ? (
        <p className="mt-3 text-ink-soft">
          Sipariş numaranız{" "}
          <strong className="font-semibold text-ink">{orderNo}</strong>
        </p>
      ) : null}

      <div className="mt-8 rounded-card border border-line bg-surface-alt p-5 text-left">
        <p className="font-medium text-ink">Bundan sonra ne olacak?</p>
        <ol className="mt-3 space-y-2 text-sm text-ink-soft">
          <li>1. Siparişinizi kontrol edip sizi arayacağız.</li>
          <li>2. Ürünleriniz hazırlanacak.</li>
          <li>
            3. <strong className="text-ink">Ödemeyi mağazada</strong> teslim
            alırken yapacaksınız. Site üzerinden ödeme alınmaz.
          </li>
        </ol>
      </div>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/" className={buttonStyles()}>
          Alışverişe devam et
        </Link>
        {whatsapp?.value ? (
          <a
            href={`https://wa.me/${whatsapp.value.replace(/\D/g, "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonStyles({ variant: "secondary" })}
          >
            WhatsApp&apos;tan yazın
          </a>
        ) : null}
      </div>
    </div>
  );
}
