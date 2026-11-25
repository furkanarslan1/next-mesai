import { addWeeks } from "date-fns/addWeeks";
import { differenceInCalendarWeeks } from "date-fns/differenceInCalendarWeeks";
import { format } from "date-fns/format";
import { parseISO } from "date-fns/parseISO";
import { startOfWeek } from "date-fns/startOfWeek";
import { hoursBetween } from "./calc";
import { SHIFTS, type Settings, type ShiftRotation, type ShiftStep, type ShiftType } from "./types";

const TIME = /^\d{2}:\d{2}$/;
const hhmm = (t: string | null | undefined) => (t ? t.slice(0, 5) : "");
const monday = (d: Date) => startOfWeek(d, { weekStartsOn: 1 });

/** Döngü geçerli mi (en az 2 adım, saatler dolu); değilse null. Yedekten geri yüklerken de kullanılır. */
export function validRotation(r: unknown): ShiftRotation | null {
  if (!r || typeof r !== "object") return null;
  const o = r as Partial<ShiftRotation>;
  if (typeof o.start !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(o.start) || !Array.isArray(o.steps)) return null;
  const steps = o.steps.filter((x): x is ShiftStep => !!x && x.type in SHIFTS && TIME.test(x.start) && TIME.test(x.end)).slice(0, 4);
  if (steps.length < 2) return null;
  return { start: o.start, weeks: Math.min(4, Math.max(1, Math.round(Number(o.weeks) || 1))), steps };
}

export interface DaySchedule { start: string; end: string; type: ShiftType | null; hours: number; rotating: boolean; step: number }

/**
 * Bir günün çalışma saati: vardiya döngüsü varsa o haftanın adımı, yoksa sabit çalışma saati.
 * Döngü başlangıcından önceki haftalar da geriye doğru aynı sırayla hesaplanır.
 */
export function scheduleFor(date: Date, s: Pick<Settings, "work_start" | "work_end" | "shift_type" | "has_shift"> & { shift_rotation?: ShiftRotation | null }): DaySchedule {
  const r = validRotation(s.shift_rotation);
  if (r) {
    const weeks = differenceInCalendarWeeks(monday(date), parseISO(r.start), { weekStartsOn: 1 });
    const n = r.steps.length;
    const step = ((Math.floor(weeks / r.weeks) % n) + n) % n;
    const x = r.steps[step];
    return { start: x.start, end: x.end, type: x.type, hours: hoursBetween(x.start, x.end), rotating: true, step };
  }
  const start = hhmm(s.work_start), end = hhmm(s.work_end);
  return { start, end, type: s.has_shift ? s.shift_type : null, hours: start && end ? hoursBetween(start, end) : 0, rotating: false, step: 0 };
}

/** Bu hafta `step` adımında olunacak şekilde döngü başlangıcı (bu haftanın pazartesisinden geriye) */
export function rotationStartFor(today: Date, step: number, weeks: number) {
  return format(addWeeks(monday(today), -step * weeks), "yyyy-MM-dd");
}

/** "Gündüz → Gece · haftalık" */
export function rotationLabel(r: ShiftRotation) {
  return `${r.steps.map((x) => SHIFTS[x.type].label).join(" → ")} · ${r.weeks === 1 ? "haftalık" : `${r.weeks} haftada bir`}`;
}
