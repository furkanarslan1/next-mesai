import { holidayName } from "./holidays";
import type { Entry, EntryType, Settings } from "./types";

/** Hafta tatili mi: pazar her zaman; cumartesi yalnızca "Cumartesi tatil" açıksa (eski kayıtlarda varsayılan açık). */
export const isRestDay = (d: Date, s: Pick<Settings, "saturday_off">) => d.getDay() === 0 || (d.getDay() === 6 && (s.saturday_off ?? true));

/** İşe gelinmeyen gün durumları: bu günlere mesai girilmez, mesai olan güne de bunlar işaretlenmez. */
export const OFF_TYPES: EntryType[] = ["paid_leave", "unpaid_leave", "sick", "absent"];

const isWork = (e: Entry) => (e.type === "overtime" || e.type === "holiday") && Number(e.hours) > 0;

/**
 * Bir günün kuralları:
 * - `work`: günün mesai kaydı (günde tek olur)
 * - `off`: izin / rapor / gelmedim kaydı
 * - `isHoliday`: resmi tatil listesinde ya da kullanıcı "Resmi tatil" olarak işaretlemiş
 * - `workType`: o güne eklenecek mesainin türü; resmi tatilde tatil oranıyla hesaplansın diye "holiday"
 */
export function dayRules(dayEntries: Entry[], date: string) {
  const work = dayEntries.find(isWork);
  const off = dayEntries.find((e) => OFF_TYPES.includes(e.type));
  const holidayMarked = dayEntries.some((e) => e.type === "holiday" && Number(e.hours) === 0);
  const isHoliday = !!holidayName(date) || holidayMarked;
  return { work, off, isHoliday, workType: (isHoliday ? "holiday" : "overtime") as EntryType };
}

export type BulkType = "paid_leave" | "unpaid_leave" | "sick" | "absent" | "holiday";
export type SkipReason = "work" | "status" | "rest";
export const SKIP_LABEL: Record<SkipReason, string> = { work: "mesai var", status: "zaten işaretli", rest: "hafta tatili / resmi tatil" };

/**
 * Takvimde seçilen günlere toplu durum (ör. 5 günlük yıllık izin). Mesai girilmiş ya da başka durumu olan gün
 * atlanır (günde tek durum). Yıllık (ücretli) izin iş günü sayıldığından hafta tatili ve resmi tatiller de atlanır.
 */
export function bulkPlan(dates: string[], type: BulkType, entries: Entry[], s: Pick<Settings, "saturday_off">) {
  const add: string[] = [];
  const skipped: { date: string; reason: SkipReason }[] = [];
  [...new Set(dates)].sort().forEach((date) => {
    const r = dayRules(entries.filter((e) => e.work_date === date), date);
    const marked = !!r.off || entries.some((e) => e.work_date === date && e.type === "holiday" && Number(e.hours) === 0);
    const d = new Date(`${date}T12:00:00`);
    if (r.work && type !== "holiday") skipped.push({ date, reason: "work" });
    else if (marked) skipped.push({ date, reason: "status" });
    else if (type === "paid_leave" && (isRestDay(d, s) || holidayName(date))) skipped.push({ date, reason: "rest" });
    else add.push(date);
  });
  return { add, skipped };
}
