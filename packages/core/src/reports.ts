import { addMonths, format, getDaysInMonth, startOfMonth } from "date-fns";
import { goalProgress, hrs, money, monthSummary, paidHoursByPercent, salaryDeduction } from "./calc";
import type { Entry, Payslip, Settings } from "./types";

const isWork = (e: Entry) => (e.type === "overtime" || e.type === "holiday") && Number(e.hours) > 0;

/** Bir ayın özeti: mesai, kazanç, maaş kesintisi ve toplam gelir (maaş − kesinti + mesai). */
export function monthStats(entries: Entry[], s: Settings) {
  const sum = monthSummary(entries, s);
  const ded = salaryDeduction(entries, s);
  const salaryNet = Math.max(0, s.monthly_salary - ded.amount);
  return {
    hours: sum.hours,
    earned: sum.earned,
    deduction: ded.amount,
    absentDays: ded.days,
    salaryNet,
    income: salaryNet + sum.earned,
    workDays: new Set(entries.filter(isWork).map((e) => e.work_date)).size,
  };
}

/** Bugünün ayı dahil geriye doğru n ay, eskiden yeniye. */
export function lastMonths(today: Date, n: number): Date[] {
  const cur = startOfMonth(today);
  return Array.from({ length: n }, (_, i) => addMonths(cur, i - (n - 1)));
}
export const keyOf = (d: Date) => format(d, "yyyy-MM");

/** Önceki değere göre fark ve yüzde (önceki 0 ise yüzde yok). */
export function change(cur: number, prev: number) {
  const delta = cur - prev;
  return { delta, pct: prev > 0 ? (delta / prev) * 100 : null };
}

/**
 * Ay sonu tahmini ve hedef için günlük gereken mesai (yalnızca içinde bulunulan ay için anlamlı).
 * Tempo: şimdiye kadarki mesai / geçen gün sayısı. `remaining` bugünden sonra kalan gün sayısı.
 */
export function projection(entries: Entry[], s: Settings, today: Date) {
  const total = getDaysInMonth(today);
  const elapsed = today.getDate();
  const remaining = total - elapsed;
  const m = monthSummary(entries, s);
  const ded = salaryDeduction(entries, s);
  const pace = elapsed > 0 ? total / elapsed : 1;
  const projectedHours = m.hours * pace;
  // Dahil saatler (maaşın içindeki) ücret getirmez: tahmini ücretli saat = tahmini toplam − dahil saat
  const projectedEarned = Math.max(0, projectedHours - Math.max(0, s.included_overtime_hours ?? 0)) * m.paidRate;
  const projectedIncome = Math.max(0, s.monthly_salary - ded.amount) + projectedEarned;
  const g = goalProgress(entries, s);
  let neededHours = 0;
  if (g.set) {
    if (g.mode === "hours") neededHours = Math.max(0, g.goal - m.hours);
    else {
      const remaining = Math.max(0, g.goal - g.income);
      neededHours = remaining > 0 && m.paidRate > 0 ? remaining / m.paidRate + m.quotaLeft : 0;
    }
  }
  const onTrack = g.set && (g.mode === "hours" ? projectedHours >= g.goal : projectedIncome >= g.goal);
  return {
    elapsed, remaining, projectedHours, projectedEarned, projectedIncome,
    neededHours, perDay: remaining > 0 ? neededHours / remaining : neededHours,
    goalSet: g.set, mode: g.mode, goal: g.goal, onTrack, reached: g.set && neededHours <= 0,
  };
}

/** Yıllık izin: yılın ücretli izin günleri (aynı gün tek sayılır), hakka göre kalan. */
export function annualLeave(entriesByMonth: Record<string, Entry[]>, year: number, entitlement: number) {
  const days = new Set<string>();
  Object.values(entriesByMonth).flat().forEach((e) => { if (e.type === "paid_leave" && e.work_date.startsWith(String(year))) days.add(e.work_date); });
  const used = days.size;
  return { used, left: Math.max(0, entitlement - used), over: Math.max(0, used - entitlement) };
}
/** Türkiye İş Kanunu m.53: kıdeme göre asgari yıllık izin. */
export const leaveByTenure = (years: number) => (years >= 15 ? 26 : years >= 5 ? 20 : 14);

export interface CheckRow { key: string; label: string; bordro: string; app: string; ok: boolean; note?: string }

/**
 * Bordro kontrolü: bordrodaki kalemler uygulamanın hesabıyla satır satır karşılaştırılır. Bordroda yalnızca
 * maaşa dahil saati aşan (ücretli) mesai yazar; küçük farklar (çeyrek saat, gün kesri, birkaç TL) yok sayılır.
 * Bordroya girilmeyen isteğe bağlı kalemler karşılaştırılmaz. Tutarlar net esaslıdır (saatlik ücret net girilmişse).
 */
export function payslipCheck(p: Payslip, entries: Entry[], s: Settings) {
  const m = monthSummary(entries, s);
  const cur = s.currency;
  const days = (types: string[]) => new Set(entries.filter((e) => types.includes(e.type)).map((e) => e.work_date)).size;
  const hoursDiff = Math.round((p.paid_hours - m.paidHours) * 100) / 100;
  const amountDiff = Math.round(p.paid_amount - m.earned);
  const rows: CheckRow[] = [];
  const hoursRow = (key: string, label: string, bordro: number, app: number, note?: string) =>
    rows.push({ key, label, bordro: hrs(bordro), app: hrs(app), ok: Math.abs(bordro - app) <= 0.25, note });
  const daysRow = (key: string, label: string, bordro: number, app: number, note?: string) =>
    rows.push({ key, label, bordro: `${+bordro.toFixed(2)} gün`, app: `${app} gün`, ok: Math.abs(bordro - app) < 0.5, note });

  hoursRow("hours", "Ek mesai saati", p.paid_hours, m.paidHours);
  if (p.paid_amount > 0 || m.earned > 0) {
    rows.push({ key: "amount", label: "Ek mesai tutarı", bordro: money(p.paid_amount, cur), app: money(m.earned, cur), ok: Math.abs(p.paid_amount - m.earned) <= Math.max(10, m.earned * 0.03) });
  }
  if (p.overtime_by_pct) {
    const app = paidHoursByPercent(entries, s);
    const keys = [...new Set([...Object.keys(p.overtime_by_pct), ...Object.keys(app)])].sort((x, y) => Number(x) - Number(y));
    keys.forEach((k) => hoursRow(`pct${k}`, `Ek mesai %${k}`, Number(p.overtime_by_pct?.[k] ?? 0), app[k] ?? 0));
  }
  if (p.unpaid_days != null) daysRow("unpaid", "Ücretsiz izin / devamsızlık günü", p.unpaid_days, days(["unpaid_leave", "absent"]));
  if (p.sick_unpaid_days != null || p.sick_paid_days != null) {
    const note = (p.sick_unpaid_days ?? 0) > 0 && !s.sick_leave_unpaid ? "Ayarlarda raporlu günler maaştan düşmüyor; bordroda ücretsiz görünüyor." : undefined;
    daysRow("sick", "Raporlu gün", (p.sick_unpaid_days ?? 0) + (p.sick_paid_days ?? 0), days(["sick"]), note);
  }
  if (p.paid_leave_days != null) daysRow("leave", "Ücretli / yıllık izin günü", p.paid_leave_days, days(["paid_leave"]));
  if (p.net_paid != null) {
    const expected = monthStats(entries, s).income - (p.special_deductions ?? 0);
    rows.push({ key: "net", label: "Net ödenen", bordro: money(p.net_paid, cur), app: money(expected, cur), ok: Math.abs(p.net_paid - expected) <= Math.max(10, expected * 0.002) });
  }

  const issues = rows.filter((r) => !r.ok).length;
  const status: "ok" | "missing" | "extra" | "other" =
    issues === 0 ? "ok" : hoursDiff < -0.25 ? "missing" : hoursDiff > 0.25 ? "extra" : "other";
  return { appHours: m.paidHours, appAmount: m.earned, hoursDiff, amountDiff, status, rows, issues };
}
