import { describe, expect, it } from "vitest";
import { monthSummary } from "../src/calc";
import { periodMonths, periodRange, periodSummary } from "../src/period";
import { SETTINGS as S, day, entry as E } from "./helpers";

describe("dönem aralığı", () => {
  it("hafta pazartesi başlar, pazar biter", () => {
    expect(periodRange("week", day("2026-11-24"))).toEqual({ from: "2026-11-23", to: "2026-11-29" }); // salı
    expect(periodRange("week", day("2026-11-29"))).toEqual({ from: "2026-11-23", to: "2026-11-29" }); // pazar
    expect(periodRange("week", day("2026-11-30"))).toEqual({ from: "2026-11-30", to: "2026-12-06" }); // pazartesi
  });
  it("ay ve yıl", () => {
    expect(periodRange("month", day("2026-02-10"))).toEqual({ from: "2026-02-01", to: "2026-02-28" });
    expect(periodRange("year", day("2026-06-01"))).toEqual({ from: "2026-01-01", to: "2026-12-31" });
  });
  it("yılı aşan hafta iki ayı kapsar", () => {
    const r = periodRange("week", day("2026-12-31"));
    expect(r).toEqual({ from: "2026-12-28", to: "2027-01-03" });
    expect(periodMonths(r)).toEqual(["2026-12", "2027-01"]);
  });
});

describe("dönem özeti", () => {
  const nov = [
    E("2026-11-03", "overtime", 4), E("2026-11-10", "overtime", 6), E("2026-11-24", "overtime", 2.5),
    E("2026-11-25", "paid_leave"), E("2026-11-26", "sick"), E("2026-11-27", "unpaid_leave"),
    E("2026-11-02", "absent"), E("2026-10-29", "holiday"),
  ];
  const by = { "2026-11": nov };
  it("haftanın mesaisi, kazancı ve gün durumları", () => {
    const w = periodSummary(by, S, periodRange("week", day("2026-11-24")));
    expect(w.hours).toBe(2.5);
    expect(w.earned).toBe(250);
    expect([w.workDays, w.paidLeave, w.sick, w.unpaidLeave, w.absent, w.holiday]).toEqual([1, 1, 1, 1, 0, 0]);
  });
  it("maaşa dahil saatler ayın ilk mesaisinden düşer, hafta bunu doğru yansıtır", () => {
    const s = { ...S, included_overtime_hours: 10 };
    // 3 ve 10 Kasım: 10 saat dahil → ücretsiz; 24 Kasım haftası tamamen ücretli
    expect(periodSummary(by, s, periodRange("week", day("2026-11-24"))).earned).toBe(250);
    // 2–8 Kasım haftası: 4 saatin hepsi dahil
    expect(periodSummary(by, s, periodRange("week", day("2026-11-04"))).earned).toBe(0);
  });
  it("haftalar toplamı ay toplamına eşit", () => {
    const s = { ...S, included_overtime_hours: 5 };
    const weeks = ["2026-11-01", "2026-11-04", "2026-11-11", "2026-11-18", "2026-11-25"].map((d) => periodSummary(by, s, periodRange("week", day(d))));
    const m = monthSummary(nov, s);
    expect(weeks.reduce((a, w) => a + w.earned, 0)).toBeCloseTo(m.earned, 6);
    expect(weeks.reduce((a, w) => a + w.hours, 0)).toBeCloseTo(m.hours, 6);
  });
  it("ay ve yıl: farklı günler sayılır, saatli tatil tatil günü sayılmaz", () => {
    const y = { "2026-11": [...nov, E("2026-11-25", "paid_leave"), E("2026-11-19", "holiday", 3)], "2026-12": [E("2026-12-21", "paid_leave")] };
    const m = periodSummary(y, S, periodRange("month", day("2026-11-24")));
    expect([m.paidLeave, m.holiday, m.workDays]).toEqual([1, 0, 4]);
    const yr = periodSummary(y, S, periodRange("year", day("2026-11-24")));
    expect([yr.paidLeave, yr.hours]).toEqual([2, 15.5]);
  });
});
