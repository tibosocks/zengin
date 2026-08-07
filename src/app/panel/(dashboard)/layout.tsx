import { redirect } from "next/navigation";

import { PanelShell } from "@/components/panel/panel-shell";
import { getAdminSession } from "@/lib/auth";

// Middleware zaten jetonu doğruluyor ama tek savunma hattına güvenmiyoruz:
// middleware atlanırsa (matcher hatası, doğrudan render) burası durdurur.
export default async function PanelLayout({
  children,
}: LayoutProps<"/panel">) {
  const session = await getAdminSession();
  if (!session) redirect("/panel/giris");

  return <PanelShell session={session}>{children}</PanelShell>;
}
