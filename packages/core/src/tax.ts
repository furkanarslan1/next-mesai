/**
 * Brüt ↔ net ücret (Türkiye, bordro mantığı). Yıl yıl parametre gerekir; yeni yıl gelince TAX'a eklenmeli
 * (test, bu yıl tanımlı değilse kırmızı olur).
 *
 * Aylık hesap:
 *  - SGK işçi payı %14 ve işsizlik %1, prime esas kazanç tavanına kadar
 *  - Gelir vergisi matrahı = brüt − SGK − işsizlik; vergi yıl başından KÜMÜLATİF matraha göre dilimlerden
 *    (yıl içinde dilim atladıkça net düşer)
 *  - Asgari ücret istisnası: asgari ücretin aynı aya kadarki kümülatif matrahına düşen vergi ve asgari ücretin
 *    damga vergisi düşülür
 *  - Damga vergisi %0,759
 */
export interface TaxYear {
  minWageGross: number;
  /** Prime esas kazanç üst sınırı (aylık) */
  sgkCeiling: number;
  /** Ücret gelirleri tarifesi: [üst sınır, oran]; son dilim Infinity */
  brackets: [number, number][];
}

/** 2026: brüt asgari ücret 33.030 TL, SGK tavanı 297.270 TL (asgari ücretin 9 katı), ücret tarifesi 190 bin / 400 bin / 1,5 milyon / 5,3 milyon */
export const TAX: Record<number, TaxYear> = {
  2026: {
    minWageGross: 33030,
    sgkCeiling: 297270,
    brackets: [[190000, 0.15], [400000, 0.2], [1500000, 0.27], [5300000, 0.35], [Infinity, 0.4]],
  },
};
const SGK = 0.14, UNEMPLOYMENT = 0.01, STAMP = 0.00759;

export const taxYears = () => Object.keys(TAX).map(Number).sort();
/** İstenen yıl yoksa en yakın (en son) tanımlı yıl */
export const taxYearFor = (year: number) => (TAX[year] ? year : taxYears().filter((y) => y <= year).pop() ?? taxYears()[0]);

/** Kümülatif matrah için toplam gelir vergisi */
export function incomeTax(base: number, brackets: TaxYear["brackets"]): number {
  let tax = 0, lower = 0;
  for (const [upper, rate] of brackets) {
    if (base <= lower) break;
    tax += (Math.min(base, upper) - lower) * rate;
    lower = upper;
  }
  return tax;
}

export interface NetMonth {
  month: number; gross: number; sgk: number; unemployment: number; incomeTax: number; stampTax: number; net: number;
  /** Bu aydaki gelir vergisi dilimi (oran) */
  rate: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Her ay aynı brüt alınırsa yılın 12 ayının neti (ocak → aralık). */
export function grossToNetYear(gross: number, year: number): NetMonth[] {
  const p = TAX[taxYearFor(year)];
  const insured = Math.min(gross, p.sgkCeiling);
  const sgk = insured * SGK, unemployment = insured * UNEMPLOYMENT;
  const base = Math.max(0, gross - sgk - unemployment);
  const minInsured = Math.min(p.minWageGross, p.sgkCeiling);
  const minBase = p.minWageGross - minInsured * (SGK + UNEMPLOYMENT);
  return Array.from({ length: 12 }, (_, i) => {
    const m = i + 1;
    const tax = incomeTax(base * m, p.brackets) - incomeTax(base * (m - 1), p.brackets);
    const exempt = incomeTax(minBase * m, p.brackets) - incomeTax(minBase * (m - 1), p.brackets);
    const gv = Math.max(0, tax - exempt);
    const dv = Math.max(0, (gross - p.minWageGross) * STAMP);
    const rate = p.brackets.find(([upper]) => base * m <= upper)?.[1] ?? p.brackets[p.brackets.length - 1][1];
    return {
      month: m, gross, sgk: round2(sgk), unemployment: round2(unemployment), incomeTax: round2(gv), stampTax: round2(dv),
      net: round2(gross - sgk - unemployment - gv - dv), rate,
    };
  });
}

/** Belirli bir ayın neti */
export const grossToNet = (gross: number, year: number, month: number) => grossToNetYear(gross, year)[month - 1];

/** O ay verilen neti veren brüt (ikili arama, kuruş hassasiyetinde). */
export function netToGross(net: number, year: number, month: number): number {
  if (net <= 0) return 0;
  let lo = net, hi = net * 2.5;
  while (grossToNet(hi, year, month).net < net) hi *= 2;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (grossToNet(mid, year, month).net < net) lo = mid; else hi = mid;
  }
  return round2(hi);
}
