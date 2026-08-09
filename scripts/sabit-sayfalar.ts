/**
 * Footer'daki üç sabit sayfayı oluşturur: hakkımızda, iletişim, KVKK.
 *
 * Var olan sayfaya DOKUNMAZ — paneldeki düzenlemeleriniz korunur. Baştan
 * yazdırmak isterseniz `--degistir` verin.
 *
 * İletişim sayfası telefon/adres/WhatsApp bilgilerini Ayarlar'dan okur;
 * önce Panel → Ayarlar'ı doldurmak daha iyi sonuç verir.
 *
 *   npx tsx --env-file=.env scripts/sabit-sayfalar.ts [--degistir]
 */
import { prisma } from "@/lib/prisma";

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const HAKKIMIZDA = `
<p>Zengin Socks, çorap üretimi ve <strong>toptan satışı</strong> yapan bir
markadır. Kadın, erkek, çocuk ve bebe gruplarında soket, patik, penye,
havlu ve bambu çorap üretiyoruz.</p>

<h2>Nasıl çalışıyoruz</h2>
<ul>
  <li>Tüm ürünlerimiz <strong>düzine</strong> birimiyle satılır; sitedeki
      fiyatlar bir düzinenin fiyatıdır.</li>
  <li>Fiyatlar KDV hariç gösterilir, KDV dahil tutar hemen altında yazar.</li>
  <li>Site üzerinden <strong>ödeme alınmaz</strong>. Siparişinizi buradan
      iletirsiniz, ödemeyi mağazamızda yaparsınız.</li>
  <li>Toptan alım yapan firmalar <a href="/bayi-basvurusu">bayi hesabı</a>
      açarak sipariş geçmişini takip edebilir.</li>
</ul>

<h2>Ürün gruplarımız</h2>
<p>Kadın çorapları, erkek çorapları, çocuk çorapları ve bebe çorapları olmak
üzere dört ana grupta üretim yapıyoruz. Tüm kataloğu
<a href="/">ana sayfadan</a> inceleyebilirsiniz.</p>

<!-- Bu metin bir başlangıç taslağıdır. Kuruluş yılı, üretim kapasitesi,
     tesis bilgileri gibi ayrıntıları Panel → Sayfalar'dan ekleyin. -->
`.trim();

const KVKK = `
<p>6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") uyarınca, kişisel
verilerinizin veri sorumlusu sıfatıyla işlenmesine ilişkin olarak sizi
bilgilendirmek isteriz.</p>

<h2>Veri sorumlusu</h2>
<p><strong>[Şirketin tam ticaret unvanı]</strong><br />
Adres: [Şirket adresi]<br />
Vergi dairesi / numarası: [Vergi dairesi] / [VKN]<br />
E-posta: [iletişim e-posta adresi]</p>

<h2>İşlenen kişisel verileriniz</h2>
<ul>
  <li><strong>Kimlik ve iletişim bilgileri:</strong> ad soyad, telefon
      numarası, e-posta adresi, teslimat ve fatura adresi.</li>
  <li><strong>Bayi başvurusu bilgileri:</strong> firma unvanı, vergi dairesi
      ve vergi numarası, yetkili kişi bilgileri.</li>
  <li><strong>Sipariş bilgileri:</strong> sipariş içeriği, tutarı, tarihi ve
      sipariş durumu geçmişi.</li>
  <li><strong>İşlem güvenliği bilgileri:</strong> oturum çerezleri.</li>
</ul>

<h2>İşleme amaçları</h2>
<ul>
  <li>Siparişinizin alınması, hazırlanması ve teslim edilmesi</li>
  <li>Bayi başvurunuzun değerlendirilmesi ve bayilik ilişkisinin yürütülmesi</li>
  <li>Müşteriye özel iskonto tanımlanması ve uygulanması</li>
  <li>Faturalandırma ve yasal saklama yükümlülüklerinin yerine getirilmesi</li>
  <li>Talep ve şikâyetlerinizin karşılanması</li>
</ul>

<h2>Hukuki sebep</h2>
<p>Kişisel verileriniz; sözleşmenin kurulması ve ifası (KVKK m. 5/2-c), hukuki
yükümlülüğün yerine getirilmesi (m. 5/2-ç) ve veri sorumlusunun meşru menfaati
(m. 5/2-f) hukuki sebeplerine dayanılarak, otomatik ve otomatik olmayan
yollarla işlenmektedir.</p>

<h2>Aktarım</h2>
<p>Kişisel verileriniz; kargo ve lojistik hizmet sağlayıcılarına, muhasebe ve
mali müşavirlik hizmeti alınan kuruluşlara, barındırma (hosting) hizmet
sağlayıcımıza ve yasal olarak yetkili kamu kurum ve kuruluşlarına, yalnızca
yukarıdaki amaçlarla sınırlı olarak aktarılabilir.</p>

<h2>Saklama süresi</h2>
<p>Verileriniz, ilgili mevzuatta öngörülen saklama süreleri (ticari defter ve
belgeler için 10 yıl, vergi mevzuatı için 5 yıl) boyunca saklanır; sürenin
dolmasının ardından silinir, yok edilir veya anonim hale getirilir.</p>

<h2>Haklarınız</h2>
<p>KVKK'nın 11. maddesi uyarınca; kişisel verilerinizin işlenip işlenmediğini
öğrenme, işlenmişse buna ilişkin bilgi talep etme, işlenme amacını ve amacına
uygun kullanılıp kullanılmadığını öğrenme, yurt içinde veya yurt dışında
aktarıldığı üçüncü kişileri bilme, eksik veya yanlış işlenmişse düzeltilmesini
isteme, silinmesini veya yok edilmesini isteme, bu işlemlerin aktarıldığı
üçüncü kişilere bildirilmesini isteme, münhasıran otomatik sistemlerle
analiz edilmesi suretiyle aleyhinize bir sonucun ortaya çıkmasına itiraz etme
ve kanuna aykırı işleme sebebiyle zarara uğramanız hâlinde zararın
giderilmesini talep etme haklarına sahipsiniz.</p>

<h2>Başvuru</h2>
<p>Taleplerinizi yukarıda belirtilen adrese yazılı olarak veya
[iletişim e-posta adresi] adresine iletebilirsiniz. Başvurunuz en geç otuz gün
içinde sonuçlandırılır.</p>

<!-- ÖNEMLİ: Bu metin bir taslaktır. Köşeli parantez içindeki alanları
     doldurun ve yayına almadan önce mali müşavirinize veya avukatınıza
     kontrol ettirin. -->
`.trim();

function iletisimHtml(settings: Record<string, string>): string {
  const phone = settings.contactPhone?.trim();
  const address = settings.contactAddress?.trim();
  const whatsapp = settings.whatsappNumber?.replace(/\D/g, "");

  const rows: string[] = [];
  if (phone) rows.push(`<li><strong>Telefon:</strong> ${esc(phone)}</li>`);
  if (whatsapp) {
    rows.push(
      `<li><strong>WhatsApp:</strong> <a href="https://wa.me/${whatsapp}">Mesaj gönderin</a></li>`,
    );
  }
  if (address) rows.push(`<li><strong>Adres:</strong> ${esc(address)}</li>`);

  const contact =
    rows.length > 0
      ? `<ul>\n  ${rows.join("\n  ")}\n</ul>`
      : `<p>İletişim bilgileri Panel → Ayarlar'dan doldurulduğunda burada
görünecektir.</p>`;

  return `
<p>Sipariş, bayilik ve ürünlerimizle ilgili her konuda bize ulaşabilirsiniz.</p>

${contact}

<h2>Sipariş nasıl veriliyor</h2>
<p>Ürünleri sepete ekleyip sipariş formunu doldurmanız yeterli. Siparişiniz
bize ulaştığında sizinle iletişime geçiyoruz. <strong>Site üzerinden ödeme
alınmaz</strong>, ödeme mağazamızda yapılır.</p>

<h2>Bayilik</h2>
<p>Toptan alım yapan firmalar için bayi hesabı açıyoruz.
<a href="/bayi-basvurusu">Bayi başvuru formunu</a> doldurduğunuzda
başvurunuz değerlendirilir.</p>
`.trim();
}

async function main() {
  const overwrite = process.argv.includes("--degistir");

  const settingRows = await prisma.setting.findMany();
  const settings = Object.fromEntries(
    settingRows.map((row) => [row.key, row.value]),
  ) as Record<string, string>;

  const pages = [
    {
      slug: "hakkimizda",
      title: "Hakkımızda",
      contentHtml: HAKKIMIZDA,
      metaDescription:
        "Zengin Socks — kadın, erkek, çocuk ve bebe çoraplarında toptan üretim ve satış.",
    },
    {
      slug: "iletisim",
      title: "İletişim",
      contentHtml: iletisimHtml(settings),
      metaDescription:
        "Zengin Socks iletişim bilgileri, sipariş ve bayilik için bize ulaşın.",
    },
    {
      slug: "kvkk",
      title: "KVKK Aydınlatma Metni",
      contentHtml: KVKK,
      metaDescription:
        "6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında aydınlatma metni.",
    },
  ];

  for (const page of pages) {
    const existing = await prisma.page.findUnique({
      where: { slug: page.slug },
      select: { id: true },
    });

    if (existing && !overwrite) {
      console.log(`  atlandı   /sayfa/${page.slug}  (zaten var)`);
      continue;
    }

    if (existing) {
      await prisma.page.update({ where: { id: existing.id }, data: page });
      console.log(`  güncellendi /sayfa/${page.slug}`);
    } else {
      await prisma.page.create({ data: { ...page, isActive: true } });
      console.log(`  oluşturuldu /sayfa/${page.slug}`);
    }
  }

  console.log(
    "\nKVKK metnindeki [köşeli parantezli] alanları Panel → Sayfalar'dan doldurun.",
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
