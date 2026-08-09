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

### Panel tamamlayıcıları  ✅
- `/panel/bildirimler` — tür ikonları, okunmamış vurgusu, zil sayacı,
  tümünü okundu işaretle. 30 günden eski okunmuşları silen yardımcı var
- `/panel/ayarlar` — site bilgileri, WhatsApp numarası, KDV oranı,
  girişsiz fiyat görünürlüğü, varsayılan bayi iskontosu, bildirim
  alıcıları, kritik stok eşiği + **yönetici parolası değiştirme**

### Faz 5 — bayi sistemi  ✅
- `/bayi-basvurusu` — firma bilgileriyle başvuru, `onay_bekliyor` kaydı
  oluşturur ve panele bildirim düşer. Kendiliğinden aktifleşmez
- `/bayi-girisi` — telefon + parola. Onay bekleyen ve pasif hesaplar
  ayrı mesajlarla reddediliyor
- `/hesabim` — iskonto bilgisi, sipariş geçmişi, çıkış
- Üst barda oturum açıksa müşteri adı, değilse "Bayi girişi"
- Aynı telefondan üyeliksiz sipariş verilmişse yeni kayıt açılmıyor,
  mevcut kayıt bayi başvurusuna dönüştürülüyor

### Faz 4 — sipariş yönetimi  ✅
- `/panel/siparisler` — durum sekmeleri, arama, sayfalama
- `/panel/siparisler/[id]` — kalemler, indirim dökümü, müşteri kartı,
  durum geçmişi, fiş yazdırma
- Durum geçişlerinin stoğa etkisi tek modelde (`src/lib/order-status.ts`):
  rezerve / düşüldü / serbest. Geri yönlü geçişler de doğru çalışıyor
- `/panel/musteriler` — satır içi iskonto düzenleme, bayi onay kuyruğu
- `/panel/musteriler/[id]` — sipariş geçmişi, iskonto denetim kaydı

### Faz 3 — vitrin  ✅
- Üst menü (kategori ağacından), mobil çekmece, arama, footer, sepet rozeti
- Anasayfa, kategori, ürün detay, yeni ürünler, arama
- Sepet (çerezde varyant id + adet; fiyat çerezde TUTULMUYOR)
- Sipariş formu ve "siparişiniz alındı" sayfası
- Sipariş oluşturma tek transaction: stok kontrolü + rezervasyon birlikte,
  kalem snapshot'ı, müşteri telefondan upsert, panel bildirimi
- ❌ Sabit sayfalar (hakkımızda, iletişim, KVKK) yok

---

## Görseller — tamam ✅

561 görsel R2'ye aktarıldı, 222 ürünün tamamının görseli var. Her görselin
`sourceUrl`'i kayıtlı, aktarım tekrar çalıştırılabilir.

**Doğrulanmayan tek şey:** görsellerin tarayıcıda açılması. Geliştirme
ortamının ağ filtresi `r2.dev` alan adına izin vermiyor, bu yüzden buradan
render edilemiyor. Kullanıcının kendi tarayıcısında kontrol etmesi gerekiyor.

`r2.dev` üretim için Cloudflare'in kendi uyarısıyla önerilmiyor (hız sınırlı,
önbellek yok). DNS Cloudflare'e taşındığında `cdn.zenginsocks.com` bağlanmalı
ve kayıtlı adresler tek SQL güncellemesiyle çevrilmeli:

```sql
UPDATE "ProductImage" SET url = replace(url,
  'https://pub-04b03e2e7ed64307bd8bec014f06e204.r2.dev',
  'https://cdn.zenginsocks.com');
```

---

## Railway eski sürümü çalıştırıyor ⚠️

GitHub'da her şey güncel ama Railway **Faz 1 sürümünde takılı**. Rota
testiyle doğrulandı: `/api/panel/upload` 401 (var), `/yeni-urunler` 404 (yok).

Railway'de "Redeploy" en son commit'i çekmez, aynı kaynak anlık görüntüsünü
yeniden derler. Çözüm servis → Settings → Source:
- Branch `main` seçili mi
- **Wait for CI / Check Suites kapalı olmalı** (depoda CI yok, açıksa
  sonsuza kadar bekler ve hiç deploy etmez)
- Auto Deploy açık mı

İşe yaramazsa GitHub bağlantısını kaldırıp yeniden bağlamak webhook'u sıfırlar.

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

**pg havuzunda zaman aşımı ŞART.** Railway'in genel proxy'si boşta kalan
bağlantıyı sessizce düşürüyor; zaman aşımı yoksa sorgu sonsuza kadar bekler
ve hata bile fırlatmaz. Bir aktarım bu yüzden 3 saat asılı kaldı.
`src/lib/prisma.ts` içinde statement/query/connection timeout + keepAlive var.

**Uzun aktarımlarda çıktıyı `| tail` ile borulamayın** — tampon yüzünden
ilerleme görünmez olur. Log dosyasına yazıp `tail -f` ile izleyin.

**Tükenen varyant gizlenmez, pasif gösterilir** ve seçime göre bağlamsaldır.

**Düzine birimi her fiyatın yanında yazılmalı.** Yoksa müşteri tek çift sanar.

**`"use server"` dosyaları sadece async fonksiyon export edebilir.** Sabitler
ve saf yardımcılar ayrı modülde olmalı (`order-status.ts`, `phone.ts`).
Bu kural iki kez derlemeyi kırdı.

---

## Bilinen konular

| Konu | Durum |
|---|---|
| Yönetici parolası `zengin2026!` | Geçici ve sohbette açıkta. **Panel → Ayarlar → Parolamı değiştir** ile değiştirilmeli |
| Postgres Public Access açık | Geliştirme için. Yayından önce kapatılmalı |
| GitHub deposu public | `tibosocks/zengin`. Private yapılması önerildi |
| "Kadın Penye Soket Puantiyeli" | İki varyantı da `Renk: Çok Renkli`; ikincisi (CRP613) aktarılmadı. Ticimax'te renk adları ayrılırsa gelir |
| R2 token'ı hesap geneli yetkili | Sadece `zenginsocks` bucket'ına kısıtlı bir token daha güvenli olur |
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

1. **Railway deploy'unu düzelt** (kullanıcı) — her şey yerelde çalışıyor,
   canlıya çıkmıyor
2. **E-posta bildirimi** — Resend kurulumu bekliyor (SETUP.md adım 7).
   Panel içi bildirim çalışıyor, e-posta kanalı yok
3. **Sabit sayfalar** — hakkımızda, iletişim, KVKK. Footer'da bağlantılar
   var ama sayfalar yok (`/sayfa/[slug]`)
4. SEO: sitemap.xml, robots.txt
5. DNS geçişi ve yayın öncesi kontrol listesi ([SETUP.md](SETUP.md))
6. `cdn.zenginsocks.com` — r2.dev üretim için önerilmiyor

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
