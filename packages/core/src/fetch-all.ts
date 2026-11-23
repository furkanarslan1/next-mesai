/**
 * Supabase tek istekte en çok 1000 satır döner ve fazlasını sessizce keser. Büyük listeleri (yedek, ekip
 * raporu, çok aylık aralıklar) kesilmeden okumak için sayfa sayfa çeker. Hata olursa `null` döner.
 * `build` verilen aralık için (from, to dahil) sorguyu kurar; sıralama kararlı olmalı (son sıralama id).
 */
export const PAGE = 1000;

export async function fetchAll<T>(
  build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
): Promise<T[] | null> {
  const out: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await build(from, from + PAGE - 1);
    if (error || !data) return null;
    out.push(...data);
    if (data.length < PAGE) return out;
  }
}

/** "2026-03" ... "2026-06" gibi anahtarların kapsadığı ardışık aylar (en eskiden en yeniye). */
export function monthSpan(keys: string[]): string[] {
  const sorted = [...keys].sort();
  const [y0, m0] = sorted[0].split("-").map(Number);
  const [y1, m1] = sorted[sorted.length - 1].split("-").map(Number);
  const out: string[] = [];
  for (let y = y0, m = m0; y < y1 || (y === y1 && m <= m1); m === 12 ? (y++, (m = 1)) : m++) out.push(`${y}-${String(m).padStart(2, "0")}`);
  return out;
}
