import type { Metadata } from "next";

import { prisma } from "@/lib/prisma";

import { NewCustomerForm } from "./new-customer-form";

export const metadata: Metadata = { title: "Yeni müşteri" };
export const dynamic = "force-dynamic";

export default async function NewCustomerPage() {
  // Bayi seçilirse iskonto kutusuna ayarlardaki varsayılan gelsin
  const setting = await prisma.setting.findUnique({
    where: { key: "newDealerDefaultDiscount" },
    select: { value: true },
  });

  return <NewCustomerForm defaultDiscount={setting?.value ?? ""} />;
}
