import { addDays } from "date-fns/addDays";
import { format } from "date-fns/format";
import { parseISO } from "date-fns/parseISO";
import { startOfWeek } from "date-fns/startOfWeek";
import { OFF_TYPES } from "./day";
import { holidayName } from "./holidays";
import type { Entry, EntryType } from "./types";

export const WEEK_LABELS = ["Pt", "Sa", "Ça", "Pe", "Cu", "Ct", "Pz"];

/**
 * Seçili günün haftası (pazartesi başlar — Raporlar'daki "Bu hafta" ile aynı): her gün mesai saati,
 * izin/rapor/gelmedim/tatil durumu. Hafta iki aya yayılabilir; `months` yüklenmesi gereken ayları verir.
 */
export function weekDays(date: string, entries: Entry[]) {
  const start = startOfWeek(parseISO(date), { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = format(addDays(start, i), "yyyy-MM-dd");
    const es = entries.filter((e) => e.work_date === d);
    const work = es.filter((e) => (e.type === "overtime" || e.type === "holiday") && Number(e.hours) > 0);
    const hours = work.reduce((a, e) => a + Number(e.hours), 0);
    const marked = es.find((e) => OFF_TYPES.includes(e.type) || (e.type === "holiday" && Number(e.hours) === 0));
    return {
      date: d, label: WEEK_LABELS[i], hours,
      /** Çubuğun türü: tatil oranlı mesai varsa "holiday" */
      workType: (work.some((e) => e.type === "holiday") ? "holiday" : "overtime") as EntryType,
      status: (marked?.type ?? null) as EntryType | null,
      holiday: !!holidayName(d) || marked?.type === "holiday",
    };
  });
  const total = days.reduce((a, d) => a + d.hours, 0);
  const months = [...new Set([days[0].date.slice(0, 7), days[6].date.slice(0, 7)])];
  return { days, total, max: Math.max(...days.map((d) => d.hours)), months };
}
