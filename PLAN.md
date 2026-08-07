# zenginsocks.com — Katalog + Sipariş Sistemi Planı

Ticimax'in yerine geçecek, **ödeme almayan** (ödeme dükkanda), katalog + sipariş
toplama odaklı kendi altyapımız.

---

## 1. Mevcut Durum Analizi (ekran görüntülerinden)

| Konu | Tespit |
|---|---|
| İncelenen site | tibosocks.com (Ticimax) — **veri kaynağı olarak**. Tibo markası bırakılıyor |
| Marka | Zengin (tek marka görünüyor) |
| Kategori | Kadın / Erkek / Çocuk / Bebe Çorapları + Yeni Ürünler |
| Alt kategori | Var (Çocuk Çorapları → Kız Çocuk Çorapları) → **ağaç yapısı şart** |
| Varyant | Beden bazlı: `5-6 Yaş`, `36-40`, `41-44`. Stoksuz varyant "Tükendi" ve seçilemez |
| Fiyat | KDV hariç + KDV dahil birlikte gösteriliyor (₺220,00 / ₺242,00) |
| Ürün adedi | Kadın 128, Erkek 54 → toplam tahmini 300–400 |
| Sipariş kanalı | Sepet + "WhatsApp'tan Sipariş Ver" butonu |
| URL yapısı | `/kadin-coraplari?sayfa=3`, `/kiz-cocuk-patik-kalpli-corap` (flat slug) |
| Diğer | Filtreler, sıralama, grid/liste görünümü, arama, "Satıcıya Soru Sor" |

**Önemli:** Yeni site **`zenginsocks.com`** adresinde, **Zengin markası** için
kurulacak. Tibo bırakılıyor; eski sitenin birebir kopyalanması söz konusu değil.
Ticimax'ten sadece **katalog verisi** alınacak — oradaki ürünlerin tamamı zaten
Zengin markası. Bu, SEO tarafını baştan değiştiriyor (bkz. Bölüm 8) ve tasarımda
elimizi serbest bırakıyor (bkz. Bölüm 6).

---

## 2. Hedef Sistem — Kapsam

### Yapacaklarımız
- Ürün/varyant/kategori yönetimi (kendi panelimiz, Ticimax'ten çok daha sade)
- Kategori ağacı (sınırsız derinlik, sürükle-bırak sıralama)
- Vitrin sitesi (katalog + sepet + sipariş formu)
- Sipariş yönetimi paneli + müşteri kayıtları
- Excel ile toplu ürün/fiyat/stok yükleme
- WhatsApp sipariş entegrasyonu
- Bayi girişi + bayiye özel indirimli fiyat
- Gerçek adet bazlı stok takibi (rezervasyonlu)
- Ticimax'teki ~400 ürünün tek seferlik aktarımı
- Panel içi + e-posta bildirimleri

### Yapmayacaklarımız (bilinçli olarak kapsam dışı)
- Online ödeme / sanal POS (ödeme dükkanda)
- Kargo entegrasyonu, e-fatura, pazaryeri (Trendyol/Hepsiburada) entegrasyonu
  → *Faz 0'da Ticimax panelindeki aktif modüller kontrol edilecek; şu an kullanılmadığı bilgisi alındı*
- Çoklu dil / çoklu para birimi

### Alınan Kararlar (2026-08-07)
| Konu | Karar |
|---|---|
| Müşteri girişi | Üyeliksiz sipariş **ve** bayi girişi, ikisi birden. Bayiler panelden elle girilecek (az sayıda) |
| Stok | Gerçek adet takibi (rezervasyonlu) |
| Ek modüller | Yok — kargo/e-fatura/pazaryeri kapsam dışı |
| **Barındırma** | **Railway** (mevcut hesap) — uygulama + PostgreSQL aynı projede |
| **Bayi fiyatı** | **Müşteri bazında, elle girilen yüzdelik indirim**. Fiyat grubu yok |
| **Yuvarlama** | Yok — kuruşlu kalacak (₺282,20 gibi) |
| **Alan adı** | **zenginsocks.com** (GoDaddy'de kayıtlı), Zengin markası için yeni site |
| **Fiyat görünürlüğü** | Liste fiyatlarını **herkes görebilir**, giriş şartı yok |
| **Bildirim** | Panel içi bildirim **+ e-posta** |
| **Göç kapsamı** | Sadece katalog: kategori, ürün, varyant, görsel, stok. **Müşteri ve sipariş taşınmayacak** |
| **Tibo** | Bırakılıyor. Plan tamamen Zengin markası üzerine kuruluyor |
| **Ticimax** | Tek seferlik veri aktarımı dışında bağımlılık yok. Panel hazır olur olmaz yeni panele geçilecek, takvim baskısı yok |
| **Stok verisi** | Ticimax'teki adetler güncel — aktarılıp üstüne devam edilecek, sayım gerekmiyor |
| **Kategori yapısı** | Mevcut yapı aynen korunacak (Kadın / Erkek / Çocuk / Bebe + alt kategoriler) |
| **Marka görselleri** | `resimler/logo.png` ve `resimler/favicon.png` teslim alındı |

---

## 3. Teknoloji Seçimi

| Katman | Seçim | Neden |
|---|---|---|
| Framework | **Next.js 15 (App Router) + TypeScript** | Vitrin ve panel tek kod tabanında; SEO için SSR/ISR hazır |
| UI | Tailwind CSS + shadcn/ui | Hızlı, tutarlı, panel bileşenleri hazır |
| Veritabanı | **PostgreSQL** (Railway servisi) | Varyant/kategori ilişkileri için ilişkisel DB şart; uygulamayla aynı projede, özel ağ üzerinden |
| ORM | Prisma | Şema tek dosyada, migration yönetimi kolay |
| Görsel | **Cloudflare R2** + `next/image` | Railway volume'ünde tutmak yerine: CDN'li, çıkış trafiği ücretsiz, 10 GB'a kadar bedava. Bizim ~400 ürün için fazlasıyla yeterli |
| Admin auth | Auth.js (credentials) + rol tabanlı yetki | Basit, 2-5 kullanıcı için yeterli |
| Müşteri auth | Auth.js, ayrı oturum alanı (telefon/e-posta + şifre) | Bayi girişi için; admin oturumundan tamamen ayrı |
| Arama | Postgres full-text (`pg_trgm`) | 400 üründe ayrı arama motoru gereksiz |
| E-posta | **Resend** (veya Postmark) | Sipariş bildirimi + bayi onay maili. `zenginsocks.com` alan adı SPF/DKIM ile doğrulanacak ki mailler spam'e düşmesin |
| Bildirim (panel) | Sunucu tarafı olay akışı (SSE) | Panelde açık sekmeye anlık "yeni sipariş" düşer, sayfa yenilemeye gerek kalmaz |
| Deploy | **Railway** (Dockerfile + Next.js standalone) | Bkz. Bölüm 9 |

> **Neden tek uygulama?** Ayrı backend/frontend ayırmak bu ölçekte bakım maliyeti
> yaratır. Next.js Server Actions ile panel formları doğrudan DB'ye yazar.

---

## 4. Veri Modeli

```
Category
  id, name, slug, parentId (self-ref), sortOrder, imageUrl,
  isActive, showInMenu, metaTitle, metaDescription

Brand
  id, name, slug, logoUrl
  → Site tek marka (Zengin) olduğu için tabloda tek kayıt olacak; vitrinde
    marka filtresi/menüsü gösterilmez. Tablo ileride ikinci marka çıkarsa diye durur

Product
  id, name, slug, shortDesc, description(HTML), brandId,
  isActive, isNew, isFeatured, sortOrder,
  metaTitle, metaDescription, createdAt, updatedAt

ProductCategory  (çoka-çok)
  productId, categoryId, isPrimary   ← isPrimary breadcrumb için

ProductImage
  id, productId, url, alt, sortOrder, variantOptionValueId?  ← renge özel görsel

OptionType        örn: "Beden", "Renk"
  id, name, displayType (dropdown | swatch | button), sortOrder

OptionValue       örn: "36-40", "5-6 Yaş", "Siyah"
  id, optionTypeId, value, colorHex?, sortOrder

Variant
  id, productId, sku, barcode,
  price,            ← liste fiyatı, KDV hariç
  listPrice?,       ← üstü çizili fiyat
  vatRate (%),      ← ürün bazlı, varsayılan ayarlardan
  stock,            ← fiziksel adet
  reserved,         ← açık siparişlerde bekleyen adet
  lowStockThreshold, isActive
  UNIQUE(productId, optionValue kombinasyonu)
  → satılabilir adet = stock - reserved

VariantOptionValue  (çoka-çok)
  variantId, optionValueId

StockMovement     ← her stok değişiminin kaydı
  id, variantId, delta, reason (satis | iptal | sayim | giris | duzeltme),
  orderId?, userId?, note, createdAt

Customer
  id, fullName, phone(UNIQUE), email?, passwordHash?, companyName?, taxNo?,
  type (bireysel | bayi),
  status (aktif | onay_bekliyor | pasif),   ← bayi kaydı onaya düşer
  discountPercent,        ← ANA MEKANİZMA: bu müşteriye özel % indirim (varsayılan 0)
  discountNote,           ← "2024'ten beri çalışıyoruz, ciro indirimi" gibi serbest not
  note, createdAt

CustomerVariantPrice   ← İSTİSNA tablosu. Normalde boştur.
  customerId, variantId, price      "Bu müşteriye bu üründe yüzde geçmesin,
  UNIQUE(customerId, variantId)      fiyat şu olsun" denen nadir durumlar için

Address
  id, customerId, title, city, district, fullAddress

Order
  id, orderNo (ZG-2026-0001), customerId,
  status, channel (web | whatsapp | panel),
  discountPercent,  ← sipariş anındaki müşteri indirimi (sonradan değişse bile bu kalır)
  subtotal, vatTotal, discount, grandTotal,
  customerNote, adminNote, createdAt, expiresAt?

OrderItem   ← sipariş anındaki bilgiyi DONDURUR (snapshot)
  id, orderId, variantId?, productName, sku, optionsText ("Beden: 36-40"),
  unitPrice, vatRate, quantity, lineTotal

OrderStatusHistory
  id, orderId, fromStatus, toStatus, userId, note, createdAt

AdminUser
  id, name, email, passwordHash, role (owner | admin | depo), isActive

Setting   (key-value)
  siteTitle, logoUrl, whatsappNumber, phone, address,
  defaultVatRate, showVatIncluded, orderPrefix, ...

Banner
  id, imageUrl, mobileImageUrl, link, sortOrder, isActive, startsAt, endsAt

Page      (Hakkımızda, İletişim, KVKK, Mesafeli Satış)
  id, title, slug, contentHTML, isActive
```

### Sipariş durum akışı (ödeme dükkanda olduğu için özel)
```
YENİ → ONAYLANDI → HAZIRLANIYOR → TESLİME_HAZIR → TESLİM_EDİLDİ (+ödendi)
  └──────────────────── İPTAL ────────────────────┘
```

### Fiyat hesaplama mantığı
Her bayinin indirimi farklı olabildiği için **fiyat grubu kavramı yok**. İndirim
doğrudan müşteri kartında duruyor ve fiyat her istekte **hesaplanıyor, saklanmıyor**:

```
1. Müşteri girişli mi?  Değilse → liste fiyatı (indirim 0)
2. CustomerVariantPrice'ta bu müşteri+varyant için istisna var mı? → varsa onu kullan
3. Yoksa: fiyat = Variant.price × (1 − Customer.discountPercent / 100)
4. Yuvarlama YOK — kuruş hassasiyeti korunur, 2 ondalık
5. KDV, indirimli fiyatın üzerine eklenir (indirim KDV hariç fiyattan yapılır)
```

**Örnek** — Erkek Penye Kısa Konç Çizgili, liste ₺340 (KDV hariç), KDV %10:
| Kim | İndirim | KDV hariç | KDV dahil |
|---|---|---|---|
| Girişsiz ziyaretçi | %0 | ₺340,00 | ₺374,00 |
| Ahmet Ticaret | %17 | ₺282,20 | ₺310,42 |
| Yılmaz Toptan | %22,5 | ₺263,50 | ₺289,85 |
| Demir Çorap | %20 | ₺272,00 | ₺299,20 |

İndirim yüzdesi **ondalıklı girilebilir** (%17,5 gibi) — toptan pazarlıkta işe yarar.

**Bunun avantajı:** zam yaptığınızda **sadece liste fiyatını** değiştirirsiniz,
kaç bayiniz olursa olsun hepsinin fiyatı otomatik güncellenir. Excel'e de tek
fiyat sütunu yazılır. Bayi eklemek/çıkarmak fiyat tablosunu hiç etkilemez.

> **Neden grup değil de müşteri bazlı?** Grup yapısı, aynı yüzdeyi paylaşan çok
> sayıda bayi varsa işe yarar. Sizde her bayinin yüzdesi ayrı olduğu için grup
> katmanı sadece fazladan tıklama ve kafa karışıklığı yaratırdı. Müşteri kartına
> yüzdeyi yazmak hem daha az adım hem "bu bayi kaç alıyor" sorusunun cevabı
> tek yerde.

### Stok mantığı — kritik karar
Ödeme peşin alınmadığı için sipariş verip gelmeyen müşteri riski var. Bu yüzden
**rezervasyon modeli** kullanacağız:

| An | Ne olur |
|---|---|
| Sipariş oluşur (`YENİ`) | `reserved += adet`. Fiziksel `stock` değişmez. Vitrinde ürün "satılabilir adet = stock − reserved" üzerinden gösterilir → **aynı malı iki kişiye satmayız** |
| Sipariş `TESLİM_EDİLDİ` | `stock -= adet`, `reserved -= adet`. `StockMovement` kaydı düşer |
| Sipariş `İPTAL` | `reserved -= adet`. Stok serbest kalır |
| Sipariş X gün boyunca `YENİ` kalırsa | Otomatik uyarı (opsiyonel: otomatik iptal). `expiresAt` alanı bunun için |

Panelde her varyantta üç sayı görünür: **Stok / Rezerve / Satılabilir**.
Sayım yaptığınızda "Stok Düzeltme" ekranından girilen fark `StockMovement`'a
`sayim` sebebiyle yazılır — böylece stok neden değişti her zaman izlenebilir.

---

## 5. Yönetim Paneli (`/panel`)

### 5.1 Dashboard
- Bugünkü/bu haftaki sipariş sayısı ve tutarı
- Bekleyen sipariş sayısı (aksiyon gerektiren)
- Stoğu biten / kritik seviyeye düşen varyantlar listesi
- Onay bekleyen bayi başvuruları
- En çok sipariş edilen 10 ürün

### 5.2 Ürünler — *"Ticimax'ten çok daha kolay" kısmı burası*
**Liste ekranı**
- Arama, kategori/stok/durum filtresi ("stoğu bitenler", "kritik stok" hazır filtreleri)
- **Satır içi düzenleme**: fiyat ve stok kutucuğuna tıkla-yaz-kaydet (sayfa değişmeden)
- Her varyantta **Stok / Rezerve / Satılabilir** üçlüsü
- Toplu işlemler: `Seçilenlerin fiyatını %X artır`, `Aktif/Pasif yap`, `Kategori ata`

**Ürün ekleme/düzenleme — tek sayfa, sekmesiz**
1. Temel: ad (slug otomatik), açıklama, marka, durum
2. Kategori: ağaç görünümü, checkbox ile çoklu seçim, biri "ana kategori"
3. Görseller: sürükle-bırak çoklu yükleme, sürükleyerek sıralama, ilk görsel kapak
4. **Varyant sihirbazı**: `Beden` seç → `36-40, 41-44` işaretle →
   sistem kombinasyon tablosunu otomatik üretir. Tabloda her satır için
   SKU / fiyat / stok. Üstte "hepsine uygula" alanı (tek tıkla tüm bedenlere aynı fiyat/stok)
5. **Bayi fiyatı için ekstra alan yok.** Sadece liste fiyatını girersiniz; her
   bayinin fiyatı kendi yüzdesiyle otomatik hesaplanır. Yanında küçük bir
   "%10 → ₺306 · %20 → ₺272 · %30 → ₺238" hesap şeridi bilgi amaçlı görünür
6. SEO: meta başlık/açıklama (boşsa üründen otomatik türetilir)

### 5.3 Kategoriler
- Sürükle-bırak ağaç (sıralama ve üst kategori değiştirme aynı ekranda)
- Kategori görseli, menüde göster/gösterme, SEO alanları

### 5.4 Siparişler
- Liste: durum sekmeleri, tarih aralığı, müşteri/telefon arama
- Detay: ürünler + varyant bilgisi, müşteri iletişim, durum değiştirme + not
- **Yazdır**: A4 sipariş fişi (dükkanda teslimat için) — PDF
- "Müşteriye WhatsApp yaz" butonu (hazır mesaj şablonuyla)
- Panelden manuel sipariş oluşturma (telefonla gelen siparişler için)

### 5.5 Müşteriler ve Bayiler
Bayi fiyatlandırması burada yönetiliyor — ayrı bir "fiyat grupları" ekranı yok.

**Liste**
| Müşteri | Firma | Telefon | İndirim | Sipariş | Toplam ciro | Durum |
|---|---|---|---|---|---|---|
| Ahmet Yılmaz | Ahmet Ticaret | 0532… | **%17** ✎ | 24 | ₺48.200 | Aktif |
| Mehmet Demir | Demir Çorap | 0533… | **%20** ✎ | 11 | ₺19.700 | Aktif |
| Ayşe Kaya | — | 0555… | %0 | 2 | ₺680 | Aktif |

- **İndirim sütunu satır içi düzenlenebilir** — tıkla, yaz, kaydet. Müşteri
  detayına girmeye gerek yok
- Ondalıklı yüzde kabul edilir (%17,5)
- Filtre: "indirimli bayiler", "onay bekleyenler", "hiç sipariş vermemişler"
- Toplu işlem: seçilen müşterilere aynı yüzdeyi uygula (yeni bayi grubu tanımlarken)

**Bayi başvuru kuyruğu**
- Yeni bayi kaydı `onay_bekliyor` durumunda gelir, fiyatları göremez
- Onay ekranında firma bilgileri + **indirim yüzdesi girilir** → tek adımda aktifleşir
- Ayarlarda "yeni bayi varsayılan indirimi" tanımlanabilir, onay ekranına hazır gelir

**Müşteri detayı**
- Bilgiler, indirim yüzdesi + indirim notu ("2024'ten beri, ciro indirimi")
- Sipariş geçmişi, toplam ciro, en çok aldığı ürünler
- **Bu müşteriye özel fiyat listesi çıkar** (Excel/PDF) — bayiye gönderilecek
  fiyat listesi, onun yüzdesiyle hesaplanmış halde. Toptan işte çok işe yarar
- İstisna fiyatlar sekmesi (normalde boş)

**Denetim:** indirim yüzdesi her değiştiğinde kim, ne zaman, hangi değerden
hangi değere çevirdi kaydedilir.

### 5.6 Toplu İşlemler (Excel)
- **Dışa aktar**: tüm ürün/varyantlar tek Excel'de — tek fiyat sütunu (liste fiyatı).
  Bayi fiyatları hesaplandığı için Excel'de tutulmaz, karmaşa çıkmaz
- **İçe aktar**: aynı formatı doldur-yükle → yeni ürün ekler, mevcut olanı SKU'dan
  eşleştirip günceller. Yüklemeden önce **önizleme + doğrulama raporu** gösterir
- Sadece fiyat/stok güncelleme modu (zam yaparken ve sayımda en çok kullanılacak)

### 5.7 Bildirimler
İki kanal birlikte çalışır:

**Panel içi**
- Üst barda zil ikonu + okunmamış sayacı
- Panel açıkken yeni sipariş **anlık düşer** (SSE), sayfa yenilemeye gerek yok
- Opsiyonel sesli uyarı — dükkanda panel açık dururken işe yarar
- Bildirim merkezi: tüm bildirimlerin listesi, tıklayınca ilgili kayda gider

**E-posta**
- Alıcı listesi ayarlardan yönetilir (birden fazla adres olabilir)
- Sipariş özeti mailin içinde: ürünler, varyantlar, adet, tutar, müşteri iletişim
  → maili açar açmaz panele girmeden ne geldiğini görürsünüz
- Gönderim `siparis@zenginsocks.com` gibi kendi alan adınızdan olur

**Hangi olaylarda bildirim gider** (her biri ayarlardan açılıp kapanabilir)
| Olay | Panel | E-posta |
|---|---|---|
| Yeni sipariş | ✔ | ✔ |
| Yeni bayi başvurusu | ✔ | ✔ |
| Sipariş iptali (müşteri) | ✔ | ✔ |
| Stok kritik seviyeye düştü | ✔ | günlük özet |
| X gündür bekleyen sipariş var | ✔ | günlük özet |

**Müşteriye giden mailler** (e-postası varsa): sipariş alındı onayı,
sipariş hazır bildirimi, bayi başvurusu onaylandı.

### 5.8 Ayarlar
- Logo, iletişim, WhatsApp numarası
- Varsayılan KDV oranı, "KDV dahil göster" anahtarı
- Yeni bayi başvurularında varsayılan indirim yüzdesi
- Bildirim tercihleri ve e-posta alıcı listesi
- Fiyatları girişsiz ziyaretçiye göster/gizle anahtarı (**varsayılan: göster**)
- Anasayfa slider/banner yönetimi
- Sabit sayfalar (Hakkımızda, İletişim, KVKK)
- Kullanıcılar ve roller

---

## 6. Marka ve Tasarım Yönü

Teslim edilen dosyalar:
| Dosya | İçerik | Durum |
|---|---|---|
| `resimler/logo.png` | "ZENGİN SOCKS" yazısı, siyah serif, 1920×1920 | Hazırlanması gerekiyor (aşağıya bakın) |
| `resimler/favicon.png` | Italik "Z" harfi, koyu gri, 500×500 | Hazırlanması gerekiyor |

### Dosyalarla ilgili iki teknik konu
1. **İkisi de saydam değil** (alfa kanalı yok, beyaz zemin gömülü). Koyu ya da
   renkli bir zemine koyulduğunda etrafında beyaz kutu görünür. Saydam sürümlerini
   üreteceğim — logo düz metin olduğu için temiz çıkar.
2. **Logoda çok fazla boşluk var** — 1920×1920 karenin ortasında küçük bir yazı.
   Üst menüde kullanmak için içeriğe göre kırpılmış bir sürüm gerekiyor.
3. **Vektörel (SVG) sürüm önerisi**: logo sadece yazı olduğu için SVG'ye
   çevrilebilir. Böylece her boyutta net görünür ve dosya boyutu birkaç KB'a düşer.
   Elinizde orijinal Illustrator/vektör dosyası varsa en iyisi o; yoksa PNG'den
   üretirim.

Üreteceğim setler: yatay logo (saydam), koyu zemin için beyaz sürüm,
favicon (16/32/180/512 px + `.ico`), sosyal medya paylaşım görseli (OG image).

### Tasarım yönü
Logo, mevcut Tibo sitesinden **tamamen farklı bir yön** işaret ediyor: sarı ayı
maskotlu, yuvarlak hatlı, çocuksu bir görünüm yerine **siyah-beyaz, serif, sade
ve ciddi** bir kimlik. Siteyi buna göre kuracağım:

- Beyaz zemin, siyah tipografi, gri ara tonlar. Renk sadece işlev için
  (stok durumu, uyarı, WhatsApp yeşili)
- Başlıklarda logodakine yakın bir serif, gövde metninde okunaklı bir sans-serif
- Bol boşluk, ince çizgiler, gölge yerine kenarlık
- Ürün fotoğrafları öne çıksın — çorap fotoğrafları renkli, arka plan sakin kalmalı
- Toptan iş olduğu için: liste görünümü, hızlı adet girişi, sade kartlar.
  Süs değil, verimlilik

> Bu yön logodan okuduğum kadarıyla. Aklınızda başka bir görünüm varsa
> (örnek site verebilirsiniz) tasarıma başlamadan söyleyin, Faz 3'ün başında
> düzeltmek kolay, sonunda zor.

---

## 7. Vitrin Sitesi

| Sayfa | İçerik |
|---|---|
| Anasayfa | Slider, kategori kartları, yeni ürünler, öne çıkanlar |
| Kategori | Filtre (beden/fiyat), sıralama, grid-liste, sayfalama, alt kategori çipleri |
| Ürün detay | Görsel galeri (zoom), varyant seçimi (tükenen pasif), adet, sepete ekle, WhatsApp sipariş, breadcrumb, benzer ürünler |
| Arama | Ürün adı + SKU üzerinde |
| Sepet | Adet güncelle, sil, toplam (KDV hariç/dahil ayrımıyla) |
| Sipariş formu | Ad soyad, telefon, e-posta(ops.), firma/vergi no(ops.), not. **Ödeme yok**. Girişliyse alanlar dolu gelir |
| Sipariş sonucu | Sipariş no + "Ödemenizi mağazada yapacaksınız" bilgisi |
| **Bayi kaydı** | Firma adı, vergi no, yetkili, telefon → `onay_bekliyor` durumunda kaydolur, panelden onaylanır |
| **Bayi girişi** | Telefon/e-posta + şifre. Giriş sonrası tüm katalogda **kendi iskontolu fiyatları** görünür |
| **Hesabım** | Sipariş geçmişi ve durumları, bilgi güncelleme, tekrar sipariş ver |
| Sabit sayfalar | Hakkımızda, İletişim, KVKK, Çerez politikası |

**Fiyat gösterimi kuralı**
- Girişsiz ziyaretçi → **liste fiyatı** (indirim yok)
- Girişli bayi → liste fiyatı üstü çizili + kendi indirimli fiyatı, yanında
  "Size özel %17" etiketi. Sepette "Bayi indiriminiz: −₺1.240" satırı
- Sipariş oluşurken fiyat **sunucuda yeniden hesaplanır** — istemciden gelen
  fiyata asla güvenilmez. Bir bayi başka bir bayinin yüzdesini kullanamaz
- ISR ile statik üretilen sayfalarda liste fiyatı gömülü gelir; bayi girişliyse
  indirimli fiyat istemci tarafında tazelenir → hem hız hem doğru fiyat
- **Kritik:** indirim yüzdesi hiçbir genel API yanıtında dönmez, sadece o
  müşterinin kendi oturumunda hesaplanmış fiyat döner. Bayiler birbirinin
  iskontosunu göremez

**Teknik notlar**
- Kategori ve ürün sayfaları ISR ile statik üretilir → çok hızlı, Ticimax'ten belirgin fark
- Panelden kayıt yapılınca ilgili sayfa `revalidatePath` ile anında tazelenir
- Mobil öncelikli tasarım (trafiğin çoğu mobil olacaktır)
- `sitemap.xml`, `robots.txt`, ürün için JSON-LD structured data

---

## 8. Ticimax'ten Veri Göçü

**Karar: Sadece katalog aktarılacak. Müşteriler ve geçmiş siparişler taşınmayacak.**

Bu, göç işini belirgin şekilde kolaylaştırıyor — en riskli kısımlar (müşteri
eşleştirme, sipariş geçmişi tutarlılığı) tamamen devre dışı kaldı.

### Aktarılacaklar
| Veri | Durum |
|---|---|
| Kategori ağacı | ✔ Aktarılacak |
| Ürünler (ad, açıklama, SEO) | ✔ Aktarılacak |
| Varyantlar (beden, fiyat, SKU) | ✔ Aktarılacak |
| Stok adetleri | ✔ Aktarılacak (doğruluğu teyit edilecek — bkz. Bölüm 12) |
| Ürün görselleri | ✔ Aktarılacak |
| **Müşteriler** | ✘ Panelden elle girilecek (az sayıda) |
| **Geçmiş siparişler** | ✘ Sıfırdan başlanacak |

**Bu tek seferlik bir iştir.** Ticimax'e kalıcı bir bağımlılık kurmuyoruz —
veriyi bir kez çekip yeni panele koyuyoruz, sonrası tamamen yeni panelden yürüyor.

### Nasıl çekeceğiz — iki yol

**Yol A: Ticimax web servisi (tercih edilen)**
Ticimax'in entegrasyon web servisi var; panelden açılıp bir yetki anahtarı
(API key) alınıyor. Erişim sağlanırsa kategori ağacını ve ürünleri hiyerarşisi
bozulmadan, doğrudan çekerim. Elle dosya alışverişi olmaz, tekrar çalıştırılabilir.

*Sizden gerekenler:* Ticimax panelinde web servisinin açılması ve bana
yetki anahtarı + servis adresinin iletilmesi. Panelde `Entegrasyon` /
`Web Servis` başlığı altında olur; bulamazsanız Ticimax desteğine sorulabilir
(bazı paketlerde ek özellik olarak sunuluyor).

**Yol B: Excel export (garantili yedek)**
Web servisi açılamazsa Ticimax panelinden ürün ve kategori Excel'i alınır.
Sonuç aynı, sadece kolon eşlemesi biraz daha zahmetli ve tekrar çekmek için
her seferinde yeni dosya gerekir.

> Hangi yol olursa olsun plan aksamaz — **Yol B kesin çalışır**, Yol A sadece
> daha rahat. Faz 1 (panel iskeleti) bu karardan bağımsız olarak başlayabilir.

### Adımlar
1. Veri çekilir (Yol A veya B). İhtiyacımız olanlar:
   - Kategori listesi, üst-alt ilişkisiyle birlikte
   - Ürünler: ad, açıklama, kategori, SEO alanları
   - Varyantlar: beden, fiyat, stok adedi, SKU/barkod
   - Görseller (URL yeterli, indirmesini ben yaparım)
2. Eşleme scripti: kategori ağacı → `Category`, ürün → `Product`,
   beden seçenekleri → `OptionValue` + `Variant`, stok adedi → `Variant.stock`
3. Görseller indirilip R2'ye yüklenir, WebP'ye çevrilip boyutlandırılır
4. **Doğrulama raporu**: ürün sayısı, varyant sayısı, görseli olmayan ürünler,
   kategorisiz ürünler, fiyatı 0 olanlar, stok toplamı — Ticimax ile karşılaştırmalı
5. Aktarım scripti tekrar çalıştırılabilir yazılır: geliştirme sürerken Ticimax'te
   yaptığınız değişiklikleri açılış gününde bir kez daha tazeleyebilmek için

### SEO — yeni alan adı olduğu için durum farklı
`zenginsocks.com` sıfırdan bir alan adı. Bu şu anlama geliyor:

**İyi haber:** Korunması gereken indeksli URL yok. 301 yönlendirme tablosu,
slug'ları birebir koruma zorunluluğu, "trafik düşer mi" riski — hiçbiri geçerli değil.
Slug'ları istediğimiz gibi düzenleyebiliriz (ör. `/kadin-coraplari/kadin-penye-patik-emojili`
gibi kategori içeren, daha anlamlı bir yapı kurabiliriz).

**Dikkat edilecek:** Yeni alan adının Google'da yer bulması zaman alır (3-6 ay).
Bunu hızlandırmak için ilk günden yapılacaklar:
- `sitemap.xml` + Google Search Console'a kayıt ve gönderim
- Ürünler için JSON-LD yapısal veri (fiyat, stok durumu, marka)
- Her kategori ve ürün için dolu meta başlık/açıklama
- Google Business profili, sosyal medya hesapları → siteye bağlantı

**Tibo hakkında tek not:** Tibo bırakıldığına göre, `tibosocks.com` alan adı
elinizdeyse süresi dolmadan `zenginsocks.com`'a **301 yönlendirmesi** koymak
ucuz bir kazanç olur — eski sitenin Google'daki birikimi yeni siteye akar ve
yeni alan adının bekleme süresi kısalır. Sadece DNS ayarı, 10 dakikalık iş.
Zorunlu değil, istemezseniz plan aynen ilerler.

---

## 9. Faz Planı

| Faz | Süre | Çıktı |
|---|---|---|
| **0 — Hazırlık** | 1-2 gün | GitHub repo + Railway projesi (web + postgres, europe-west4) + R2 bucket kurulur, `zenginsocks.com` DNS'i Cloudflare'e taşınır, logo/favicon setleri hazırlanır. **Paralelde: Ticimax web servisi açılır veya Excel export alınır** |
| **1 — Çekirdek panel** | ~1 hafta | Admin girişi, kategori ağacı CRUD, ürün + varyant CRUD, stok alanları, görsel yükleme |
| **2 — Veri göçü** | ~2-3 gün | Ticimax kataloğu aktarılır (kategori, ürün, varyant, görsel, stok). **Katalog gerçek veriyle panelde görülür**. Müşteri/sipariş taşınmadığı için kısaldı |
| **3 — Vitrin katalog** | ~1 hafta | Anasayfa, kategori, ürün detay, arama, filtre, mobil tasarım. Site gezilebilir hale gelir |
| **4 — Sipariş + stok akışı** | ~1 hafta | Sepet, sipariş formu, rezervasyonlu stok düşümü, sipariş paneli, müşteri kayıtları, **panel + e-posta bildirimleri**, WhatsApp, fiş yazdırma |
| **5 — Bayi sistemi** | ~1 hafta | Müşteri bazlı indirim yüzdesi, bayi kaydı/onayı, bayi girişi, indirimli fiyat gösterimi, müşteriye özel fiyat listesi çıktısı, "Hesabım" |
| **6 — Yayına alma** | ~3-4 gün | Excel içe/dışa aktarma, toplu işlemler, SEO + Search Console, e-posta alan adı doğrulama, yedekleme, DNS kurulumu |
| **7 — İyileştirme** | sonrası | Raporlar, kampanya/indirim kodu, stok uyarı bildirimleri, sipariş hatırlatma |

**Toplam: ~5-6 hafta.** Takvim baskısı yok — panel hazır olduğunda geçilecek.

Her fazın sonunda çalışan bir sürüm olur:
- **Faz 1 sonunda** panel kullanılabilir durumda olur. İsterseniz aktarımı
  beklemeden ürün girmeye başlayabilirsiniz
- **Faz 2 sonunda** tüm kataloğunuzu yeni panelde görürsünüz — sistemi
  değerlendirmenin en erken noktası
- **Faz 4 sonunda** `yeni.zenginsocks.com` üzerinden gerçek sipariş alınabilir
- **Faz 6** kök alan adı devreye alınır, site yayında

> **Faz sırası esnek.** Bayi sistemini (Faz 5) sonraya bıraktım çünkü katalog ve
> sipariş çalışmadan bayi fiyatının anlamı yok. Bayiler sizin için daha acilse
> Faz 4 ile yer değiştirebilir — söylemeniz yeterli.

---

## 10. Barındırma ve Maliyet

**Karar: Railway** (mevcut hesap kullanılacak). Bu proje için iyi bir seçim —
Vercel'in aksine uygulama ve veritabanı aynı yerde, uzun süren işlemlerde
(Excel içe aktarma, veri göçü, görsel işleme) serverless zaman sınırına takılmıyoruz.

### Railway proje yapısı
```
Zengin Projesi
├── web        → Next.js uygulaması (GitHub repo'dan otomatik deploy)
├── postgres   → PostgreSQL servisi (özel ağ üzerinden bağlanır)
└── (worker)   → Gerekirse arka plan işleri için ikinci servis
```
- `web` ve `postgres` **özel ağ (private network)** üzerinden konuşur → internete
  çıkmaz, hem hızlı hem güvenli. `DATABASE_URL` için `postgres.railway.internal` kullanılır
- GitHub'a push → otomatik build & deploy. PR'lar için ayrı ortam açılabilir
- **Bölge: `europe-west4` (Amsterdam)** seçilecek — Türkiye'ye en yakın bölge,
  ABD bölgesine göre gecikme belirgin şekilde düşük

### Railway'e özel dikkat edilecekler
| Konu | Yaklaşım |
|---|---|
| **Görseller** | Railway volume'ünde **tutmayacağız**. Volume'ün CDN'i yok ve tek servise bağlı. Görseller Cloudflare R2'de, Railway sadece uygulamayı çalıştırır |
| **ISR önbelleği** | Konteyner dosya sisteminde tutulur, her deploy'da sıfırlanır (sorun değil, yeniden üretilir). **Tek replika** ile çalışacağız; ileride replika artarsa önbelleği Redis'e almak gerekir |
| **Yedekleme** | Railway'in kendi Postgres yedeği açılacak **+** ayrıca günlük `pg_dump` alıp R2'ye atan bir cron. Tek yedeğe güvenmiyoruz |
| **Migration** | `prisma migrate deploy` deploy adımında otomatik çalışır |
| **Uyku modu** | Railway'de "serverless/sleep" ayarı **kapalı** olmalı — açıksa ilk ziyaretçi soğuk başlatma bekler, SEO ve kullanıcı deneyimi için kötü |
| **Alan adı** | Railway'de custom domain tanımlanır, SSL otomatik. **Ama GoDaddy DNS'te bir engel var — aşağıya bakın** |
| **E-posta gönderimi** | `zenginsocks.com` için SPF/DKIM/DMARC kayıtları eklenecek, yoksa sipariş mailleri spam'e düşer |

### Alan adı kurulumu — dikkat edilecek nokta
`zenginsocks.com` GoDaddy'de kayıtlı. Railway custom domain için bir **CNAME**
hedefi veriyor. Sorun şu: **kök alan adına (apex) CNAME yazılamaz**; bunun için
DNS sağlayıcısının ALIAS / ANAME / CNAME flattening desteklemesi gerekir ve
**GoDaddy'nin DNS'i bunu desteklemiyor.**

Üç çözüm var, önerim ikincisi:

| Yol | Nasıl | Değerlendirme |
|---|---|---|
| 1. Sadece `www` kullan | `www.zenginsocks.com` → Railway CNAME, kök alan adı GoDaddy'den www'ye yönlendirilir | Çalışır ama yönlendirme ek bir sıçrama, adres çubuğunda hep `www.` görünür |
| 2. **DNS'i Cloudflare'e taşı** (önerilen) | Alan adı GoDaddy'de kayıtlı kalır, sadece nameserver'lar Cloudflare'e çevrilir. Cloudflare apex'te CNAME flattening destekler | Ücretsiz. Ayrıca CDN, DDoS koruması ve görseller için ek önbellek gelir. 15 dakikalık iş |
| 3. Railway'in verdiği IP'yi A kaydı yap | GoDaddy'de A kaydı | **Önermiyorum** — IP değişirse site düşer, haber vermez |

Kurulum sırası: önce `yeni.zenginsocks.com` alt alan adında test edilir
(bu CNAME olduğu için GoDaddy'de de sorunsuz çalışır), her şey onaylandıktan
sonra kök alan adı devreye alınır.

### Maliyet
| Kalem | Aylık |
|---|---|
| Railway (web + postgres, Hobby planı) | ~$5–20 (kullanıma göre) |
| Cloudflare R2 (görseller) | **$0** (10 GB'a kadar ücretsiz, çıkış trafiği hep ücretsiz) |
| Domain | mevcut |
| **Toplam** | **~$5–20 / ay** |

Ticimax aboneliğinin altında kalması bekleniyor.

---

## 11. Riskler ve Önlemler

| Risk | Önlem |
|---|---|
| **Yeni alan adı Google'da yok** | En büyük risk bu. `zenginsocks.com` sıfırdan başlıyor, ilk aylarda organik trafik gelmez. Search Console + sitemap + yapısal veri ilk günden; kısa vadede trafik WhatsApp, sosyal medya ve mevcut müşterilerden gelecek |
| Sipariş maillerinin spam'e düşmesi | `zenginsocks.com` için SPF/DKIM/DMARC kurulur, gönderim kendi alan adından yapılır. Panel bildirimi zaten yedek kanal |
| GoDaddy DNS'in apex CNAME desteklememesi | Faz 0'da DNS Cloudflare'e taşınır (bkz. Bölüm 10) |
| **Ticimax web servisine erişilememesi** | Excel export yedek yolu var, sonuç değişmez (bkz. Bölüm 8). Faz 1 bu karardan bağımsız ilerler |
| Veri aktarımında eksik/bozuk kayıt | Sayısal doğrulama raporu, yayına almadan önce onay. Ticimax bir süre açık kalacağı için karşılaştırma imkanı var |
| Kesintisiz açılış | Yeni sistem `yeni.zenginsocks.com` altında çalıştırılır, onaydan sonra kök alan adı devreye alınır |
| Bakım/güncelleme sorumluluğu | Ticimax'te destek vardı, burada yok → dokümantasyon + basit tutma |
| Yedekleme | Günlük otomatik DB yedeği + görsellerin ayrı storage'da olması |
| **Stok tutarsızlığı** | Ödeme peşin olmadığı için "sipariş verip gelmeyen" olur → rezervasyon modeli + bekleyen sipariş uyarısı. Ayrıca `StockMovement` ile her değişimin izi tutulur |
| **Bayi iskontosunun sızması** | Her bayinin yüzdesi farklı → biri diğerininkini görürse sorun olur. Fiyat sunucuda hesaplanır, yüzde hiçbir API yanıtında dönmez, sadece o oturuma ait hesaplanmış fiyat gider |
| **Yanlış yüzde girilmesi** | Elle giriş olduğu için hata riski var → indirim değişiklikleri denetim kaydına yazılır (kim, ne zaman, hangi değerden), %50 üstü girişlerde onay uyarısı |
| **Sahte bayi kaydı** | Bayi kaydı otomatik aktifleşmez, panelden onay şart |

---

## 12. Netleşmesi Gereken Sorular

Kararların tamamı Bölüm 2'deki tabloda. Plan artık başlamak için yeterli —
aşağıdakiler yol boyunca çözülebilir, hiçbiri engelleyici değil:

1. **Ticimax web servisi açılabiliyor mu?** Panelde `Entegrasyon` / `Web Servis`
   başlığına bakın. Açılabilirse yetki anahtarını iletin; açılamıyorsa Excel
   export'u alın. İkisi de olmazsa Faz 1'e başlar, aktarımı sonra hallederiz
2. **Logonun vektörel (AI/SVG) dosyası var mı?** Yoksa PNG'den üretirim,
   sorun olmaz — sadece elinizde varsa daha temiz sonuç verir
3. **`tibosocks.com` elinizde mi kalacak?** Kalacaksa `zenginsocks.com`'a
   301 yönlendirmesi ücretsiz bir SEO kazancı (bkz. Bölüm 8). Zorunlu değil
4. **Sipariş bildirimleri hangi e-posta adreslerine gitsin?** Birden fazla
   olabilir. Faz 4'e kadar zamanı var
5. **Anasayfa banner görselleri** kim hazırlayacak? Şimdilik ürün fotoğraflarından
   sade bir düzen kurarım, sonra değiştirilebilir
6. **Tasarım yönü onayı** (bkz. Bölüm 6) — logodan okuduğum sade siyah-beyaz
   çizgi uygun mu? Faz 3 başlamadan söylemeniz yeterli
