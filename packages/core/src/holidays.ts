// Türkiye resmi tatilleri. Dini bayram tarihleri yıllık değişir; yeni yıllar Diyanet'in "Dini Günler" listesinden eklenmeli.
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
  // 2028: Diyanet "2028 Dini Günler Listesi" (vakithesaplama.diyanet.gov.tr/icerik.php?icerik=185)
  "2028-02-26": "Ramazan Bayramı 1. gün", "2028-02-27": "Ramazan Bayramı 2. gün", "2028-02-28": "Ramazan Bayramı 3. gün",
  "2028-05-05": "Kurban Bayramı 1. gün", "2028-05-06": "Kurban Bayramı 2. gün", "2028-05-07": "Kurban Bayramı 3. gün", "2028-05-08": "Kurban Bayramı 4. gün",
};

/** Dini bayram tarihleri girilmiş yıllar (yeni yıl eklenmesi gerektiğini testler hatırlatır). */
export const religiousYears = () => [...new Set(Object.keys(RELIGIOUS).map((d) => Number(d.slice(0, 4))))];

/** "YYYY-MM-DD" için tatil adı, yoksa null. */
export function holidayName(date: string): string | null {
  const fixed = FIXED.find(([md]) => date.slice(5) === md);
  return fixed?.[1] ?? RELIGIOUS[date] ?? null;
}

/** Arife yarım gün resmi tatildir: bu saatten sonrası tatil sayılır (2429 sayılı Kanun). */
export const AREFE_START = "13:00";

/** "YYYY-MM-DD" bir gün öncesi (yerel saat dilimine bağlı olmadan). */
function prevDay(date: string) {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}
const AREFE: Record<string, string> = Object.fromEntries(
  Object.entries(RELIGIOUS).filter(([, n]) => n.endsWith("1. gün")).map(([d, n]) => [prevDay(d), `${n.replace(" 1. gün", "")} arifesi`]),
);

/** Arife (yarım gün tatil) ise adı: 28 Ekim ve Ramazan/Kurban bayramı arifeleri; değilse null. */
export function arefeName(date: string): string | null {
  if (date.slice(5) === "10-28") return "Cumhuriyet Bayramı arifesi";
  return AREFE[date] ?? null;
}
