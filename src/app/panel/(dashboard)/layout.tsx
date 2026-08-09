import type { Metadata, Viewport } from "next";
import { redirect } from "next/navigation";

import { PanelShell } from "@/components/panel/panel-shell";
import { getAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Panel, iOS ve Android'de "ana ekrana ekle" ile uygulama gibi kurulabiliyor.
 *
 * Manifest yalnızca panel sayfalarına bağlanıyor — kök düzene koysaydık
 * müşteriler vitrini kurduğunda `start_url` onları panele düşürürdü.
 *
 * `appleWebApp` şart: iOS manifest'teki `display: standalone` değerine
 * bakmıyor, tarayıcı çubuğunu ancak bu meta etiketiyle gizliyor.
 */
export const metadata: Metadata = {
  title: { default: "Panel", template: "%s | Zengin Panel" },
  manifest: "/panel.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Zengin Panel",
    statusBarStyle: "default",
  },
  icons: {
    apple: [{ url: "/brand/panel-icon-180.png", sizes: "180x180" }],
  },
  // Next yalnızca modern `mobile-web-app-capable` etiketini basıyor; iOS
  // 15.4 öncesi sürümler sadece `apple-` önekli olanı tanıyor. Eski
  // cihazlarda da tarayıcı çubuğu gizlensin diye elle ekliyoruz.
  other: { "apple-mobile-web-app-capable": "yes" },
  // Panel arama sonuçlarında çıkmamalı
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#101012",
  // viewportFit "cover" bilerek YOK: çentikli ekranlarda içerik durum
  // çubuğunun altına girip panel üst barını gizliyor. Varsayılan davranışta
  // iOS içeriği kendisi güvenli alana oturtuyor.
};

// Middleware zaten jetonu doğruluyor ama tek savunma hattına güvenmiyoruz:
// middleware atlanırsa (matcher hatası, doğrudan render) burası durdurur.
export default async function PanelLayout({
  children,
}: LayoutProps<"/panel">) {
  const session = await getAdminSession();
  if (!session) redirect("/panel/giris");

  const unread = await prisma.notification.count({ where: { readAt: null } });

  return (
    <PanelShell session={session} unreadCount={unread}>
      {children}
    </PanelShell>
  );
}
