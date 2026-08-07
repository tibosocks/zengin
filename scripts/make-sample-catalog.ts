// Aktarım hattını test etmek için örnek katalog dosyası üretir.
//
//   npx tsx scripts/make-sample-catalog.ts [cikti.xlsx]
//
// İçerik tibosocks.com ekran görüntülerindeki gerçek ürün adlarından.
// Sütun başlıkları bilerek "Ürün Adı" yerine "Urun Adi", "Fiyat" yerine
// "KDV Hariç Fiyat" gibi varyasyonlarla yazıldı ki başlık tanıma sınansın.
import writeXlsxFile from "write-excel-file/node";

const HEADERS = [
  "Ürün ID",
  "Urun Adi",
  "Kategori",
  "Beden",
  "Stok Kodu",
  "KDV Hariç Fiyat",
  "KDV Oranı",
  "Stok Adedi",
  "Durum",
  "Görsel 1",
  "Görsel 2",
];

type Row = [string, string, string, string, string, string, string, string, string, string, string];

const PRODUCTS: Array<{
  id: string;
  name: string;
  category: string;
  price: string;
  sizes: Array<[string, number]>;
}> = [
  {
    id: "TCX-1001",
    name: "Kadın Penye Patik Emojili",
    category: "Kadın Çorapları > Kadın Patik Çorap",
    price: "300,00",
    sizes: [["36-40", 48]],
  },
  {
    id: "TCX-1002",
    name: "Kadın Penye Kısa Konç Emoji",
    category: "Kadın Çorapları > Kadın Kısa Konç Çorap",
    price: "340,00",
    sizes: [["36-40", 24]],
  },
  {
    id: "TCX-1003",
    name: "Kadın Penye Soket Kabartma",
    category: "Kadın Çorapları > Kadın Soket Çorap",
    price: "380,00",
    sizes: [["36-40", 0]],
  },
  {
    id: "TCX-2001",
    name: "Erkek Penye Kısa Konç Çizgili",
    category: "Erkek Çorapları > Erkek Soket Çorap",
    price: "340,00",
    sizes: [
      ["41-44", 36],
      ["36-40", 12],
    ],
  },
  {
    id: "TCX-2002",
    name: "Erkek Penye Diyabetik Soket Asorti",
    category: "Erkek Çorapları > Erkek Diyabetik Çorap",
    price: "480,00",
    sizes: [["41-44", 18]],
  },
  {
    id: "TCX-2003",
    name: "Erkek Penye Çekçekli Patik Never",
    category: "Erkek Çorapları > Erkek Patik Çorap",
    price: "300,00",
    sizes: [["41-44", 60]],
  },
  {
    id: "TCX-3001",
    name: "Kız Çocuk Patik Kalpli Çorap",
    // Bu alt kategori sistemde yok — aktarımın kategori açması sınanıyor
    category: "Çocuk Çorapları > Kız Çocuk Çorapları > Kız Çocuk Patik",
    price: "180,00",
    sizes: [
      ["3-4 Yaş", 20],
      ["5-6 Yaş", 15],
      ["7-8 Yaş", 0],
    ],
  },
  {
    id: "TCX-4001",
    name: "Bebe Penye Havlu Çorap",
    category: "Bebe Çorapları > Kız Bebe Çorapları",
    price: "150,00",
    sizes: [
      ["0-6 Ay", 30],
      ["6-12 Ay", 25],
    ],
  },
];

async function main() {
  const output = process.argv[2] ?? "ornek-katalog.xlsx";

  const rows: Row[] = [];

  for (const product of PRODUCTS) {
    for (const [size, stock] of product.sizes) {
      rows.push([
        product.id,
        product.name,
        product.category,
        size,
        `${product.id}-${size.replace(/\s/g, "")}`,
        product.price,
        "10",
        String(stock),
        "Aktif",
        "",
        "",
      ]);
    }
  }

  // Bilerek bozuk satırlar: doğrulama raporunun bunları yakalaması gerekiyor
  rows.push(["TCX-9001", "", "Kadın Çorapları", "36-40", "BOS-AD", "200,00", "10", "5", "Aktif", "", ""]);
  rows.push(["TCX-9002", "Fiyatsız Ürün", "Kadın Çorapları", "36-40", "FIYATSIZ", "", "10", "5", "Aktif", "", ""]);
  rows.push(["TCX-9003", "Bozuk Stoklu Ürün", "Kadın Çorapları", "36-40", "BOZUKSTOK", "250,00", "10", "abc", "Aktif", "", ""]);

  const data = [
    HEADERS.map((value) => ({ value, fontWeight: "bold" as const })),
    ...rows.map((row) => row.map((value) => ({ value, type: String }))),
  ];

  await writeXlsxFile(data, { sheet: "Ürünler" }).toFile(output);
  console.log(`${output} yazıldı — ${rows.length} satır, ${PRODUCTS.length} ürün`);
  console.log("Bilerek bozuk 3 satır eklendi (boş ad, fiyatsız, bozuk stok).");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
