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

## 6. Alan adı — GoDaddy'den Cloudflare DNS'e

**Neden gerekiyor:** Railway custom domain için CNAME hedefi veriyor. Kök alan
adına (`zenginsocks.com`, www'suz) CNAME yazılamaz; bunun için DNS sağlayıcısının
CNAME flattening desteklemesi lazım ve GoDaddy desteklemiyor.

Alan adı GoDaddy'de **kayıtlı kalır**, sadece DNS yönetimi Cloudflare'e geçer.
Ücretsiz.

1. Cloudflare → **Add a site** → `zenginsocks.com` → **Free** planı
2. Cloudflare size iki nameserver verir (`xxx.ns.cloudflare.com`)
3. GoDaddy → Domain → **DNS → Nameservers → Change → Enter my own**
   → Cloudflare'in verdiği ikisini yazın
4. Yayılması 15 dk – 2 saat sürer

Sonra Railway'de:
- **Settings → Networking → Custom Domain** → `zenginsocks.com` ve `www.zenginsocks.com`
- Railway'in verdiği CNAME hedefini Cloudflare DNS'e ekleyin (Proxy: açık)

> Bu adım yayına almadan önce yapılsa yeter. Geliştirme boyunca Railway'in
> geçici adresi kullanılabilir.

---

## 7. E-posta — Resend  *(Faz 4'te gerekecek)*

1. [resend.com](https://resend.com) → hesap açın → **Domains → Add Domain**
   → `zenginsocks.com`
2. Verdiği SPF/DKIM/DMARC kayıtlarını Cloudflare DNS'e ekleyin
3. **API Keys → Create** → değeri `RESEND_API_KEY` olarak Railway'e girin

**Neden alan adı doğrulaması şart:** Doğrulanmamış alan adından gönderilen
sipariş bildirimleri spam klasörüne düşer ve siparişi kaçırırsınız.

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
