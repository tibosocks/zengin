import type { Metadata } from "next";

import { PageHeader } from "@/components/ui/surface";
import { prisma } from "@/lib/prisma";

import { PasswordForm } from "./password-form";
import { SettingsForm } from "./settings-form";

export const metadata: Metadata = { title: "Ayarlar" };
export const dynamic = "force-dynamic";

const DEFAULTS: Record<string, string> = {
  siteTitle: "Zengin Socks",
  siteDescription: "",
  whatsappNumber: "",
  contactPhone: "",
  contactAddress: "",
  defaultVatRate: "10",
  showPricesToGuests: "true",
  newDealerDefaultDiscount: "0",
  orderNotificationEmails: "",
  lowStockThreshold: "5",
  pendingOrderWarningDays: "3",
};

export default async function SettingsPage() {
  const rows = await prisma.setting.findMany();
  const stored = new Map(rows.map((row) => [row.key, row.value]));

  const values = Object.fromEntries(
    Object.entries(DEFAULTS).map(([key, fallback]) => [
      key,
      stored.get(key) ?? fallback,
    ]),
  ) as Record<keyof typeof DEFAULTS, string>;

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Ayarlar"
        description="Site bilgileri, fiyat görünürlüğü ve bildirim tercihleri."
      />

      <div className="space-y-5">
        <SettingsForm values={values} />
        <PasswordForm />
      </div>
    </div>
  );
}
