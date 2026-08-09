# Kurulum — dış servisler

Kodun kendisi hazır; bu dosyadaki adımlar **sizin hesaplarınızda** yapılması
gerekenler. Sırayla gidin, her adımın sonunda ne alacağınız yazıyor.

Adım 1 en acil olanı — o olmadan veritabanı çalışmaz ve hiçbir ekran açılmaz.

---

## 1. Railway — PostgreSQL  ⚠️ önce bu

1. [railway.app](https://railway.app) → **New Project**
2. Proje adı: `zenginsocks`
3. **Settings → Region**: `europe-west4 (Amsterdam)` seçin
   > Varsayılan ABD bölgesi kalırsa Türkiye'den her istek Atlantik'i geçer.
   > Bölgeyi sonradan değiştirmek servisi yeniden kurmayı gerektirir, şimdi yapın.
4. **+ New → Database → Add PostgreSQL**
5. Postgres servisine tıklayın → **Variables** sekmesi → `DATABASE_PUBLIC_URL`
   değerini kopyalayın

**Bana iletmeniz gereken:** `DATABASE_PUBLIC_URL` değeri.
`postgresql://postgres:xxxx@yyyy.proxy.rlwy.net:12345/railway` şeklinde olur.

> Bu adres geliştirme sırasında dışarıdan bağlanmak için. Uygulama Railway'e
> kurulduğunda özel ağ adresi (`postgres.railway.internal`) kullanılacak,
> onu ben ayarlarım.

---

## 2. GitHub deposu

1. GitHub'da **boş** bir depo açın: `zenginsocks` (private)
2. Bana adresini verin, kodu oraya göndereyim

Railway bu depoya bağlanacak; her push otomatik yayına çıkacak.

---

## 3. Railway — uygulama servisi

GitHub deposu hazır olduktan sonra:

1. Aynı Railway projesinde **+ New → GitHub Repo** → `zenginsocks`
2. Servis ayarlarında:
   - **Settings → Networking → Generate Domain** (geçici test adresi)
   - **Settings → Serverless / Sleep: KAPALI**
     > Açık kalırsa siteye ilk giren kişi soğuk başlatma bekler. SEO için de kötü.
3. **Variables** sekmesine şunları girin (değerleri aşağıdaki adımlardan gelecek):

```
DATABASE_URL=${{Postgres.DATABASE_URL}}
AUTH_SECRET=<adım 4>
NEXT_PUBLIC_SITE_URL=https://zenginsocks.com
NEXT_PUBLIC_SITE_NAME=Zengin Socks
R2_ACCOUNT_ID=<adım 5>
R2_ACCESS_KEY_ID=<adım 5>
R2_SECRET_ACCESS_KEY=<adım 5>
R2_BUCKET=zenginsocks
R2_PUBLIC_URL=<adım 5>
```

> `${{Postgres.DATABASE_URL}}` Railway'in kendi değişken referansı — özel ağ
> adresini otomatik çözer. Elle URL yazmayın.

---

## 4. Oturum anahtarı

Terminalde çalıştırın, çıkan değeri `AUTH_SECRET` olarak kullanın:

```bash
openssl rand -base64 32
```

Bu anahtar değişirse **herkesin oturumu kapanır** (tehlikeli değil, sadece
yeniden giriş gerekir). Bir kere üretip saklayın.

---

## 5. Cloudflare R2 — ürün görselleri

1. [dash.cloudflare.com](https://dash.cloudflare.com) → **R2** → **Create bucket**
   - Ad: `zenginsocks`
   - Konum: **Automatic** ya da Avrupa
2. Bucket → **Settings → Public access** → **R2.dev subdomain**'i açın
   (kalıcı çözümde `cdn.zenginsocks.com` bağlanır, şimdilik r2.dev yeterli)
3. R2 ana sayfası → **Manage R2 API Tokens** → **Create API Token**
   - Yetki: **Object Read & Write**
   - Sadece `zenginsocks` bucket'ı için sınırlayın

**Alacağınız değerler:** Account ID, Access Key ID, Secret Access Key,
ve bucket'ın herkese açık adresi (`https://pub-xxxx.r2.dev`).

> Ücretsiz katman 10 GB. ~400 ürün × birkaç görsel bunun çok altında kalır.
> Çıkış trafiği R2'de her zaman ücretsiz — asıl kazanç bu.

---

## 6. Alan adı — DNS geçişi (Ticimax → Railway)

### Bugünkü durum (2026-08-09'da ölçüldü)

Alan adı **GoDaddy'de kayıtlı** ama **DNS GoDaddy'de değil**: yetkili
nameserver'lar Ticimax bayisi Nicegrup'ta. Yani kayıtları bugün GoDaddy
panelinden değil, delegasyonu değiştirerek yöneteceğiz.

| Kayıt | Bugünkü değer | Ne işe yarıyor |
|---|---|---|
| NS | `ns21.nicegrup.com`, `ns22.nicegrup.com` | DNS yönetimi Nicegrup'ta |
| A `@` | `104.16.109.26` | eski Ticimax sitesi |
| `www` | `zenginsocks.com` → aynı IP | eski site |
| **MX** | `s0/s1/s2.protection.ticimax.com` | **e-posta — en kritik kayıt** |
| `mail`, `smtp`, `imap` | `85.153.133.10` | posta kutusu sunucusu |
| TXT SPF | `v=spf1 include:_spf.nicegrup.com -all` | e-posta doğrulama |
| TXT `_dmarc` | `v=DMARC1;p=none;pct=100;rua=…` | e-posta raporu |

**En büyük risk e-posta.** Nameserver Cloudflare'e alınırken MX, `mail`,
`smtp`, `imap`, SPF ve DMARC kayıtları birebir taşınmazsa `@zenginsocks.com`
adreslerine gelen postalar durur. Cloudflare ekleme sırasında tarayıp çoğunu
kendisi getirir; **yukarıdaki tabloyla tek tek karşılaştırın.**

> Not: e-posta bugün Ticimax/Nicegrup altyapısında. Ticimax aboneliği
> kapatılırsa DNS doğru olsa bile posta kutuları gider; o durumda ayrı bir
> e-posta sağlayıcısı (Google Workspace, Yandex360, Zoho…) gerekir.

### Neden Cloudflare

Railway custom domain için CNAME hedefi veriyor. Kök alan adına
(`zenginsocks.com`, www'suz) CNAME yazılamaz; DNS sağlayıcısının CNAME
flattening desteklemesi lazım. GoDaddy'nin kendi DNS'i desteklemiyor,
Cloudflare ücretsiz destekliyor. Ayrıca `cdn.zenginsocks.com` (R2) ve
Resend kayıtları da aynı yerden yönetilir.

Alan adı GoDaddy'de **kayıtlı kalır**, sadece DNS yönetimi değişir.

### Sıra — bu sırayı bozmayın

**Aşama 0 · Railway (kesinti yok, önce bu)**
1. Railway → servis → **Settings → Networking → Custom Domain**
   → `zenginsocks.com` ve `www.zenginsocks.com` ekleyin
2. Railway size bir CNAME hedefi verir (`….up.railway.app`) — not edin
3. Değişkeni güncelleyin: `NEXT_PUBLIC_SITE_URL=https://zenginsocks.com`

**Aşama 1 · Cloudflare'a ekle (kesinti yok, DNS hâlâ Nicegrup'ta)**

4. Cloudflare → **Add a site** → `zenginsocks.com` → **Free**
5. Taranan kayıtları yukarıdaki tabloyla karşılaştırın, eksikleri elle ekleyin
6. MX ve `mail`/`smtp`/`imap` kayıtları **Proxy KAPALI (gri bulut)** olmalı —
   proxy'li posta kaydı çalışmaz
7. Kök ve `www` kayıtlarını **şimdilik eski IP'de bırakın** (`A 104.16.109.26`,
   Proxy kapalı); böylece nameserver değişince site kesintiye uğramaz

**Aşama 2 · Nameserver değişimi (yayılma başlar)**

8. GoDaddy → Domain → **Nameservers → Change → I'll use my own**
   → Cloudflare'in verdiği ikisi
   - Alan adında `clientUpdateProhibited` kilidi var; GoDaddy arayüzü genelde
     kendisi kaldırır. Sormazsa **Domain Settings → Domain lock**'u kapatın,
     NS'i değiştirin, sonra tekrar açın
9. Yayılma 15 dk – 2 saat (nadiren 24 saat). Cloudflare "Active" diyene kadar
   bekleyin

**Railway'in istediği kayıtlar** (2026-08-09'da alındı, port 8080):

| Tip | Ad | Değer |
|---|---|---|
| CNAME | `@` | `81ke9vm2.up.railway.app` |
| TXT | `_railway-verify` | `railway-verify=772b2321fcf0d47a0f60d632dc…` |
| CNAME | `www` | `oh6mete6.up.railway.app` |
| TXT | `_railway-verify.www` | `railway-verify=3c13393eea6d59f8e8f26592b8…` |

> TXT değerleri burada kısaltılmış. **Railway arayüzündeki kopyala düğmesiyle
> tam değeri alın**, elle yazmayın — tek karakter hatası doğrulamayı bozar.

**Aşama 3 · Railway'e yönlendir (asıl geçiş anı)**

> ⚠️ **Kesinti burada oluyor.** DNS Railway'e döndüğü an ile Railway'in
> sertifikayı ürettiği an arasında site HTTPS vermez; tarayıcı sertifika
> hatası gösterir, `curl` 60 döner. 2026-08-09 geçişinde bu **~25 dakika**
> sürdü. Müşteri trafiğinin düşük olduğu bir saatte yapın.

10. İki `_railway-verify` TXT kaydını Cloudflare'e **hemen** ekleyin; trafiği
    etkilemez, doğrulamayı hızlandırır
11. Cloudflare DNS'te kök `A 104.16.109.26` kaydını **silin**, yerine
    yukarıdaki iki CNAME'i yazın — **Proxy KAPALI (gri bulut)** başlayın.
    Cloudflare kök CNAME'i zaten düzleştirir (CNAME flattening), gri bulutta
    da apex çalışır
12. Railway'de iki alan adı da **Active / sertifika verildi** olana kadar
    bekleyin. Proxy kapalıyken Railway sertifikayı sorunsuz alır
13. *(İsteğe bağlı, sonra)* Proxy'yi turuncuya çevirecekseniz **önce**
    Cloudflare → SSL/TLS → **Full (strict)** yapın. "Flexible" kalırsa sonsuz
    yönlendirme döngüsü olur

**Aşama 4 · Doğrulama**

```bash
dig +short NS zenginsocks.com            # cloudflare.com olmalı
dig +short MX zenginsocks.com            # ticimax protection — DEĞİŞMEMELİ
curl -sI https://zenginsocks.com | head -1        # 200
curl -s https://zenginsocks.com/yeni-urunler -o /dev/null -w '%{http_code}\n'
```
Bir de kendinize `info@zenginsocks.com`'dan ve o adrese mail atıp
**e-postanın iki yönde de çalıştığını** doğrulayın.

### Sonrasında

- SPF tek kayıt olmalı. Resend eklenince ikinci bir SPF TXT açmayın, birleştirin:
  `v=spf1 include:_spf.nicegrup.com include:_spf.resend.com -all`
- `cdn.zenginsocks.com` → R2 bağlanabilir (bkz. bu dosyada R2 bölümü ve
  DURUM.md'deki `UPDATE "ProductImage"` sorgusu)
- Aşağıdaki **yayın öncesi kontrol listesini** bitirin (Postgres public
  access, AUTH_SECRET, yönetici parolası)

---

## 7. E-posta — Resend  *(Faz 4'te gerekecek)*

**Kod tarafı hazır.** `src/lib/email.ts` yazıldı ve sipariş akışına bağlandı;
anahtar girildiği an çalışmaya başlar. Anahtar yokken gönderim sessizce
atlanır, sipariş normal şekilde oluşur.

1. [resend.com](https://resend.com) → hesap açın → **Domains → Add Domain**
   → `zenginsocks.com`
2. Verdiği SPF/DKIM/DMARC kayıtlarını Cloudflare DNS'e ekleyin.
   **Dikkat:** alan adında zaten bir SPF kaydı var
   (`v=spf1 include:_spf.nicegrup.com -all`). İkinci bir SPF TXT açmayın,
   tek kayıtta birleştirin:
   `v=spf1 include:_spf.nicegrup.com include:_spf.resend.com -all`
3. **API Keys → Create** → değeri `RESEND_API_KEY` olarak Railway'e girin
4. `MAIL_FROM` değişkenini doğrulanmış alan adıyla girin, ör.
   `Zengin Socks <siparis@zenginsocks.com>`
5. Alıcıları Panel → Ayarlar → bildirim alıcıları alanından yönetin
   (`ORDER_NOTIFICATION_EMAILS` değişkeni sadece o boşsa devreye girer)

Anahtar girildikten sonra bir test siparişi verip iki e-postanın da
ulaştığını doğrulayın: mağazaya "Yeni sipariş", müşteriye "Siparişiniz
alındı".

**Neden alan adı doğrulaması şart:** Doğrulanmamış alan adından gönderilen
sipariş bildirimleri spam klasörüne düşer ve siparişi kaçırırsınız.

---

## Paneli telefona uygulama olarak kurma

Panel PWA olarak kurulabilir; ayrı bir uygulama indirmeye gerek yok.

**iPhone / iPad (Safari)**

1. Safari'de `https://zenginsocks.com/panel` adresini açın ve giriş yapın
2. Alttaki **Paylaş** düğmesi (kare + yukarı ok)
3. **Ana Ekrana Ekle**
4. Ad "Zengin Panel" gelir, **Ekle**

**Android (Chrome)** — aynı adreste ⋮ menüsü → **Uygulamayı yükle**.

Bilinmesi gerekenler:

- **Safari'de kullanmak şart.** Chrome veya başka bir tarayıcının iOS
  sürümünden "Ana Ekrana Ekle" yapılırsa uygulama gibi açılmaz.
- **Bir kez daha giriş yapmanız gerekebilir.** iOS'ta ana ekran uygulaması
  Safari'den ayrı bir çerez alanı kullanıyor. Oturum 30 gün açık kalıyor.
- Simge koyu zeminli beyaz "Z" — vitrinin beyaz zeminli simgesinden ayrılsın
  diye. Vitrini de kurarsanız ikisini karıştırmazsınız.
- Uygulama içinden "Siteyi gör" bağlantısına basarsanız vitrin Safari'de
  açılır; manifest'in kapsamı `/panel` ile sınırlı, bu bilinçli.

---

## Yerel geliştirme

`.env.example` dosyasını `.env` olarak kopyalayıp doldurun:

```bash
cp .env.example .env
```

En az şunlar dolu olmalı: `DATABASE_URL`, `AUTH_SECRET`,
`SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`.

Sonra:

```bash
npm install
npm run db:deploy
npm run db:seed
npm run dev
```

Panel: http://localhost:3000/panel

> R2 değerleri boşsa görseller `public/uploads` klasörüne yazılır — R2 hesabı
> olmadan da geliştirme yapılabilir.

---

## ⚠️ Yayın öncesi kontrol listesi

Bunlar geliştirme sırasında bilinçli olarak gevşek bırakıldı. **Site yayına
çıkmadan önce** tek tek kapatılmalı:

- [ ] **Postgres Public Access'i kapat**
      (Postgres → Settings → Networking → Public Access → kaldır)
      Geliştirme sırasında dışarıdan bağlanmak için açıldı. Site Railway'de
      çalışmaya başlayınca özel ağ yeterli; açık kalırsa müşteri ad, telefon ve
      adres bilgileri internete bakan bir uçta durur.
- [ ] **Postgres parolasını yenile** — geliştirme sırasında paylaşıldıysa
- [ ] `AUTH_SECRET` üretimde ayrı ve güçlü olsun
- [ ] İlk yönetici parolasını değiştir (`SEED_ADMIN_PASSWORD` ile kurulan)
- [ ] Railway Postgres **yedeklemesi açık** mı kontrol et
- [ ] Günlük `pg_dump` → R2 yedek görevi kurulu mu
- [ ] `NEXT_PUBLIC_SITE_URL` gerçek alan adını gösteriyor mu
- [ ] Resend alan adı doğrulaması tamam mı (yoksa sipariş mailleri spam'e düşer)
- [ ] Google Search Console'a site ve sitemap eklendi mi

---

## Özet — sizden beklenenler

| # | Adım | Ne zaman | Bana ileteceğiniz |
|---|---|---|---|
| 1 | Railway + Postgres | **şimdi** | `DATABASE_PUBLIC_URL` |
| 2 | GitHub deposu | şimdi | depo adresi |
| 3 | Railway uygulama servisi | 2'den sonra | — |
| 4 | `AUTH_SECRET` üret | şimdi | değeri (veya siz girin) |
| 5 | Cloudflare R2 | Faz 2'den önce | 4 değer |
| 6 | DNS → Cloudflare | yayından önce | — |
| 7 | Resend | Faz 4 | API anahtarı |
| — | Ticimax web servisi / Excel | Faz 2 | anahtar veya dosya |
