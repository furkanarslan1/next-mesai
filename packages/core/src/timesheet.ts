import { eachDayOfInterval } from "date-fns/eachDayOfInterval";
import { scheduleFor } from "./shift";
import { endOfMonth } from "date-fns/endOfMonth";
import { format } from "date-fns/format";
import { startOfMonth } from "date-fns/startOfMonth";
import { tr } from "date-fns/locale/tr";
import { holidayName } from "./holidays";
import { isRestDay } from "./day";
import { hhmm, monthSummary, paidHoursByPercent, percentFor } from "./calc";
import type { Entry, Settings } from "./types";

export interface TimesheetRow {
  date: string; // yyyy-MM-dd
  label: string; // dd.MM.yyyy
  dayName: string;
  start: string; // HH:MM ya da ""
  end: string;
  normalHours: number;
  overtimeHours: number;
  percent: number | null;
  paidLeave: number; // 1 / 0
  unpaidLeave: number;
  sick: number;
  absent: number;
  holiday: number; // resmi tatil (ya da "Resmi tatil" olarak işaretlenmiş gün)
  weekend: boolean;
  status: string;
  note: string;
}

export interface Timesheet {
  rows: TimesheetRow[];
  totals: {
    normalDays: number; normalHours: number; overtimeHours: number; paidOvertimeHours: number; includedHours: number; sickDeductedHours: number;
    overtimeByPercent: Record<string, number>; paidLeave: number; unpaidLeave: number; sick: number; absent: number; holiday: number; weekendDays: number;
  };
}

const isWork = (e: Entry) => (e.type === "overtime" || e.type === "holiday") && Number(e.hours) > 0;

/** "16:00" + 2.5 saat = "18:30" (gece yarısını geçerse sarar). */
export function addHours(time: string, hours: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = Math.round((h * 60 + m + hours * 60)) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

/**
 * Aylık gün gün çalışma çizelgesi (insan kaynaklarına verilebilir, çalışan kontrol edebilir).
 * Uygulama günlük giriş/çıkışı ayrıca tutmaz: normal çalışma günlerinde giriş/çıkış ayarlardaki çalışma saatinden,
 * mesai olan günlerde çıkış mesai kadar uzatılarak (ya da kayıttaki çıkış saatinden) türetilir.
 * `assumeWorkdays` açıksa kayıt olmayan iş günleri normal çalışma günü sayılır (cumartesi ayara göre); hafta tatili ve resmi tatil boş kalır.
 */
export function buildTimesheet(month: Date, entries: Entry[], s: Settings, opts: { assumeWorkdays?: boolean } = {}): Timesheet {
  const assume = opts.assumeWorkdays ?? true;
  const days = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) });

  const rows: TimesheetRow[] = days.map((d) => {
    const date = format(d, "yyyy-MM-dd");
    // Vardiya döngüsü varsa günün haftasındaki vardiya saati
    const { start: workStart, end: workEnd } = scheduleFor(d, s);
    const weekend = isRestDay(d, s);
    const recs = entries.filter((e) => e.work_date === date);
    const ot = recs.filter(isWork);
    const overtime = ot.reduce((a, e) => a + Number(e.hours), 0);
    const has = (t: string) => recs.some((e) => e.type === t);
    const holName = holidayName(date);
    const paidLeave = has("paid_leave") ? 1 : 0;
    const unpaidLeave = has("unpaid_leave") ? 1 : 0;
    const sick = has("sick") ? 1 : 0;
    const absent = has("absent") ? 1 : 0;
    const holMarked = recs.some((e) => e.type === "holiday" && Number(e.hours) === 0);
    const holiday = holName || holMarked ? 1 : 0;
    const off = paidLeave || unpaidLeave || sick || absent;
    const workday = !weekend && !holiday;

    let start = "", end = "", normal = 0;
    if (!off) {
      if (workday && (assume || ot.length)) {
        normal = s.daily_hours > 0 ? s.daily_hours : 0;
        start = workStart; end = workEnd;
      }
      if (ot.length) {
        const exit = ot.find((e) => e.end_time);
        if (exit?.end_time) end = hhmm(exit.end_time);
        else if (workday && workEnd) end = addHours(workEnd, overtime);
        // Hafta sonu / tatil: normal mesai yok, gün yalnızca mesaiden oluşur. Giriş kayıttan ya da normal girişten,
        // çıkış kayıttan ya da giriş + mesai süresinden yazılır (boş kalmasın).
        if (!workday) {
          const entryStart = ot.find((e) => e.start_time)?.start_time;
          start = entryStart ? hhmm(entryStart) : workStart;
          if (!exit?.end_time && start) end = addHours(start, overtime);
        }
      }
    }

    const status = [
      paidLeave && "Ücretli izin", unpaidLeave && "Ücretsiz izin", sick && "Raporlu", absent && "Gelmedi",
      holiday && (holName ? `Resmi tatil (${holName})` : "Resmi tatil"),
      !holiday && weekend && !off && !ot.length && "Hafta tatili",
    ].filter(Boolean).join(", ");

    return {
      date, label: format(d, "dd.MM.yyyy"), dayName: format(d, "EEEE", { locale: tr }), start, end,
      normalHours: normal, overtimeHours: overtime, percent: ot.length ? percentFor(ot[0], s) : null,
      paidLeave, unpaidLeave, sick, absent, holiday, weekend, status,
      note: recs.map((e) => e.note).filter(Boolean).join("; "),
    };
  });

  const sum = monthSummary(entries, s);
  const total = (k: "paidLeave" | "unpaidLeave" | "sick" | "absent" | "holiday") => rows.reduce((a, r) => a + r[k], 0);
  return {
    rows,
    totals: {
      normalDays: rows.filter((r) => r.normalHours > 0).length,
      normalHours: rows.reduce((a, r) => a + r.normalHours, 0),
      overtimeHours: +rows.reduce((a, r) => a + r.overtimeHours, 0).toFixed(2),
      paidOvertimeHours: +sum.paidHours.toFixed(2), includedHours: +sum.includedHours.toFixed(2), sickDeductedHours: +sum.sickHours.toFixed(2),
      overtimeByPercent: paidHoursByPercent(entries, s),
      paidLeave: total("paidLeave"), unpaidLeave: total("unpaidLeave"), sick: total("sick"), absent: total("absent"), holiday: total("holiday"),
      weekendDays: rows.filter((r) => r.weekend).length,
    },
  };
}
