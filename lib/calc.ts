import { getDay, parseISO } from "date-fns";
import type { Entry, Settings } from "./types";

/**
 * %100 (normal) saatlik ücret. `base_hourly_rate` boşsa (eski kayıtlar) eski `hourly_rate` hafta içi mesai
 * ücreti sayılır ve oradan geri hesaplanır; böylece eski ayarlar aynı sonucu verir.
 */
export function baseRate(s: Settings): number {
  if (s.base_hourly_rate && s.base_hourly_rate > 0) return s.base_hourly_rate;
  const wd = (s.weekday_percent > 0 ? s.weekday_percent : 150) / 100;
  return s.hourly_rate > 0 ? s.hourly_rate / wd : 0;
}
const isSunday = (date: string) => getDay(parseISO(date)) === 0;

/** Bir mesai kaydının oranı (%): resmi tatil, pazar ya da hafta içi. */
export function percentFor(e: { type: string; work_date: string }, s: Settings): number {
  if (e.type === "holiday") return s.holiday_percent ?? 200;
  return isSunday(e.work_date) ? (s.sunday_percent ?? 100) : (s.weekday_percent ?? 150);
}

/** Kaydın saatlik ücreti: sabit TL (pazar/tatil için elle girilmişse) yoksa saatlik ücret x oran. */
export function rateFor(e: { type: string; work_date: string }, s: Settings): number {
  if (e.type === "holiday" && s.holiday_rate > 0) return s.holiday_rate;
  if (e.type !== "holiday" && isSunday(e.work_date) && s.sunday_rate > 0) return s.sunday_rate;
  return (baseRate(s) * percentFor(e, s)) / 100;
}
/** Hafta içi mesai saatlik ücreti (ortalama ücret için varsayılan). */
export const weekdayRate = (s: Settings) => (baseRate(s) * (s.weekday_percent ?? 150)) / 100;

/** Bir kaydın kazancı: saatlik ücret x mesai oranı (hafta içi / pazar / tatil). */
export function entryPay(e: Entry, s: Settings): number {
  if (e.type !== "overtime" && e.type !== "holiday") return 0;
  return e.hours * rateFor(e, s);
}

/**
 * Maaş kesintisi: ücretsiz izin ve mazeretsiz devamsızlık günleri için aylık maaş / 30 (günlük ücret).
 * Aylık ücretli çalışanda ay, kaç gün çektiğine bakılmaksızın 30 gün sayılır. Aynı güne düşen birden
 * fazla kayıt tek gün sayılır, kesinti maaşı geçemez. Ücretli izin kesinti yapmaz; raporlu günler yalnızca
 * "Raporlu günler maaştan düşer" ayarı açıksa (bordroda "Raporlu (Ücretsiz)") kesilir.
 */
export const deductedTypes = (s: Settings) => (s.sick_leave_unpaid ? ["unpaid_leave", "absent", "sick"] : ["unpaid_leave", "absent"]);
export function salaryDeduction(entries: Entry[], s: Settings): { days: number; amount: number } {
  const types = deductedTypes(s);
  const days = new Set(entries.filter((e) => types.includes(e.type)).map((e) => e.work_date)).size;
  const amount = Math.min(s.monthly_salary, (s.monthly_salary / 30) * days);
  return { days, amount };
}

/**
 * Ana sayfadaki hedef barı.
 * amount modu: (maaş - kesinti + mesai kazancı) / hedef maaş
 * hours modu: yapılan mesai saati / hedef mesai saati
 */
export function goalProgress(entries: Entry[], s: Settings) {
  const m = monthSummary(entries, s);
  const ded = salaryDeduction(entries, s);
  const income = s.monthly_salary - ded.amount + m.earned;
  if (s.goal_mode === "hours") {
    const goal = s.monthly_goal_hours;
    return {
      mode: "hours" as const, set: goal > 0, percent: goal > 0 ? Math.min(100, (m.hours / goal) * 100) : 0,
      done: m.hours, goal, income, earned: m.earned, deduction: ded.amount, hoursNeeded: goal,
    };
  }
  const goal = s.monthly_goal_amount;
  const remaining = Math.max(0, goal - income);
  // Kalan tutar için ücretli saat + henüz dolmamış (ücretsiz) dahil saatler
  const hoursLeft = remaining > 0 && m.paidRate > 0 ? remaining / m.paidRate + m.quotaLeft : 0;
  return {
    mode: "amount" as const, set: goal > 0, percent: goal > 0 ? Math.min(100, (income / goal) * 100) : 0,
    done: income, goal, income, earned: m.earned, deduction: ded.amount, hoursNeeded: m.hours + hoursLeft,
  };
}

/**
 * Maaşa dahil mesai: ayın ilk `included_overtime_hours` saati maaşın içindedir ve ayrıca ücretlenmez.
 * Saatler günlük sırayla tüketilir; bir kaydın yalnızca dahil saati aşan kısmı ücret getirir.
 */
function paidSplit(worked: Entry[], s: Settings) {
  let quota = Math.max(0, s.included_overtime_hours ?? 0);
  const extra = new Map<string, number>();
  [...worked].sort((a, b) => a.work_date.localeCompare(b.work_date)).forEach((e) => {
    const covered = Math.min(quota, Number(e.hours));
    quota -= covered;
    extra.set(e.id, Number(e.hours) - covered);
  });
  return { extra, quotaLeft: quota };
}

/** Maaşa dahil saatler düşüldükten sonra, oran (%) başına ücretli mesai saati: {"150": 27.5, "100": 10.5}. */
export function paidHoursByPercent(entries: Entry[], s: Settings): Record<string, number> {
  const worked = entries.filter((e) => (e.type === "overtime" || e.type === "holiday") && Number(e.hours) > 0);
  const { extra } = paidSplit(worked, s);
  const out: Record<string, number> = {};
  worked.forEach((e) => {
    const h = extra.get(e.id) ?? 0;
    if (h <= 0) return;
    const k = String(+percentFor(e, s).toFixed(2));
    out[k] = +((out[k] ?? 0) + h).toFixed(2);
  });
  return out;
}

export function monthSummary(entries: Entry[], s: Settings) {
  const worked = entries.filter((e) => (e.type === "overtime" || e.type === "holiday") && Number(e.hours) > 0);
  const hours = worked.reduce((a, e) => a + Number(e.hours), 0);
  const { extra, quotaLeft } = paidSplit(worked, s);
  const earned = worked.reduce((a, e) => a + entryPay({ ...e, hours: extra.get(e.id) ?? 0 }, s), 0);
  const paidHours = [...extra.values()].reduce((a, h) => a + h, 0);
  const includedHours = hours - paidHours;
  // Ücretli saat başına ortalama ücret (pazar/tatil çarpanları dahil)
  const paidRate = paidHours > 0 ? earned / paidHours : weekdayRate(s);
  // Hedefe göre ilerleme (maaş dahil) goalProgress'tedir; burada yalnızca mesai özeti döner
  return { hours, earned, paidHours, includedHours, quotaLeft, paidRate };
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
export const hrs = (n: number) => `${+n.toFixed(2)} sa`;

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
