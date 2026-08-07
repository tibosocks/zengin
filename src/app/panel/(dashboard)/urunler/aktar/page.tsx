import type { Metadata } from "next";

import { PageHeader } from "@/components/ui/surface";

import { TransferPanel } from "./transfer-panel";

export const metadata: Metadata = { title: "Toplu aktarım" };

export default function TransferPage() {
  return (
    <>
      <PageHeader
        title="Toplu aktarım"
        description="Kataloğu Excel'e aktarın, düzenleyin, geri yükleyin. Ticimax'ten gelen dosya da buradan yüklenir."
      />
      <TransferPanel />
    </>
  );
}
