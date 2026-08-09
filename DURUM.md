# Durum — nerede kaldık

Son güncelleme: 2026-08-09

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

### Vitrin düzeltmeleri (2026-08-09)  ✅
- **Ürün detayında tek görsel.** Küçük görsel şeridi kaldırıldı; Ticimax'ten
  aynı fotoğrafın 7-8 kopyası geldiği için şerit tekrar gösteriyordu
- **Renk seçimi görseli değiştiriyor.** `ProductImage.optionValueId` artık
  kullanılıyor. Seçim durumu `product-view.tsx` içinde; galeri ile satın alma
  kutusunun ortak üst bileşeni. Açılışta kapak görselinin rengi seçili gelir,
  böylece listede görülen fotoğrafla ürüne girilince görülen aynı olur
- **Fiyat gösterimi KDV hariç öne çıkıyor.** Detayda büyük tutar KDV hariç,
  altında "KDV hariç · 1 Düzine fiyatıdır", onun altında KDV dahil tutar.
  Kartlarda da KDV hariç tutar + "KDV hariç · Düzine"
- Panelde her görselin altında renk seçici var (ürünün kendi renkleriyle
  sınırlı); yeni yüklenen görseller de renge bağlanabiliyor
- **Renk değişince görsel gerçekten değişsin diye iki önlem var.** `<Image>`
  bileşenine `key={url}` verildi — aynı `<img>` düğümü yeniden kullanılırsa
  tarayıcı yeni dosya inene kadar eskisini çizmeye devam ediyor ve renk
  değişmemiş gibi görünüyor. Ayrıca diğer renklerin görselleri açılışta
  arka planda indiriliyor; r2.dev yavaş ve önbeleksiz olduğu için bekleme
  gözle görülüyordu

---

## Görseller — tamam ✅

561 görsel R2'ye aktarıldı, 222 ürünün tamamının görseli var. Her görselin
`sourceUrl`'i kayıtlı, aktarım tekrar çalıştırılabilir.

**Renk etiketleri işlendi.** Ticimax'in `UrunResimleri.xml` dosyasındaki
`VaryasyonID`, `Urunler.xml` içindeki varyant id'siyle aynı — yani hangi
görselin hangi renge ait olduğu kaynakta yazıyor. `scripts/gorsel-renk-
etiketle.ts` bunu `sourceUrl` üzerinden eşleyip `optionValueId`'yi dolduruyor.
Çok renkli 50 ürünün 180 görseli etiketlendi; 48'inde her rengin görseli var.
Eksik ikisi (`tenis-penye-kadin-soket`, `silikonlu-dikissiz-cocuk-babet`)
Ticimax'te o renklerin fotoğrafı olmadığı için boş; kapak görseline düşüyorlar,
panelden elle bağlanabilir.

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

## Railway deploy'u — çözüldü ✅

Eskiden Faz 1 sürümünde takılıydı; 2026-08-09'da doğrulandı, artık son commit
yayında: `/yeni-urunler` 200, KDV hariç fiyat düzeni canlıda.

Tekrar takılırsa çözüm servis → Settings → Source:
- Branch `main` seçili mi
- **Wait for CI / Check Suites kapalı olmalı** (depoda CI yok, açıksa
  sonsuza kadar bekler ve hiç deploy etmez)
- Auto Deploy açık mı

İşe yaramazsa GitHub bağlantısını kaldırıp yeniden bağlamak webhook'u sıfırlar.

---

## DNS geçişi — tamamlandı ✅ (2026-08-09)

`zenginsocks.com` ve `www.zenginsocks.com` artık Railway'deki yeni siteyi
gösteriyor. Let's Encrypt sertifikası verildi (11:15 UTC, 7 Kasım 2026'ya
kadar). Ticimax sitesi bu alan adından düştü.

- Nameserver: `valentin/zelda.ns.cloudflare.com` (GoDaddy'de kayıtlı kalıyor)
- Kök: `CNAME @ → 81ke9vm2.up.railway.app` · **gri bulut (DNS only)**
- `www`: `CNAME → oh6mete6.up.railway.app` · **gri bulut**
- E-posta hiç bozulmadı: MX, `mail/smtp/imap/pop3`, SPF, DKIM aynen taşındı

**Kesinti ~25 dakika sürdü.** Sebep: DNS Railway'e döndükten sonra Railway
sertifikayı üretene kadar HTTPS el sıkışması başarısız oluyor. Bir dahaki
sefere alan adını Railway'e ekleyip **doğrulama tamamlandıktan sonra** DNS'i
çevirmek gerekir; sıralama SETUP.md bölüm 6'da düzeltildi.

Ticimax'ten kalan iki kayıt hâlâ duruyor, zararsız ama gereksiz:
`_acme-challenge` CNAME ve `_cf-custom-hostname` TXT. Temizlenebilir.

---

## Eski DNS notları (geçiş öncesi durum)

Alan adı GoDaddy'de kayıtlı ama **DNS GoDaddy'de değil**, Ticimax bayisi
Nicegrup'ta (`ns21/ns22.nicegrup.com`). Kök `104.16.109.26` ile hâlâ eski
Ticimax sitesini gösteriyor.

Railway'de iki custom domain **eklendi** (port 8080), ikisi de "Waiting for
DNS" durumunda — beklenen durum, alan adı hâlâ Nicegrup'ta. İstediği CNAME ve
`_railway-verify` TXT kayıtları SETUP.md bölüm 6'daki tabloda.

Sıradaki adım: Cloudflare'a alan adını ekleyip nameserver'ları GoDaddy'den
çevirmek.

Adım adım runbook ve bugünkü kayıt tablosu [SETUP.md](SETUP.md) bölüm 6'da.

**En kritik nokta:** MX kayıtları `s0/s1/s2.protection.ticimax.com`, posta
sunucusu `85.153.133.10`. Nameserver Cloudflare'e alınırken bunlar birebir
taşınmazsa `@zenginsocks.com` e-postaları durur.

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

**Vitrinde öne çıkan tutar KDV HARİÇ.** Toptan iş; bayi KDV hariç konuşuyor.
KDV dahil tutar hemen altında küçük yazıyla verilir, gizlenmez.

**`"use server"` dosyaları sadece async fonksiyon export edebilir.** Sabitler
ve saf yardımcılar ayrı modülde olmalı (`order-status.ts`, `phone.ts`).
Bu kural iki kez derlemeyi kırdı.

---

## Bilinen konular

| Konu | Durum |
|---|---|
| ~~Yönetici parolası `zengin2026!`~~ | ✅ 2026-08-09'da kullanıcı tarafından değiştirildi |
| Postgres Public Access açık | Geliştirme için. Yayından önce kapatılmalı |
| GitHub deposu public | `tibosocks/zengin`. Private yapılması önerildi |
| "Kadın Penye Soket Puantiyeli" | İki varyantı da `Renk: Çok Renkli`; ikincisi (CRP613) aktarılmadı. Ticimax'te renk adları ayrılırsa gelir |
| R2 token'ı hesap geneli yetkili | Sadece `zenginsocks` bucket'ına kısıtlı bir token daha güvenli olur |
| iCloud kopya dosyaları | `~/Desktop` senkronlu; `"dosya 2.ts"` ikizleri derlemeyi bozuyor. `find . -name "* [0-9].*" -delete` ile temizlenir |

---

## Erişimler

- **Panel:** https://zenginsocks.com/panel · `admin@zenginsocks.com`
  (parola 2026-08-09'da değiştirildi, kullanıcıda)
- **Canlı:** https://zenginsocks.com (Railway: zengin-production.up.railway.app)
- **Depo:** github.com/tibosocks/zengin (kullanıcı push ediyor, bu makinede
  git kimlik doğrulaması yok)
- **Railway:** proje `appealing-liberation`, servisler `zengin` + `Postgres`
- **Ticimax XML:** `.env` içinde `TICIMAX_XML_URL`

---

## Sıradaki işler

1. **İLETİŞİM BİLGİLERİ SAHTE — acil.** Ayarlar'daki değerler seed'den kalma:
   `contactPhone` = "0212 555 44 33", `whatsappNumber` = "905321112233",
   `contactAddress` boş. Bu numaralar **canlıda görünüyor**: iletişim
   sayfasında ve her ürün sayfasındaki "WhatsApp'tan sipariş ver" düğmesinde.
   Panel → Ayarlar'dan düzeltip `npx tsx --env-file=.env
   scripts/sabit-sayfalar.ts --degistir` ile iletişim sayfasını tazeleyin
2. **KVKK metnindeki [köşeli parantezli] alanları doldur** — şirket unvanı,
   adres, VKN, e-posta. Yayına almadan önce hukuk kontrolü şart
3. **Resend anahtarını gir** — e-posta kodu yazıldı ve bağlandı, sadece
   `RESEND_API_KEY` + `MAIL_FROM` ve alan adı doğrulaması eksik
   (SETUP.md adım 7). Anahtar yokken gönderim sessizce atlanıyor
4. **Google Search Console** — site ve `sitemap.xml` eklenmeli
5. `cdn.zenginsocks.com` — r2.dev üretim için önerilmiyor
6. Yayın öncesi kontrol listesinin kalanı ([SETUP.md](SETUP.md))

---

## Panel telefona kurulabiliyor (PWA)  ✅ (2026-08-09)

`public/panel.webmanifest` + panel düzeninde `appleWebApp` metadata'sı.
Kurulum adımları SETUP.md'de.

- Manifest **yalnızca panel sayfalarına** bağlı. Kök düzene koysaydık
  müşteriler vitrini kurduğunda `start_url` onları panele düşürürdü
- `scope: "/panel"` — uygulamadan vitrine geçilirse Safari'de açılıyor
- Next sadece modern `mobile-web-app-capable` etiketini basıyor; iOS 15.4
  öncesi için `apple-mobile-web-app-capable` elle eklendi (`metadata.other`)
- `viewportFit: "cover"` bilerek **yok** — çentikli ekranlarda içerik durum
  çubuğunun altına girip panel üst barını gizliyordu
- Panele `robots: noindex` eklendi (zaten robots.txt'te kapalıydı, artık
  sayfa düzeyinde de)

**İkonlar `build-brand-assets.py`'de üretiliyor**, elle eklenmedi:
- `panel-icon-180/192/512.png` — koyu zemin, beyaz Z. Vitrinin beyaz zeminli
  simgesinden ayırt edilsin diye ters renk
- Kaynak "Z"nin alfası en fazla 209 olduğu için koyu zeminde harf gri
  çıkıyordu; alfa kendi tepe değerine göre normalize ediliyor
- `apple-touch-icon.png` artık tam opak (`convert("RGB")`). Yarı saydam kenar
  pikselleri iOS'ta siyaha karşı birleşip Z'nin etrafında koyu hâle bırakıyordu

---

## Sipariş PDF çıktısı  ✅ (2026-08-09)

Sipariş detayında **"Siparişi PDF oluştur"** düğmesi; yeni sekmede A4 düzenli
çıktı sayfası açılıp yazdırma penceresini kendisi tetikliyor, kullanıcı
"PDF olarak kaydet" diyor.

- Rota: `/panel/siparisler/[id]/pdf`, yeni `(cikti)` grubu altında.
  Panel kabuğunu `@media print` ile gizlemek yerine **hiç render etmiyoruz**;
  ekran önizlemesi de gerçek çıktıya benziyor. Grubun kendi yetki kontrolü
  var — dashboard düzeninin altında olmadığı için oradaki koruma kapsamıyor
- Üstte müşteri bilgileri + tarih, altta ürün tablosu: **resim, ürün adı,
  miktar, birim fiyat, toplam**. Görsel 80px
- `@page { size: A4; margin: 12mm }`, satırlar sayfa arasında bölünmüyor,
  çok sayfalı çıktıda tablo başlığı her sayfada tekrar ediyor
- **Sayfa başına 10 ürün.** Satır yüksekliği `.satir { height: 97px }` ile
  sabitlendi. Hesap: A4'te 12mm boşlukla kullanılabilir alan 1032px, tekrar
  eden tablo başlığı 29px → 997px; 10×97=970 sığıyor, 11×97=1067 sığmıyor.
  Ürün adı `line-clamp-2` ile iki satıra sınırlı, uzun adlar yüksekliği
  kaçırmıyor. Tarayıcıda ölçülerek doğrulandı: ilk sayfa 8 satır (üstteki
  müşteri bloğu 221px yer kaplıyor), sonraki her sayfa 10 satır

**Gerçek PDF kütüphanesi kullanılmadı.** pdf-lib/pdfkit Türkçe için gömülü
font dosyası ister (standart PDF fontları ş/ğ/ı/İ taşımıyor) ve WebP görselleri
desteklemediği için hepsini sunucuda dönüştürmek gerekirdi. Tarayıcının
"PDF olarak kaydet"i aynı sonucu sıfır bağımlılıkla veriyor.

---

## Vitrin düzeltmeleri — ikinci tur (2026-08-09)  ✅

- **Bayi iskontosu vurgusu kaldırıldı.** Kullanıcı "çok nadir iskonto
  veriyoruz" dedi; ana sayfadaki koyu şerit iletişim çağrısına, değer
  önerisi "Geniş beden ve renk"e çevrildi. `/bayi-girisi`, `/bayi-basvurusu`
  ve Hakkımızda metinleri de nötrleştirildi (Hakkımızda canlı veritabanında
  da güncellendi). **İskonto özelliği duruyor** — sadece pazarlama dili
  değişti; `/hesabim`'da iskontosu olan müşteri yüzdesini görmeye devam ediyor
- **Görsel kırpılması giderildi.** Ürün fotoğrafları 1600×1600 kare ve
  çoraplar yan yana dizili; 4/5 ve 4/3 çerçevelerde `object-cover` kenardaki
  çorabı kesiyordu. Çerçeveler kareye çevrildi, `object-contain` + iç boşluk
  kullanıldı. Ürün kartlarına dokunulmadı (zaten kare, kırpma yok)
- **Kategori sayfasında varsayılan sıralama "Yeniler".** `DEFAULT_SORT`
  sabitiyle; panelde belirlenen sıraya dönmek için "Önerilen" (`sirala=onerilen`)
- **Üst menü iç içe açılıyor.** Üçüncü seviye artık aynı panelde alt alta
  değil, ikinci seviyenin üstüne gelince yandan açılıyor. Alt seviyesi olan
  başlıklarda ok işareti var
- **Telefon alanları yazarken biçimleniyor** — "0547 813 19 03".
  `formatPhoneInput` (yarım girişte de çalışır, `+90` önekini de temizler) ve
  `PhoneInput` bileşeni. Dört alanda birden kullanılıyor: bayi girişi, bayi
  başvurusu, sipariş formu, panelden müşteri oluşturma

---

## Ana sayfa yenilendi  ✅ (2026-08-09)

Eski hâli üç bölümdü: ince bir başlık şeridi, düz kategori kutuları, ürün
ızgarası. Yeni hâli altı bölüm:

1. **Giriş** — güçlü başlık, iki eylem (ürünler / bayi başvurusu), veriden
   okunan üç sayı (222 ürün · 541 beden&renk · 4 ana grup) ve kategori
   görsellerinden şaşırtmalı mozaik. Ayrı tanıtım görseli tutmuyoruz,
   katalogdaki gerçek ürünler gösteriliyor
2. **Çalışma şeklimiz** — düzine satış, bayi iskontosu, ödeme mağazada,
   WhatsApp desteği
3. **Ürün grupları** — görselli kartlar, alt kategori bağlantıları ve alt
   ağacın tamamındaki ürün sayısı (Kadın 128, Erkek 54, Çocuk 32, Bebe 8)
4. **Ürün vitrini** — `isFeatured` işaretli ürünler, yoksa en son eklenenler
5. **Sipariş nasıl veriliyor** — üç adım. Ödeme almayan bir site olduğumuz
   için bu açıklama güven açısından gerekliydi
6. **Bayilik çağrısı** — koyu şerit, başvuru + WhatsApp

Yeni yardımcılar `catalog.ts` içinde: `getCategoryHighlights()` (kategorinin
kendi görseli yok, ilk ürünün kapağı kullanılıyor) ve `getCatalogStats()`
(sayılar uydurulmuyor, veritabanından geliyor).

**Not:** hiçbir ürün `isFeatured` işaretli değil, o yüzden vitrin başlığı
"Kataloğumuzdan" çıkıyor. Panelden ürünleri öne çıkan işaretlerseniz başlık
"Öne çıkan ürünler" olur ve seçtikleriniz gösterilir.

---

## Görsel yavaşlığı  ✅ (2026-08-09)

Yeni bir cihazdan ilk girişte görseller çok yavaş yükleniyordu. Ölçüm:

| | |
|---|---|
| Depolanan görsel | **1600×1600**, 100–180 KB |
| Kartta gösterilen | ~250–300 px (25vw) |
| Ana sayfa toplamı | **0.80 MB / 8 görsel** |
| Kaynak | `r2.dev` — kenar önbelleği yok, hız sınırlı |

Sebep: **beş bileşende de `unoptimized` vardı**, yani tarayıcı 250 piksellik
kutu için 1600 piksellik dosyayı indiriyordu. `unoptimized` zorunluluktan
konmuştu — `next.config.ts`'te `images.remotePatterns` tanımlı olmadan
`next/image` uzak adresi optimize etmeyi reddediyor.

Yapılan: `remotePatterns` eklendi (adres `R2_PUBLIC_URL`'den okunuyor, CDN'e
geçince elle düzeltme gerekmesin diye) ve beş bileşenden de `unoptimized`
kaldırıldı. Ölçülen kazanç: **179 KB → 5 KB** (%97), ana sayfa ~0.80 MB → ~50 KB.

`cache-control: public, max-age=31536000, immutable` R2 nesnelerinde zaten
vardı; şikâyetin "sadece ilk giriş" olmasının sebebi buydu.

**Yan etkisi bilinsin:** artık ziyaretçi r2.dev'e hiç gitmiyor, sunucu her
görsel+boy için bir kez gidiyor. Bu r2.dev'e giden istek sayısını çok
düşürüyor (hız sınırına takılma riski azalıyor) ama r2.dev bir dönüştürme
sırasında zaman aşımına uğrarsa Next 500 döner — yani "yavaş görsel" yerine
"görsel yok". `cdn.zenginsocks.com`'a geçmek bu yüzden artık daha önemli.

Dönüştürülmüş kopyalar `.next/cache/images`'ta 30 gün duruyor. Railway diski
kalıcı olmadığı için her deploy sonrası ilk ziyaretçi dönüştürme maliyetini
ödüyor.

---

## E-posta bildirimi  ✅ kod hazır, anahtar bekliyor (2026-08-09)

`src/lib/email.ts` — Resend'in HTTP API'sine düz `fetch` ile gidiyor, SDK
eklenmedi. İki şablon: mağazaya **"Yeni sipariş"**, müşteriye
**"Siparişiniz alındı"** (müşteri e-posta vermişse).

Bağlandığı yer `placeOrder`, **işlem tamamlandıktan sonra**. Tasarım kuralı:
*e-posta bir siparişi asla bozamaz.*
- `RESEND_API_KEY` yoksa gönderim sessizce atlanıyor (`skipped: true`)
- `sendEmail` kendi içinde yakalıyor, 10 sn zaman aşımı var
- Çağrı bloğunun tamamı ayrıca `try/catch` içinde — alıcıları okurken
  veritabanına gidiliyor, o yol da hata verirse müşteri siparişi alınmış
  olmasına rağmen hata ekranı görürdü

Alıcılar önce Panel → Ayarlar'daki listeden, o boşsa
`ORDER_NOTIFICATION_EMAILS` değişkeninden okunuyor.

Şablonlar render edilip gözle doğrulandı. **Gerçek gönderim denenmedi** —
anahtar yok. Anahtar girilince bir test siparişiyle doğrulanmalı.

`server-only` importu var; bu modül CLI'dan kullanılmıyor, doğru yer. (Düz
Node'da gerçekten hata fırlattığı bu oturumda tekrar doğrulandı.)

---

## Panel düzeltmeleri (2026-08-09)  ✅

**"Stoğu bitenler" filtresi hep boş dönüyordu.** Sorgu `variants: { every: {
stock: { lte: 0 } } }` yazıyordu — yani "TÜM varyantları bitmiş ürünler".
Öyle bir ürün yok, o yüzden 222 üründe 0 sonuç. `some` olarak düzeltildi ve
ölçü vitrinle aynı hale getirildi: satılabilir = `stock − reserved`
(Prisma alan referansı: `prisma.variant.fields.reserved`). Artık 13 ürün /
22 varyant listeleniyor. Varyant satırlarına da **Tükendi** rozeti eklendi.

**"Kritik stok" eşiği sabit 5 yazılıydı**, Ayarlar'daki `lowStockThreshold`
okunmuyordu. Düzeltildi. Şu an 0 sonuç dönüyor ama bu doğru — veride 1-5
arası stoklu varyant yok, stoklar ya 0 ya da yüzlerce.

**Müşteri parolası panelden konabiliyor.** Panelden açılan müşterinin
parolası olmuyordu, `/bayi-girisi`'ne giremiyordu. Tek alternatif müşterinin
`/bayi-basvurusu`'ndan kendi kaydolmasıydı ama o akış kaydı
`onay_bekliyor`'a düşürüp yöneticinin verdiği aktifliği geri alıyor.
Eklenenler: `setCustomerPassword` eylemi, müşteri kartında **Bayi girişi**
bölümü (parolası var/yok bilgisi + belirle/değiştir), yeni müşteri formunda
isteğe bağlı parola alanı. Parola kutusu bilerek `type="text"` — yönetici
müşteriye iletebilsin diye; veritabanında bcrypt ile saklanıyor.

`dealerLogin` hata mesajı bilerek genel bırakıldı ("Telefon veya parola
hatalı"). "Bu hesabın parolası yok" demek, numaranın kayıtlı olduğunu
sızdırırdı.

**Panelden müşteri oluşturma eklendi** — `/panel/musteriler/yeni`.
`createCustomer` telefonu normalleştirip tekilliği koruyor (aynı numara varsa
mevcut kayda yönlendiriyor), bayi seçilince iskonto kutusuna Ayarlar'daki
varsayılan geliyor, iskontolu açılan müşteri `DiscountChangeLog`'a da
yazılıyor. Panelden açılan müşteri onay beklemiyor, doğrudan `aktif`.

**İskonto zaten KDV hariç fiyattan uygulanıyordu, düzeltme gerekmedi.**
`calculatePrice`: indirim `listNet` üzerinden, KDV indirimli net üzerinden.
Sipariş kalemlerine `listPrice` ve `unitPrice` KDV hariç, KDV ayrı alanda
yazılıyor — faturaya uygun.

---

## Sabit sayfalar + SEO  ✅ (2026-08-09)

`Page` modeli şemada duruyordu ama hiç kullanılmamıştı; footer'daki üç
bağlantı 404 veriyordu. Eklenenler:

- `/sayfa/[slug]` — genel sayfa rotası, içerik panelden gelen HTML
- `/panel/sayfalar` — liste, ekleme, düzenleme, silme. Panel menüsüne girdi
- `src/lib/actions/pages.ts` — `savePage` / `deletePage`
- `src/app/sitemap.ts` — kategori + ürün + sayfa adresleri, DB'den üretiliyor
- `src/app/robots.ts` — `/panel`, `/hesabim`, `/sepet`, `/siparis`, `/arama`
  dizine kapalı; sitemap adresi bildiriliyor
- `scripts/sabit-sayfalar.ts` — hakkımızda / iletişim / KVKK içeriklerini
  oluşturur. **Var olan sayfayı ezmez**, `--degistir` verilmedikçe atlar.
  İletişim sayfası telefon/adres/WhatsApp'ı Ayarlar'dan okur

**Postgres Public Access kapatıldı** (doğru olan buydu). Yan etkisi: bu
makineden `npx tsx scripts/...` ile veritabanına bağlanılamıyor, `P1017
ConnectionClosed` alınıyor. Veri betiği çalıştırmak gerektiğinde ya Railway
CLI (`railway run npx tsx scripts/...`) kullanın ya da Public Access'i geçici
açıp iş bitince kapatın.

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
npx tsx --env-file=.env scripts/gorsel-renk-etiketle.ts --kuru  # görsel-renk eşlemesi
npx tsx --env-file=.env scripts/gorsel-renk-etiketle.ts         # ve yaz
npx tsx --env-file=.env scripts/sabit-sayfalar.ts              # 3 sabit sayfa
railway run npx tsx scripts/sabit-sayfalar.ts   # Public Access kapalıyken
npm run brand:build                          # logo/favicon setleri
```
