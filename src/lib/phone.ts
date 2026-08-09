// Telefon numarası normalleştirme.
//
// Ayrı dosyada: "use server" işaretli modüller sadece async fonksiyon
// export edebiliyor, saf yardımcı fonksiyon barındıramıyor.
//
// Numarayı 10 haneye indiriyoruz (5321112233). Müşteri kaydı telefondan
// tekilleştiği için "0532...", "+90 532...", "532 111 22 33" hepsinin aynı
// kayda düşmesi şart — yoksa aynı kişi için birden fazla müşteri oluşur.

export function normalizePhone(input: string): string | null {
  const digits = input.replace(/\D/g, "");

  const trimmed = digits.startsWith("90")
    ? digits.slice(2)
    : digits.startsWith("0")
      ? digits.slice(1)
      : digits;

  // Türkiye cep telefonu: 5 ile başlayan 10 hane
  return /^5\d{9}$/.test(trimmed) ? trimmed : null;
}

/** 5321112233 -> "0532 111 22 33" */
export function formatPhone(phone: string): string {
  if (!/^5\d{9}$/.test(phone)) return phone;
  return `0${phone.slice(0, 3)} ${phone.slice(3, 6)} ${phone.slice(6, 8)} ${phone.slice(8)}`;
}

/**
 * Yazarken biçimlendirme: "05478131903" -> "0547 813 19 03".
 *
 * `normalizePhone` tam numarayı doğrular; bu ise yarım girişte de çalışır,
 * form alanında her tuşta uygulanır. Sunucu tarafı zaten rakam dışını
 * atıyor, boşluklar gönderimi bozmuyor.
 */
export function formatPhoneInput(input: string): string {
  let digits = input.replace(/\D/g, "");

  if (digits.startsWith("90")) digits = digits.slice(2);
  if (digits !== "" && !digits.startsWith("0")) digits = `0${digits}`;
  digits = digits.slice(0, 11); // başındaki 0 + 10 hane

  return [
    digits.slice(0, 4),
    digits.slice(4, 7),
    digits.slice(7, 9),
    digits.slice(9, 11),
  ]
    .filter(Boolean)
    .join(" ");
}
