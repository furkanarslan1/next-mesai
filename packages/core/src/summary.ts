import { addMonths } from "date-fns/addMonths";
import { differenceInCalendarDays } from "date-fns/differenceInCalendarDays";
import { getDaysInMonth } from "date-fns/getDaysInMonth";
import { getDay } from "date-fns/getDay";
import { parseISO } from "date-fns/parseISO";
import { deductedTypes, entryPay, goalProgress, monthSummary, netWorked, salaryDeduction } from "./calc";
import type { Entry, FinanceItem, Settings } from "./types";

export type OvertimeKind = "weekday" | "sunday" | "holiday";
export const OVERTIME_KIND_LABEL: Record<OvertimeKind, string> = { weekday: "Hafta içi", sunday: "Pazar", holiday: "Resmi tatil" };

const kindOf = (e: Entry): OvertimeKind => (e.type === "holiday" ? "holiday" : getDay(parseISO(e.work_date)) === 0 ? "sunday" : "weekday");

/**
 * Mesainin türe göre dökümü (hafta içi / pazar / resmi tatil): net saat (rapor düşümünden sonra) ve kazanç.
 * Maaşa dahil saatler günlük sırayla tüketildiği için (monthSummary ile aynı) kazanç toplamı ayın mesai kazancına eşittir.
 */
export function overtimeByKind(entries: Entry[], s: Settings) {
  const { worked } = netWorked(entries, s);
  let quota = Math.max(0, s.included_overtime_hours ?? 0);
  const out: Record<OvertimeKind, { hours: number; amount: number }> = {
    weekday: { hours: 0, amount: 0 }, sunday: { hours: 0, amount: 0 }, holiday: { hours: 0, amount: 0 },
  };
  [...worked].sort((a, b) => a.work_date.localeCompare(b.work_date)).forEach((e) => {
    const h = Number(e.hours);
    const covered = Math.min(quota, h);
    quota -= covered;
    const k = out[kindOf(e)];
    k.hours += h;
    k.amount += entryPay({ ...e, hours: h - covered }, s);
  });
  return (Object.keys(out) as OvertimeKind[]).filter((k) => out[k].hours > 0).map((k) => ({ kind: k, label: OVERTIME_KIND_LABEL[k], ...out[k] }));
}

/** Maaş kesintisinin gün dökümü: ücretsiz izin, gelmedi, (ayara göre) raporlu. */
export function deductionDetail(entries: Entry[], s: Settings) {
  const types = deductedTypes(s);
  const daysOf = (t: string) => types.includes(t) ? new Set(entries.filter((e) => e.type === t).map((e) => e.work_date)).size : 0;
  const { days, amount } = salaryDeduction(entries, s);
  return { days, amount, unpaid: daysOf("unpaid_leave"), absent: daysOf("absent"), sick: daysOf("sick") };
}

/** Bir sonraki maaş gününe kalan gün (bugün maaş günüyse 0). Ay kısaysa ayın son günü sayılır; ayar yoksa null. */
export function daysToPayday(today: Date, payday: number | null | undefined) {
  if (!payday || payday < 1 || payday > 31) return null;
  const at = (m: Date) => new Date(m.getFullYear(), m.getMonth(), Math.min(payday, getDaysInMonth(m)));
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  let next = at(t);
  if (next < t) next = at(addMonths(new Date(t.getFullYear(), t.getMonth(), 1), 1));
  return differenceInCalendarDays(next, t);
}

/**
 * Ay özeti kartının ayrıntıları: türe göre mesai, kesinti dökümü, geçen aya göre fark (önceki ay yüklüyse)
 * ve gelir-gider (kalem varsa: ek gelir, harcama, kalan).
 */
export function summaryDetails(entries: Entry[], s: Settings, prev: Entry[] | null, items: FinanceItem[] | null) {
  const g = goalProgress(entries, s);
  const m = monthSummary(entries, s);
  let vsPrev: { income: number; hours: number } | null = null;
  if (prev) {
    const pg = goalProgress(prev, s);
    vsPrev = { income: g.income - pg.income, hours: m.hours - monthSummary(prev, s).hours };
  }
  let finance: { extra: number; expense: number; left: number } | null = null;
  if (items && items.length) {
    const extra = items.filter((i) => i.kind === "income").reduce((a, i) => a + i.amount, 0);
    const expense = items.filter((i) => i.kind === "expense").reduce((a, i) => a + i.amount, 0);
    finance = { extra, expense, left: g.income + extra - expense };
  }
  return { byKind: overtimeByKind(entries, s), deduction: deductionDetail(entries, s), vsPrev, finance };
}
