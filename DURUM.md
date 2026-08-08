# Durum — nerede kaldık

Son güncelleme: 2026-08-08

Bu dosya projenin anlık durumunu tutar. Yeni bir oturum açıldığında önce
bunu okuyun; [PLAN.md](PLAN.md) neyi neden yaptığımızı, [SETUP.md](SETUP.md)
dış servis adımlarını anlatır.

---

## Proje nedir

`zenginsocks.com` — Ticimax'in yerine geçecek, **ödeme almayan** katalog +
sipariş toplama sitesi. Ödeme mağazada alınıyor. Toptan iş; **tüm ürünler
düzine birimiyle satılıyor**, fiyatlar bir düzinenin fiyatı.

Marka: Zengin. Tibo/tibosocks bırakıldı, sadece veri kaynağı olarak kullanıldı.

---

## Tamamlananlar

### Faz 1 — panel  ✅
- Next.js 16.3 + TypeScript + Tailwind v4, Prisma 7 + PostgreSQL (Railway)
- Oturum: `jose` ile imzalı JWT, httpOnly çerez. Panel ve müşteri oturumları
  **ayrı çerezlerde** (`zs_admin` / `zs_customer`)
- Kategori ağacı: sürükle-bırak sıralama, döngü koruması, bağlı ürün/alt
  kategori varsa silme engeli
- Ürün listesi: arama, filtreler, **satır içi fiyat/stok düzenleme**,
  toplu zam / kategori atama / aktif-pasif
- Varyant sihirbazı: kombinasyonları otomatik üretir, mevcut verileri korur
- Görsel yükleme: WebP'ye çevirir + 1600px'e sığdırır, R2 veya yerel disk

### Faz 2 — veri aktarımı  ✅
- Ticimax XML servisinden **222 ürün, 541 varyant, 50 kategori** aktarıldı
- Excel içe/dışa aktarma: `/panel/urunler/aktar`
- Aktarım **idempotent** — tekrar çalıştırmak kopya üretmez

### Faz 3 — vitrin  🟡 kısmen
- ✅ Üst menü (kategori ağacından), mobil çekmece, arama, footer
- ✅ Anasayfa, kategori sayfası, ürün detay, yeni ürünler, arama
- ❌ **Sepet ve sipariş formu henüz yok** — sıradaki iş
- ❌ Sabit sayfalar (hakkımızda, iletişim, KVKK) yok

---

## Şu an bekleyen tek engel: R2

Ürün görselleri **henüz aktarılmadı**. Vitrinde gri kutular görünüyor.

Kullanıcının Cloudflare R2 kurup dört değeri iletmesi gerekiyor
([SETUP.md](SETUP.md) adım 5):
`Account ID`, `Access Key ID`, `Secret Access Key`, `Public URL`

Geldiğinde `.env`'e yazılıp şu komut çalıştırılacak (~12 dk, 625 görsel):

```bash
npx tsx scripts/import-ticimax.ts --uygula
```

Ürünlere dokunmaz, sadece eksik görselleri indirir.

---

## Mimari kararlar — bunları bozmayın

**Para her yerde tam sayı kuruş.** `src/lib/price.ts`. Ondalıklı çarpım
%17,5 gibi iskontolarda kuruş sapması biriktiriyor ve sipariş toplamı
kalemlerin toplamını tutmuyor. Yüzdeler de baz puana çevriliyor (%17,50 → 1750).

**Bayi iskontosu müşteri kartında, fiyat grubu yok.** Her bayinin yüzdesi
farklı (`Customer.discountPercent`). Fiyat saklanmaz, her istekte hesaplanır:
`liste × (1 − yüzde)`. Yuvarlama yok, kuruş korunur.

**Fiyat sunucuda hesaplanır, yüzde istemciye gitmez.** Bir bayi başka
bayinin iskontosunu göremez.

**Stok rezervasyonlu.** Sipariş → `reserved += adet` (fiziksel stok değişmez),
teslim → `stock -= adet`, iptal → rezerve serbest. Satılabilir =
`stock − reserved`. Her değişim `StockMovement`'a yazılır.

**Prisma client tembel oluşturulur.** `src/lib/prisma.ts` Proxy arkasında.
Modül yüklenirken oluşturulursa `next build` DATABASE_URL olmadan çöküyor.

**`server-only` importu paylaşılan modüllerde YOK.** `storage.ts`,
`catalog/excel.ts`, `catalog/import.ts` CLI'dan da kullanılıyor; o paket
düz Node'da bilerek hata fırlatıyor.

**Next 16'da `middleware` değil `proxy`.** Dosya `src/proxy.ts`.

**Tükenen varyant gizlenmez, pasif gösterilir** ve seçime göre bağlamsaldır.

**Düzine birimi her fiyatın yanında yazılmalı.** Yoksa müşteri tek çift sanar.

---

## Bilinen konular

| Konu | Durum |
|---|---|
| Yönetici parolası `zengin2026!` | Geçici, sohbette açıkta. Kullanıcı değiştirmeli — panelde henüz kullanıcı yönetimi ekranı yok |
| Postgres Public Access açık | Geliştirme için. Yayından önce kapatılmalı |
| GitHub deposu public | `tibosocks/zengin`. Private yapılması önerildi |
| "Kadın Penye Soket Puantiyeli" | İki varyantı da `Renk: Çok Renkli`; ikincisi (CRP613) aktarılmadı. Ticimax'te renk adları ayrılırsa gelir |
| iCloud kopya dosyaları | `~/Desktop` senkronlu; `"dosya 2.ts"` ikizleri derlemeyi bozuyor. `find . -name "* [0-9].*" -delete` ile temizlenir |

---

## Erişimler

- **Panel:** `/panel` · `admin@zenginsocks.com` / `zengin2026!`
- **Canlı:** https://zengin-production.up.railway.app
- **Depo:** github.com/tibosocks/zengin (kullanıcı push ediyor, bu makinede
  git kimlik doğrulaması yok)
- **Railway:** proje `appealing-liberation`, servisler `zengin` + `Postgres`
- **Ticimax XML:** `.env` içinde `TICIMAX_XML_URL`

---

## Sıradaki işler

1. **R2 kurulumu + görsel aktarımı** (kullanıcı bekleniyor)
2. **Sepet + sipariş formu** — Faz 3'ün kalanı
3. **Sipariş paneli + bildirimler** (panel içi + e-posta) — Faz 4
4. **Bayi girişi + iskontolu fiyat gösterimi** — Faz 5
5. Sabit sayfalar, SEO/sitemap, DNS geçişi — Faz 6

---

## Faydalı komutlar

```bash
npm run dev              # geliştirme sunucusu
npm run typecheck        # tsc --noEmit
npm run db:deploy        # migration uygula
npm run db:seed          # ilk veri

npx tsx scripts/import-ticimax.ts            # kuru çalışma (yazmaz)
npx tsx scripts/import-ticimax.ts --uygula   # gerçekten aktar
npx tsx scripts/import-catalog.ts <x.xlsx>   # Excel'den aktar
npx tsx scripts/fix-category-slugs.ts        # çakışan slug onarımı
npm run brand:build                          # logo/favicon setleri
```
