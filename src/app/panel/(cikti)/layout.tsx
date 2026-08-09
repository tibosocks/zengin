import { redirect } from "next/navigation";

import { getAdminSession } from "@/lib/auth";

/**
 * Yazdırma/PDF çıktıları için kabuksuz düzen.
 *
 * Panel kabuğunu (yan menü, üst bar) hiç render etmiyoruz — `@media print`
 * ile gizlemek yerine baştan koymamak, hem ekran önizlemesini gerçek çıktıya
 * benzetiyor hem de sayfa kenar boşluklarını bozan bir şey kalmıyor.
 *
 * Yetki kontrolü burada tekrar yapılıyor: dashboard düzeninin altında
 * olmadığı için oradaki koruma bu sayfaları kapsamıyor.
 */
export default async function CiktiLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getAdminSession();
  if (!session) redirect("/panel/giris");

  return children;
}
