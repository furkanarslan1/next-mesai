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
