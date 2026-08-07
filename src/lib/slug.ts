// Türkçe karakterleri doğru çeviren slug üreteci.
//
// Neden hazır kütüphane değil: çoğu paket "ı" harfini boşa düşürüyor veya
// büyük "İ" ile küçük "i" ayrımını Türkçe kurallarına göre yapmıyor.
// "Kız Çocuk Çorabı" -> "kiz-cocuk-corabi" olmalı, "kz-cocuk-corab" değil.

const TR_MAP: Record<string, string> = {
  ç: "c",
  Ç: "c",
  ğ: "g",
  Ğ: "g",
  ı: "i",
  I: "i",
  İ: "i",
  i: "i",
  ö: "o",
  Ö: "o",
  ş: "s",
  Ş: "s",
  ü: "u",
  Ü: "u",
};

export function slugify(input: string): string {
  const replaced = Array.from(input)
    .map((char) => TR_MAP[char] ?? char)
    .join("");

  return replaced
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // kalan aksanları at
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

/**
 * Slug'ı benzersiz hale getirir. `exists` verilen slug'ın kullanımda olup
 * olmadığını söyler; çakışma varsa sona -2, -3 ... eklenir.
 */
export async function uniqueSlug(
  base: string,
  exists: (slug: string) => Promise<boolean>,
): Promise<string> {
  const root = slugify(base) || "urun";

  if (!(await exists(root))) return root;

  for (let suffix = 2; suffix < 500; suffix += 1) {
    const candidate = `${root}-${suffix}`;
    if (!(await exists(candidate))) return candidate;
  }

  // Buraya düşmek pratikte imkansız; yine de sessizce çakışmaktansa
  // zaman damgası ekleyip devam etmek daha iyi.
  return `${root}-${Date.now()}`;
}
