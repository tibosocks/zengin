// Aktarımın ara veri modeli.
//
// Kaynak ne olursa olsun (Ticimax Excel'i, web servisi, elle doldurulmuş
// şablon) önce bu şekle çevriliyor. Böylece doğrulama ve veritabanına yazma
// mantığı kaynaktan bağımsız kalıyor; yeni bir kaynak eklemek sadece yeni
// bir okuyucu yazmak demek.

export interface ParsedOption {
  /** "Beden" | "Renk" */
  type: string;
  /** "36-40" | "Siyah" */
  value: string;
}

export interface CatalogRow {
  /** Excel'deki satır numarası (1 tabanlı, başlık dahil) — hata mesajları için */
  rowNumber: number;

  externalId?: string;
  productName: string;
  slug?: string;
  shortDesc?: string;
  description?: string;
  /** "Kadın Çorapları > Kadın Patik Çorap" */
  categoryPath?: string;
  isActive: boolean;

  options: ParsedOption[];
  sku?: string;
  barcode?: string;

  /** KDV hariç, kuruş */
  priceKurus: number;
  /** Baz puan: %10 -> 1000 */
  vatRateBp: number;
  stock: number;

  imageUrls: string[];
}

export type IssueLevel = "hata" | "uyari";

export interface RowIssue {
  rowNumber: number;
  level: IssueLevel;
  /** Hangi sütun/alan — kullanıcının neyi düzelteceğini bilmesi için */
  field?: string;
  message: string;
}

export interface ParseResult {
  rows: CatalogRow[];
  issues: RowIssue[];
  unknownColumns: string[];
  /** Kaç satır hata yüzünden atlandı */
  skipped: number;
}

/** Aynı ürüne ait satırlar tek üründe toplanır; her satır bir varyant olur. */
export interface GroupedProduct {
  key: string;
  externalId?: string;
  name: string;
  slug?: string;
  shortDesc?: string;
  description?: string;
  categoryPath?: string;
  isActive: boolean;
  imageUrls: string[];
  variants: CatalogRow[];
}

export interface ImportPlan {
  products: GroupedProduct[];
  /** Aktarımda yeni açılacak kategoriler */
  newCategories: string[];
  /** Yeni açılacak seçenek değerleri: "Beden: 36-40" */
  newOptionValues: string[];
  counts: {
    productsToCreate: number;
    productsToUpdate: number;
    variantsToCreate: number;
    variantsToUpdate: number;
    imagesToDownload: number;
  };
}
