// Türkiye resmi tatilleri. Dini bayram tarihleri yıllık değişir; yeni yıllar eklenmeli.
const FIXED: [string, string][] = [
  ["01-01", "Yılbaşı"], ["04-23", "Ulusal Egemenlik ve Çocuk Bayramı"], ["05-01", "Emek ve Dayanışma Günü"],
  ["05-19", "Atatürk'ü Anma, Gençlik ve Spor Bayramı"], ["07-15", "Demokrasi ve Milli Birlik Günü"],
  ["08-30", "Zafer Bayramı"], ["10-29", "Cumhuriyet Bayramı"],
];
const RELIGIOUS: Record<string, string> = {
  "2026-03-20": "Ramazan Bayramı 1. gün", "2026-03-21": "Ramazan Bayramı 2. gün", "2026-03-22": "Ramazan Bayramı 3. gün",
  "2026-05-27": "Kurban Bayramı 1. gün", "2026-05-28": "Kurban Bayramı 2. gün", "2026-05-29": "Kurban Bayramı 3. gün", "2026-05-30": "Kurban Bayramı 4. gün",
  "2027-03-09": "Ramazan Bayramı 1. gün", "2027-03-10": "Ramazan Bayramı 2. gün", "2027-03-11": "Ramazan Bayramı 3. gün",
  "2027-05-16": "Kurban Bayramı 1. gün", "2027-05-17": "Kurban Bayramı 2. gün", "2027-05-18": "Kurban Bayramı 3. gün", "2027-05-19": "Kurban Bayramı 4. gün",
};

/** "YYYY-MM-DD" için tatil adı, yoksa null. */
export function holidayName(date: string): string | null {
  const fixed = FIXED.find(([md]) => date.slice(5) === md);
  return fixed?.[1] ?? RELIGIOUS[date] ?? null;
}
