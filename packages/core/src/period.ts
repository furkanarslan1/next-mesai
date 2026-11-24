/**
 * Dönem özeti (Raporlar → Özet: bu hafta / bu ay / bu yıl): mesai saati, mesai kazancı, çalışılan gün ve
 * gün durumlarının (ücretli/ücretsiz izin, rapor, gelmedi, tatil) gün sayıları.
 */
import { eachMonthOfInterval, endOfMonth, endOfWeek, endOfYear, format, parseISO, startOfMonth, startOfWeek, startOfYear } from "date-fns";
import { monthSummary } from "./calc";
import type { Entry, EntryType, Settings } from "./types";

export type Period = "week" | "month" | "year";

/** Dönemin ilk ve son günü ("yyyy-MM-dd"). Hafta pazartesi başlar. */
export function periodRange(p: Period, today: Date) {
  const [a, b] = p === "week"
    ? [startOfWeek(today, { weekStartsOn: 1 }), endOfWeek(today, { weekStartsOn: 1 })]
    : p === "month" ? [startOfMonth(today), endOfMonth(today)] : [startOfYear(today), endOfYear(today)];
  return { from: format(a, "yyyy-MM-dd"), to: format(b, "yyyy-MM-dd") };
}

/** Dönemin kapsadığı aylar ("yyyy-MM"): haftalık dönem iki aya taşabilir. */
export const periodMonths = (r: { from: string; to: string }) =>
  eachMonthOfInterval({ start: parseISO(r.from), end: parseISO(r.to) }).map((d) => format(d, "yyyy-MM"));

const isWork = (e: Entry) => (e.type === "overtime" || e.type === "holiday") && Number(e.hours) > 0;
const STATUS: Exclude<EntryType, "overtime">[] = ["paid_leave", "unpaid_leave", "sick", "absent", "holiday"];

/**
 * Bir dönemin özeti. Saat ve kazanç ay mantığıyla hesaplanır (maaşa dahil saatler ayın ilk mesaisinden
 * düşer, raporlu gün düşümü dahil): ay içindeki dönem için "dönem sonuna kadarki ay − dönem başından
 * önceki ay" farkı alınır, böylece haftalar ve tam aylar toplanınca ay toplamıyla aynı çıkar.
 * Gün durumları dönemdeki farklı günler olarak sayılır (ileriye planlanmış izinler dahil).
 */
export function periodSummary(byMonth: Record<string, Entry[]>, s: Settings, range: { from: string; to: string }) {
  let hours = 0, earned = 0;
  const workDays = new Set<string>();
  const days: Record<(typeof STATUS)[number], Set<string>> = {
    paid_leave: new Set(), unpaid_leave: new Set(), sick: new Set(), absent: new Set(), holiday: new Set(),
  };
  for (const k of periodMonths(range)) {
    const list = byMonth[k] ?? [];
    const upTo = monthSummary(list.filter((e) => e.work_date <= range.to), s);
    const before = monthSummary(list.filter((e) => e.work_date < range.from), s);
    hours += upTo.hours - before.hours;
    earned += upTo.earned - before.earned;
    for (const e of list) {
      if (e.work_date < range.from || e.work_date > range.to) continue;
      if (isWork(e)) workDays.add(e.work_date);
      // Saatli tatil kaydı "tatilde çalışıldı"dır, tatil günü sayılmaz
      else if (e.type !== "overtime" && !(e.type === "holiday" && Number(e.hours) > 0)) days[e.type].add(e.work_date);
    }
  }
  return {
    hours: Math.max(0, +hours.toFixed(4)), earned: Math.max(0, earned), workDays: workDays.size,
    paidLeave: days.paid_leave.size, unpaidLeave: days.unpaid_leave.size, sick: days.sick.size, absent: days.absent.size, holiday: days.holiday.size,
  };
}
