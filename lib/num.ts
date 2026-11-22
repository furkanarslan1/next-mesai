/**
 * Kullanıcının yazdığı sayıyı Türkçe alışkanlıklarıyla okur:
 * "2,5" → 2.5 · "2.5" → 2.5 · "45.000" → 45000 · "1.250,50" → 1250.5 · "1,250.50" → 1250.5
 * Tek nokta ve ardından tam 3 rakam (ör. "5.000") binlik ayırıcı sayılır; "0.125" gibi sıfırla başlayanlar ondalıktır.
 * Okunamazsa NaN döner.
 */
export function parseNum(input: string | number | null | undefined): number {
  if (typeof input === "number") return input;
  let s = String(input ?? "").trim().replace(/\s|₺|%/g, "");
  if (!s) return NaN;
  const lastDot = s.lastIndexOf(".");
  const lastComma = s.lastIndexOf(",");
  if (lastDot >= 0 && lastComma >= 0) {
    // İkisi birden varsa sonda olan ondalık ayırıcıdır, diğeri binlik
    s = lastComma > lastDot ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  } else if (lastComma >= 0) {
    s = (s.match(/,/g)?.length ?? 0) > 1 ? s.replace(/,/g, "") : s.replace(",", ".");
  } else if (lastDot >= 0) {
    if ((s.match(/\./g)?.length ?? 0) > 1 || /^-?[1-9]\d{0,2}\.\d{3}$/.test(s)) s = s.replace(/\./g, "");
  }
  if (!/^-?\d*\.?\d+$|^-?\d+\.$/.test(s)) return NaN;
  return Number(s);
}

/** Pozitif sayı ya da 0 (boş/geçersiz girişte 0). */
export const parsePositive = (input: string | null | undefined) => {
  const n = parseNum(input);
  return Number.isFinite(n) && n > 0 ? n : 0;
};
