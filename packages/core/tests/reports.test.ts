import { describe, expect, it } from "vitest";
import { annualLeave, change, keyOf, lastMonths, leaveByTenure, monthStats, payslipCheck, projection, remainingLabel } from "../src/reports";
import { SETTINGS as S, day, entry as E } from "./helpers";

describe("ay sonu tahmini", () => {
  // Kasım 2026: 1'i pazar; cumartesi tatil → 21 iş günü (2-6, 9-13, 16-20, 23-27, 30)
  const ents = [E("2026-11-03", "overtime", 4), E("2026-11-10", "overtime", 6)];
  const H = { ...S, goal_mode: "hours" as const, monthly_goal_hours: 40 };
  it("tempo iş günüyle: geçen 15 iş gününde 10 saat → 21 iş gününde 14 saat", () => {
    const p = projection(ents, H, day("2026-11-21"));
    expect([p.workdaysTotal, p.workdaysPast, p.remaining, p.byWorkdays]).toEqual([21, 15, 6, true]);
    expect(p.projectedHours).toBeCloseTo(14, 5);
  });
  it("hedef için kalan saat kalan iş günlerine bölünür", () => {
    const p = projection(ents, H, day("2026-11-21"));
    expect(p.neededHours).toBe(30);
    expect(p.perDay).toBeCloseTo(5, 5);
    expect(p.onTrack).toBe(false);
  });
  it("bugünün mesaisi girilmediyse bugün kalan günlere dahil, girildiyse geçmiş sayılır", () => {
    expect(projection(ents, H, day("2026-11-23")).remaining).toBe(6);
    const done = [...ents, E("2026-11-23", "overtime", 2)];
    const p = projection(done, H, day("2026-11-23"));
    expect([p.remaining, p.workdaysPast]).toEqual([5, 16]);
  });
  it("ayın son günü 'ay bitti' değil: bugün hâlâ mesai yapılabilir", () => {
    const last = projection(ents, H, day("2026-11-30"));
    expect([last.remaining, last.perDay]).toEqual([1, 30]);
  });
  it("izin, rapor ve resmi tatil (işaretli) günleri iş günü sayılmaz", () => {
    const p = projection([...ents, E("2026-11-24", "paid_leave"), E("2026-11-25", "sick"), E("2026-11-26", "holiday")], H, day("2026-11-21"));
    expect([p.workdaysTotal, p.remaining]).toEqual([18, 3]);
  });
  it("listedeki resmi tatil iş günü sayılmaz (29 Ekim)", () => {
    expect(projection([], H, day("2026-10-15")).workdaysTotal).toBe(21); // Ekim 2026: 22 hafta içi − 29 Ekim
  });
  it("iş günü kalmadıysa kalan takvim günlerine bölünür", () => {
    // Ekim 2026 31'i cumartesi; 30 Ekim'in mesaisi girildi → iş günü yok, kalan 1 gün (31)
    const p = projection([E("2026-10-30", "overtime", 2)], { ...H, monthly_goal_hours: 10 }, day("2026-10-31"));
    expect([p.byWorkdays, p.remaining, p.perDay]).toEqual([false, 1, 8]);
  });
  it("ilk iş günlerinde tahmin 'henüz erken'", () => {
    expect(projection([E("2026-11-02", "overtime", 3)], H, day("2026-11-03")).early).toBe(true);
    expect(projection(ents, H, day("2026-11-21")).early).toBe(false);
  });
  it("hedef tamamlandıysa", () => {
    const p = projection(ents, { ...H, monthly_goal_hours: 10 }, day("2026-11-21"));
    expect([p.reached, p.onTrack]).toEqual([true, true]);
  });
  it("tutar modunda kalan tutar saate çevrilir", () => {
    const p = projection(ents, { ...S, monthly_goal_amount: 32000 }, day("2026-11-21"));
    expect(p.neededHours).toBeCloseTo(10, 5);
  });
  it("ayın ilk günü güvenli", () => {
    const p = projection([], S, day("2026-11-01"));
    expect(Number.isFinite(p.projectedIncome)).toBe(true);
    expect(p.projectedHours).toBe(0);
  });
  it("maaşa dahil saatler tahmini kazancı düşürür", () => {
    const p = projection([E("2026-11-03", "overtime", 14)], { ...S, included_overtime_hours: 10 }, day("2026-11-21"));
    expect(Math.round(p.projectedEarned)).toBe(Math.round(((14 / 15) * 21 - 10) * 100));
  });
  it("kalan gün yazısı", () => {
    expect(remainingLabel({ remaining: 6, byWorkdays: true })).toBe("kalan 6 iş günü");
    expect(remainingLabel({ remaining: 1, byWorkdays: false })).toBe("kalan 1 gün");
  });
});

describe("yıllık izin", () => {
  const byMonth = {
    "2026-02": [E("2026-02-03", "paid_leave"), E("2026-02-03", "paid_leave"), E("2026-02-04", "paid_leave")],
    "2026-11": [E("2026-11-05", "paid_leave"), E("2026-11-06", "sick")],
    "2025-12": [E("2025-12-30", "paid_leave")],
  };
  it("aynı gün tek sayılır, önceki yıl sayılmaz", () => expect(annualLeave(byMonth, 2026, 14)).toEqual({ used: 3, left: 11, over: 0 }));
  it("hakkı aşınca fazla gün görünür", () => expect(annualLeave(byMonth, 2026, 2)).toEqual({ used: 3, left: 0, over: 1 }));
  it("kıdeme göre asgari hak", () => expect([leaveByTenure(1), leaveByTenure(5), leaveByTenure(15)]).toEqual([14, 20, 26]));
});

describe("bordro kontrolü", () => {
  const month = [E("2026-11-03", "overtime", 5), E("2026-11-04", "overtime", 5)];
  const P = (h: number, a: number) => ({ id: "p", user_id: "u", month: "2026-11-01", paid_hours: h, paid_amount: a, note: null });
  it("uyumlu", () => expect(payslipCheck(P(10, 1000), month, S).status).toBe("ok"));
  it("eksik ödenmiş", () => {
    const c = payslipCheck(P(7, 700), month, S);
    expect([c.status, c.hoursDiff, c.amountDiff]).toEqual(["missing", -3, -300]);
  });
  it("fazla yazılmış", () => expect(payslipCheck(P(12, 1200), month, S).status).toBe("extra"));
  it("çeyrek saat tolerans", () => expect(payslipCheck(P(9.8, 980), month, S).status).toBe("ok"));
  it("bordroda yalnızca maaşa dahil saati aşan kısım yazar", () => {
    const S10 = { ...S, included_overtime_hours: 10 };
    const m = [E("2026-11-03", "overtime", 6), E("2026-11-04", "overtime", 8)];
    expect(payslipCheck(P(4, 400), m, S10).status).toBe("ok");
    expect(payslipCheck(P(14, 1400), m, S10).status).toBe("extra");
  });
});

describe("aylar ve özet", () => {
  it("son n ay, eskiden yeniye", () => {
    expect(lastMonths(day("2026-11-21"), 6).map(keyOf)).toEqual(["2026-06", "2026-07", "2026-08", "2026-09", "2026-10", "2026-11"]);
    expect(lastMonths(day("2026-01-15"), 3).map(keyOf)).toEqual(["2025-11", "2025-12", "2026-01"]);
  });
  it("fark ve yüzde", () => {
    expect(change(120, 100)).toEqual({ delta: 20, pct: 20 });
    expect(change(5, 0).pct).toBeNull();
  });
  it("aylık özet gelir = maaş − kesinti + mesai", () => {
    const m = monthStats([E("2026-11-03", "overtime", 5), E("2026-11-04", "overtime", 5), E("2026-11-05", "absent")], S);
    expect([m.hours, m.earned, m.deduction, m.income, m.workDays]).toEqual([10, 1000, 1000, 30000, 2]);
  });
});

describe("bordro kontrolü (ayrıntılı)", () => {
  const R = { ...S, base_hourly_rate: 183.33, weekday_percent: 150, sunday_percent: 100, holiday_percent: 200 };
  // 3 Kasım Salı 4 sa (%150), 1 Kasım Pazar 2 sa (%100)
  const ents = [E("2026-11-03", "overtime", 4), E("2026-11-01", "overtime", 2), E("2026-11-09", "absent"), E("2026-11-10", "sick"), E("2026-11-12", "paid_leave")];
  const slip = (p: Partial<import("../src/types").Payslip> = {}) => ({ id: "p", user_id: "u", month: "2026-11-01", paid_hours: 6, paid_amount: 4 * 183.33 * 1.5 + 2 * 183.33, note: null, ...p });
  it("oran kırılımı ve tüm satırlar uyumlu", () => {
    const c = payslipCheck(slip({ overtime_by_pct: { "150": 4, "100": 2 }, unpaid_days: 1, sick_paid_days: 1, paid_leave_days: 1 }), ents, R);
    expect(c.issues).toBe(0);
    expect(c.rows.map((r) => r.key)).toEqual(["hours", "amount", "pct100", "pct150", "unpaid", "sick", "leave"]);
  });
  it("oran satırı farkı ve gün farkı yakalanır", () => {
    const c = payslipCheck(slip({ overtime_by_pct: { "150": 1.5, "100": 2 }, unpaid_days: 3 }), ents, R);
    const bad = c.rows.filter((r) => !r.ok).map((r) => r.key);
    expect(bad).toEqual(["pct150", "unpaid"]);
    expect(c.status).toBe("other"); // toplam saat tutuyor, ayrıntılar tutmuyor
  });
  it("bordro 'raporlu (ücretsiz)' diyor ama ayar düşmüyorsa not düşer", () => {
    const c = payslipCheck(slip({ sick_unpaid_days: 1 }), ents, R);
    expect(c.rows.find((r) => r.key === "sick")?.note).toMatch(/Ayarlarda raporlu/);
  });
  it("net ödenen = maaş − kesinti + ek mesai − özel kesinti", () => {
    // maaş 30000, 1 gün devamsızlık (−1000), ek mesai (4x183.33x1.5 + 2x183.33), BES 500
    const earned = 4 * 183.33 * 1.5 + 2 * 183.33;
    const net = 30000 - 1000 + earned - 500;
    expect(payslipCheck(slip({ net_paid: net, special_deductions: 500 }), ents, R).rows.find((r) => r.key === "net")?.ok).toBe(true);
    expect(payslipCheck(slip({ net_paid: net + 500, special_deductions: 500 }), ents, R).rows.find((r) => r.key === "net")?.ok).toBe(false);
  });
  it("girilmeyen isteğe bağlı alanlar karşılaştırılmaz", () => {
    expect(payslipCheck(slip(), ents, R).rows.map((r) => r.key)).toEqual(["hours", "amount"]);
  });
});
