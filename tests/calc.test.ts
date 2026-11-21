import { describe, expect, it } from "vitest";
import { entryPay, goalProgress, hoursBetween, hrs, levelFor, monthSummary, overtimeAfter, salaryDeduction } from "../lib/calc";
import { SETTINGS as S, entry as E } from "./helpers";

describe("maaş kesintisi (maaş / 30)", () => {
  it("ücretsiz izin ve devamsızlık günü başına keser", () => {
    expect(salaryDeduction([E("2026-11-03", "absent"), E("2026-11-04", "unpaid_leave")], S)).toEqual({ days: 2, amount: 2000 });
  });
  it("aynı güne düşen birden çok kayıt tek gün sayılır", () => {
    expect(salaryDeduction([E("2026-11-03", "absent"), E("2026-11-03", "unpaid_leave")], S).days).toBe(1);
  });
  it("rapor ve ücretli izin kesmez", () => {
    expect(salaryDeduction([E("2026-11-03", "sick"), E("2026-11-04", "paid_leave")], S).amount).toBe(0);
  });
  it("kesinti maaşı geçmez", () => {
    const many = Array.from({ length: 40 }, (_, i) => E(`2026-12-${String(i + 1).padStart(2, "0")}`, "absent"));
    expect(salaryDeduction(many, S).amount).toBe(30000);
  });
});

describe("mesai kazancı", () => {
  it("hafta içi saatlik ücret", () => expect(entryPay(E("2026-11-03", "overtime", 2), S)).toBe(200));
  it("pazar çarpanı", () => expect(entryPay(E("2026-11-01", "overtime", 2), S)).toBe(400));
  it("tatil çarpanı", () => expect(entryPay(E("2026-10-29", "holiday", 3), S)).toBe(600));
  it("pazar ücreti TL olarak girilirse çarpan yerine o kullanılır", () => {
    expect(entryPay(E("2026-11-01", "overtime", 2), { ...S, sunday_rate: 250 })).toBe(500);
  });
  it("durum kayıtları ücret getirmez", () => expect(entryPay(E("2026-11-03", "absent", 0), S)).toBe(0));
});

describe("maaşa dahil mesai", () => {
  const S10 = { ...S, monthly_salary: 41281, included_overtime_hours: 10 };
  const ents = [E("2026-11-03", "overtime", 6), E("2026-11-04", "overtime", 8)];
  it("ilk 10 saat maaşın içindedir, yalnızca fazlası ücret getirir", () => {
    const m = monthSummary(ents, S10);
    expect([m.hours, m.includedHours, m.paidHours, m.earned]).toEqual([14, 10, 4, 400]);
  });
  it("0 iken eski davranış", () => expect(monthSummary(ents, S).earned).toBe(1400));
  it("saatler tarih sırasıyla tüketilir (girilme sırasına değil)", () => {
    expect(monthSummary([ents[1], ents[0]], S10).earned).toBe(400);
  });
  it("pazar çarpanı yalnızca ücretli kısma uygulanır", () => {
    expect(monthSummary([E("2026-11-01", "overtime", 12)], S10).earned).toBe(400);
  });
  it("kota dolmadıysa kalan kota hedef için gereken saate eklenir", () => {
    const g = goalProgress([E("2026-11-03", "overtime", 6)], { ...S10, monthly_goal_amount: 41481 });
    expect(Math.round((g.hoursNeeded - 6) * 100) / 100).toBe(6); // 2 ücretli saat + 4 saat kalan kota
  });
});

describe("hedef", () => {
  const ents = [E("2026-11-03", "overtime", 2), E("2026-11-04", "absent")];
  it("gelir = maaş − kesinti + mesai", () => {
    expect(goalProgress(ents, { ...S, monthly_goal_amount: 40000 }).income).toBe(30000 - 1000 + 200);
  });
  it("hedef yokken yüzde 0", () => expect(goalProgress(ents, S).percent).toBe(0));
  it("saat modu yüzdesi", () => {
    expect(goalProgress([E("2026-11-03", "overtime", 5)], { ...S, goal_mode: "hours", monthly_goal_hours: 20 }).percent).toBe(25);
  });
});

describe("saat biçimi ve seviye", () => {
  it("hrs en çok iki ondalık", () => { expect(hrs(2.25)).toBe("2.25 sa"); expect(hrs(6)).toBe("6 sa"); expect(hrs(2.5)).toBe("2.5 sa"); });
  it("seviye sınırları", () => {
    expect(levelFor(0).level).toBe(1); expect(levelFor(10).level).toBe(2); expect(levelFor(250).next).toBeUndefined();
  });
  it("çıkış saatine göre mesai", () => {
    expect(overtimeAfter("16:00", "19:30")).toBe(3.5);
    expect(overtimeAfter("16:00", "15:00")).toBe(0);
    expect(overtimeAfter("00:00", "03:00")).toBe(3);
    expect(hoursBetween("22:00", "06:00")).toBe(8);
  });
});
