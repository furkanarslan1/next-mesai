import { getDay, parseISO } from "date-fns";
import type { Entry, Settings } from "./types";

/** Bir kaydın kazancı: pazar ve tatil çalışması çarpanla hesaplanır. */
export function entryPay(e: Entry, s: Settings): number {
  if (e.type !== "overtime" && e.type !== "holiday") return 0;
  const isSunday = getDay(parseISO(e.work_date)) === 0;
  let mult = 1;
  if (e.type === "holiday") mult = s.holiday_multiplier;
  else if (isSunday) mult = s.sunday_multiplier;
  return e.hours * s.hourly_rate * mult;
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
  { min: 0, name: "Çaylak", emoji: "🌱" },
  { min: 10, name: "Gayretli", emoji: "⚡" },
  { min: 20, name: "Çalışkan", emoji: "🔥" },
  { min: 50, name: "Usta", emoji: "🛠️" },
  { min: 100, name: "Uzman", emoji: "💎" },
  { min: 200, name: "Efsane", emoji: "👑" },
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
