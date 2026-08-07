import { jwtVerify } from "jose";
import { NextResponse, type NextRequest } from "next/server";

// Next 16'da bu dosyanın adı "middleware" değil "proxy" — eski isim
// kullanımdan kaldırıldı.
//
// Proxy, render kodundan ayrı çalışır ve CDN'e dağıtılabilir: Prisma ve
// bcrypt burada kullanılamaz. Sadece jetonun imzasını doğrulayıp
// yönlendirme yapıyoruz; yetki kontrolünün asıl yeri sayfa/aksiyon
// tarafı (src/lib/auth.ts).

const LOGIN_PATH = "/panel/giris";

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const token = request.cookies.get("zs_admin")?.value;
  let signedIn = false;

  if (token && process.env.AUTH_SECRET) {
    try {
      await jwtVerify(
        token,
        new TextEncoder().encode(process.env.AUTH_SECRET),
      );
      signedIn = true;
    } catch {
      signedIn = false;
    }
  }

  if (pathname === LOGIN_PATH) {
    // Girişli kullanıcıyı tekrar giriş ekranında tutmanın anlamı yok
    if (signedIn) {
      return NextResponse.redirect(new URL("/panel", request.url));
    }
    return NextResponse.next();
  }

  if (!signedIn) {
    const url = new URL(LOGIN_PATH, request.url);
    // Giriş sonrası kullanıcıyı gitmek istediği sayfaya döndürebilmek için
    if (pathname !== "/panel") {
      url.searchParams.set("devam", `${pathname}${search}`);
    }
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/panel", "/panel/:path*"],
};
