import { describe, expect, it } from "vitest";
import { monthSummary } from "../src/calc";
import { daysToPayday, deductionDetail, overtimeByKind, summaryDetails } from "../src/summary";
import { SETTINGS as S, day, entry as E, financeItem as F } from "./helpers";

describe("mesai türe göre döküm", () => {
  // 2026-11-01 pazar, 03 salı; hafta içi 100 ₺/sa, pazar ve tatil %200
  const ents = [E("2026-11-03", "overtime", 4), E("2026-11-01", "overtime", 2), E("2026-11-10", "holiday", 3), E("2026-11-05", "sick")];
  it("hafta içi, pazar, tatil saat ve tutarı", () => {
    expect(overtimeByKind(ents, S)).toEqual([
      { kind: "weekday", label: "Hafta içi", hours: 4, amount: 400 },
      { kind: "sunday", label: "Pazar", hours: 2, amount: 400 },
      { kind: "holiday", label: "Resmi tatil", hours: 3, amount: 600 },
    ]);
  });
  it("maaşa dahil saatler düşülünce toplam ay kazancına eşit", () => {
    const s = { ...S, included_overtime_hours: 5 };
    const sum = overtimeByKind(ents, s).reduce((a, k) => a + k.amount, 0);
    expect(sum).toBeCloseTo(monthSummary(ents, s).earned, 5);
  });
  it("rapor düşümü sonrası saatler", () => {
    const s = { ...S, sick_deducts_overtime: true, daily_hours: 3 };
    const sum = overtimeByKind(ents, s).reduce((a, k) => a + k.hours, 0);
    expect(sum).toBeCloseTo(monthSummary(ents, s).hours, 5);
  });
});

describe("kesinti dökümü", () => {
  const ents = [E("2026-11-03", "unpaid_leave"), E("2026-11-04", "absent"), E("2026-11-04", "absent"), E("2026-11-05", "sick")];
  it("raporlu yalnız ayar açıksa", () => {
    expect(deductionDetail(ents, S)).toEqual({ days: 2, amount: 2000, unpaid: 1, absent: 1, sick: 0 });
    expect(deductionDetail(ents, { ...S, sick_leave_unpaid: true })).toMatchObject({ days: 3, sick: 1 });
  });
});

describe("maaş günü", () => {
  it("bu ay, bugün ve sonraki ay", () => {
    expect(daysToPayday(day("2026-11-10"), 15)).toBe(5);
    expect(daysToPayday(day("2026-11-15"), 15)).toBe(0);
    expect(daysToPayday(day("2026-11-20"), 15)).toBe(25);
  });
  it("ay kısaysa son gün", () => {
    expect(daysToPayday(day("2027-02-20"), 31)).toBe(8); // 28 şubat
    expect(daysToPayday(day("2026-11-30"), 31)).toBe(0);
  });
  it("ayar yoksa null", () => expect(daysToPayday(day("2026-11-10"), null)).toBeNull());
});

describe("özet ayrıntıları", () => {
  const cur = [E("2026-11-03", "overtime", 4)];
  const prev = [E("2026-10-06", "overtime", 6)];
  it("geçen aya göre fark", () => {
    expect(summaryDetails(cur, S, prev, null).vsPrev).toEqual({ income: -200, hours: -2 });
    expect(summaryDetails(cur, S, null, null).vsPrev).toBeNull();
  });
  it("gelir-gider: kalem yoksa yok, varsa kalan", () => {
    expect(summaryDetails(cur, S, null, []).finance).toBeNull();
    const items = [F({ kind: "expense", category: "kira", amount: 10000 }), F({ kind: "income", category: "prim", amount: 500 })];
    expect(summaryDetails(cur, S, null, items).finance).toEqual({ extra: 500, expense: 10000, left: 30000 + 400 + 500 - 10000 });
  });
});
