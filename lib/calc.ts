import { getDay, parseISO } from "date-fns";
import type { Entry, Settings } from "./types";

/** Bir kaydın kazancı: pazar ve tatil çalışması çarpanla hesaplanır. */
export function entryPay(e: Entry, s: Settings): number {
  if (e.type !== "overtime" && e.type !== "holiday") return 0;
  const isSunday = getDay(parseISO(e.work_date)) === 0;
  let rate = s.hourly_rate;
  if (e.type === "holiday") rate = s.holiday_rate > 0 ? s.holiday_rate : s.hourly_rate * s.holiday_multiplier;
  else if (isSunday) rate = s.sunday_rate > 0 ? s.sunday_rate : s.hourly_rate * s.sunday_multiplier;
  return e.hours * rate;
}

/**
 * Ana sayfadaki hedef barı.
 * amount modu: (maaş + mesai kazancı) / hedef maaş
 * hours modu: yapılan mesai saati / hedef mesai saati
 */
export function goalProgress(entries: Entry[], s: Settings) {
  const m = monthSummary(entries, s);
  const income = s.monthly_salary + m.earned;
  const avgRate = m.hours > 0 ? m.earned / m.hours : s.hourly_rate;
  if (s.goal_mode === "hours") {
    const goal = s.monthly_goal_hours;
    return {
      mode: "hours" as const, set: goal > 0, percent: goal > 0 ? Math.min(100, (m.hours / goal) * 100) : 0,
      done: m.hours, goal, income, earned: m.earned, hoursNeeded: goal,
    };
  }
  const goal = s.monthly_goal_amount;
  const remaining = Math.max(0, goal - income);
  const hoursLeft = avgRate > 0 ? remaining / avgRate : 0;
  return {
    mode: "amount" as const, set: goal > 0, percent: goal > 0 ? Math.min(100, (income / goal) * 100) : 0,
    done: income, goal, income, earned: m.earned, hoursNeeded: m.hours + hoursLeft,
  };
}

export function monthSummary(entries: Entry[], s: Settings) {
  const worked = entries.filter((e) => e.type === "overtime" || e.type === "holiday");
  const hours = worked.reduce((a, e) => a + e.hours, 0);
  const earned = entries.reduce((a, e) => a + entryPay(e, s), 0);
  const goal = s.monthly_goal_amount;
  const avgRate = hours > 0 ? earned / hours : s.hourly_rate;
  return {
    hours,
    earned,
    goal,
    percent: goal > 0 ? Math.min(100, (earned / goal) * 100) : 0,
    remainingMoney: Math.max(0, goal - earned),
    remainingHours: avgRate > 0 ? Math.max(0, (goal - earned) / avgRate) : 0,
  };
}

export const LEVELS = [
  { min: 0, name: "Çaylak" },
  { min: 10, name: "Gayretli" },
  { min: 20, name: "Çalışkan" },
  { min: 50, name: "Usta" },
  { min: 100, name: "Uzman" },
  { min: 200, name: "Efsane" },
];

export function levelFor(totalHours: number) {
  let idx = 0;
  LEVELS.forEach((l, i) => { if (totalHours >= l.min) idx = i; });
  const next = LEVELS[idx + 1];
  const cur = LEVELS[idx];
  return {
    level: idx + 1,
    ...cur,
    next,
    progress: next ? ((totalHours - cur.min) / (next.min - cur.min)) * 100 : 100,
    toNext: next ? next.min - totalHours : 0,
  };
}

export const money = (n: number, cur = "TRY") =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: cur, maximumFractionDigits: 0 }).format(n);
export const hrs = (n: number) => `${Number.isInteger(n) ? n : n.toFixed(1)} sa`;

/** "07:30" - "19:00" arası saat farkı (gece vardiyası için ertesi güne taşar). */
export function hoursBetween(start: string, end: string) {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  let mins = eh * 60 + em - (sh * 60 + sm);
  if (mins <= 0) mins += 24 * 60;
  return Math.round((mins / 60) * 100) / 100;
}
export const hhmm = (t: string | null) => (t ? t.slice(0, 5) : "");

/**
 * Normal çıkış saatinden sonra çalışılan süre (saat). Çıkış, normal saatten önce
 * ya da 12 saatten fazla sonraysa mesai yok sayılır (gece vardiyasında gün aşımı desteklenir).
 */
export function overtimeAfter(workEnd: string, exit: string) {
  if (!workEnd || !exit) return 0;
  const [wh, wm] = workEnd.split(":").map(Number);
  const [eh, em] = exit.split(":").map(Number);
  let mins = eh * 60 + em - (wh * 60 + wm);
  if (mins < 0) mins += 24 * 60;
  if (mins > 12 * 60) return 0;
  return Math.round((mins / 60) * 100) / 100;
}
