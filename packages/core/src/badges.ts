import { addDays } from "date-fns/addDays";
import { format } from "date-fns/format";
import { parseISO } from "date-fns/parseISO";
import { goalProgress } from "./calc";
import { monthStats } from "./reports";
import type { Entry, Settings } from "./types";

export type BadgeKey = "first" | "streak3" | "streak7" | "goal" | "steady" | "h50" | "h100";

export const BADGES: { key: BadgeKey; title: string; hint: string }[] = [
  { key: "first", title: "İlk adım", hint: "İlk mesai kaydını gir" },
  { key: "streak3", title: "3 gün seri", hint: "Üst üste 3 gün mesai" },
  { key: "streak7", title: "7 gün seri", hint: "Üst üste 7 gün mesai" },
  { key: "goal", title: "Hedefi tutturdun", hint: "Bir ayın hedefini tamamla" },
  { key: "steady", title: "Devamlı", hint: "Hiç devamsızlık yapmadan bir ay çalış" },
  { key: "h50", title: "50 saat", hint: "Toplam 50 saat mesai" },
  { key: "h100", title: "100 saat", hint: "Toplam 100 saat mesai" },
];

const isWork = (e: Entry) => (e.type === "overtime" || e.type === "holiday") && Number(e.hours) > 0;

/** Üst üste mesai yapılan gün serisi. `current` bugünden (ya da dünden) geriye sayılır, `best` yüklü kayıtlardaki en uzun seri. */
export function streaks(allEntries: Entry[], today: Date) {
  const days = new Set(allEntries.filter(isWork).map((e) => e.work_date));
  const sorted = [...days].sort();
  let best = 0, run = 0, prev: string | null = null;
  for (const d of sorted) {
    run = prev && format(addDays(parseISO(prev), 1), "yyyy-MM-dd") === d ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  // Bugün henüz girilmediyse seri dünden sayılır
  let cursor = days.has(format(today, "yyyy-MM-dd")) ? today : addDays(today, -1);
  let current = 0;
  while (days.has(format(cursor, "yyyy-MM-dd"))) { current++; cursor = addDays(cursor, -1); }
  return { current, best };
}

/** Kazanılan başarılar: yüklü aylardan ve toplam saatten hesaplanır, saklanmaz. */
export function earnedBadges(byMonth: Record<string, Entry[]>, s: Settings, totalHours: number, today: Date): Set<BadgeKey> {
  const all = Object.values(byMonth).flat();
  const got = new Set<BadgeKey>();
  if (all.some(isWork)) got.add("first");
  const st = streaks(all, today);
  if (st.best >= 3) got.add("streak3");
  if (st.best >= 7) got.add("streak7");
  if (totalHours >= 50) got.add("h50");
  if (totalHours >= 100) got.add("h100");
  const thisMonth = format(today, "yyyy-MM");
  for (const [key, list] of Object.entries(byMonth)) {
    if (goalProgress(list, s).set && goalProgress(list, s).percent >= 100) got.add("goal");
    // Devamlı: geçmiş (tamamlanmış) bir ay, mesai var, devamsızlık/ücretsiz izin yok
    if (key < thisMonth && monthStats(list, s).workDays > 0 && monthStats(list, s).absentDays === 0) got.add("steady");
  }
  return got;
}
