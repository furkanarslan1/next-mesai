import { describe, expect, it } from "vitest";
import { baseRate, entryPay, goalProgress, hoursBetween, hrs, levelFor, monthSummary, overtimeAfter, paidHoursByPercent, salaryDeduction } from "../src/calc";
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
  it("hrs en çok iki ondalık", () => { expect(hrs(2.25)).toBe("2,25 sa"); expect(hrs(6)).toBe("6 sa"); expect(hrs(2.5)).toBe("2,5 sa"); });
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

describe("mesai oranları (%)", () => {
  // Gerçek bordro yapısı: %100 saatlik ücret x oran; hafta içi %150, pazar %100, tatil %200
  const R = { ...S, base_hourly_rate: 183.33, weekday_percent: 150, sunday_percent: 100, holiday_percent: 200 };
  it("hafta içi %150, pazar %100, tatil %200", () => {
    expect(entryPay(E("2026-11-03", "overtime", 2), R)).toBeCloseTo(2 * 183.33 * 1.5, 5); // Salı
    expect(entryPay(E("2026-11-01", "overtime", 2), R)).toBeCloseTo(2 * 183.33, 5); // Pazar
    expect(entryPay(E("2026-10-29", "holiday", 2), R)).toBeCloseTo(2 * 183.33 * 2, 5);
  });
  it("oran değişince (%125) kazanç değişir", () => {
    expect(entryPay(E("2026-11-03", "overtime", 4), { ...R, weekday_percent: 125 })).toBeCloseTo(4 * 183.33 * 1.25, 5);
  });
  it("özel oran (örn. %175)", () => {
    expect(entryPay(E("2026-11-03", "overtime", 2), { ...R, weekday_percent: 175 })).toBeCloseTo(2 * 183.33 * 1.75, 5);
  });
  it("eski kayıt: taban ücret yoksa eski saatlik ücret hafta içi mesai ücretidir", () => {
    const legacy = { ...R, base_hourly_rate: null, hourly_rate: 275 };
    expect(entryPay(E("2026-11-03", "overtime", 2), legacy)).toBeCloseTo(550, 5); // eski davranış: 2 x 275
    expect(baseRate(legacy)).toBeCloseTo(275 / 1.5, 5);
  });
  it("pazar/tatil için sabit TL ücret oranı geçersiz kılar", () => {
    expect(entryPay(E("2026-11-01", "overtime", 2), { ...R, sunday_rate: 300 })).toBe(600);
    expect(entryPay(E("2026-10-29", "holiday", 2), { ...R, holiday_rate: 400 })).toBe(800);
  });
  it("oran başına ücretli saat, maaşa dahil saati düşer", () => {
    const S105 = { ...R, included_overtime_hours: 10.5 };
    const ents = [E("2026-11-03", "overtime", 6), E("2026-11-04", "overtime", 6), E("2026-11-01", "overtime", 8)]; // pazar 1 Kasım ilk sıra
    // sıra: 1 Kasım (pazar, 8 sa) -> 8 dahil; 3 Kasım (6) -> 2.5 dahil, 3.5 ücretli; 4 Kasım (6) ücretli
    expect(paidHoursByPercent(ents, S105)).toEqual({ "150": 9.5 });
  });
  it("gerçek bordro örneği: 27.5 sa hafta içi %150 + 10.5 sa pazar %100 = net 9494.73", () => {
    const B = { ...S, base_hourly_rate: 183.47, weekday_percent: 150, sunday_percent: 100, holiday_percent: 200 };
    // 11 hafta içi gün x 2.5 sa (Ekim 2026) + 2 pazar x 5.25 sa
    const weekdays = ["05", "06", "07", "08", "09", "12", "13", "14", "15", "16", "19"].map((d) => E(`2026-10-${d}`, "overtime", 2.5));
    const sundays = [E("2026-10-04", "overtime", 5.25), E("2026-10-11", "overtime", 5.25)];
    const m = monthSummary([...weekdays, ...sundays], B);
    expect(m.hours).toBeCloseTo(38, 5);
    expect(Math.abs(m.earned - 9494.73)).toBeLessThan(1);
    expect(paidHoursByPercent([...weekdays, ...sundays], B)).toEqual({ "150": 27.5, "100": 10.5 });
  });
});

describe("raporlu gün kesintisi (ayar)", () => {
  const ents = [E("2026-11-03", "sick"), E("2026-11-04", "sick"), E("2026-11-05", "absent")];
  it("varsayılan: raporlu kesmez", () => expect(salaryDeduction(ents, S).days).toBe(1));
  it("ayar açıksa raporlu günler de maaş / 30 kesilir", () => {
    expect(salaryDeduction(ents, { ...S, sick_leave_unpaid: true })).toEqual({ days: 3, amount: 3000 });
  });
});

describe("raporlu gün mesaiden düşer (ayar)", () => {
  // S: günlük 8 sa, hafta içi %100 (100 ₺), pazar/tatil %200
  const D = { ...S, sick_deducts_overtime: true };
  const ents = [
    E("2026-11-01", "overtime", 6), // Pazar
    E("2026-11-03", "overtime", 5), // Salı
    E("2026-11-04", "overtime", 4), // Çarşamba
    E("2026-11-10", "sick"), E("2026-11-10", "sick"), // aynı gün iki kayıt: tek gün
  ];
  it("kapalıyken mesai değişmez", () => {
    const m = monthSummary(ents, S);
    expect(m.hours).toBe(15); expect(m.sickHours).toBe(0);
  });
  it("açıkken raporlu gün başına günlük saat düşer, önce hafta içi mesaiden", () => {
    const m = monthSummary(ents, D);
    expect(m.grossHours).toBe(15); expect(m.sickDays).toBe(1); expect(m.sickHours).toBe(8);
    expect(m.hours).toBe(7);
    // 5 + 4 hafta içi saatin 8'i düşer, 1 sa hafta içi (100 ₺) + 6 sa pazar (200 ₺) kalır
    expect(m.earned).toBe(100 + 6 * 200);
    expect(paidHoursByPercent(ents, D)).toEqual({ "100": 1, "200": 6 });
  });
  it("mesai sıfırın altına inmez", () => {
    const m = monthSummary([E("2026-11-03", "overtime", 3), E("2026-11-05", "sick"), E("2026-11-06", "sick")], D);
    expect(m.hours).toBe(0); expect(m.sickHours).toBe(3); expect(m.earned).toBe(0);
  });
  it("saat hedefi net mesaiye göre ilerler", () => {
    expect(goalProgress(ents, { ...D, goal_mode: "hours", monthly_goal_hours: 14 }).percent).toBe(50);
  });
});

describe("hedef için kalan mesai", () => {
  it("tutar hedefi: kalan tutar ücretli saate çevrilir, dolmamış dahil saatler eklenir", () => {
    // 10 sa dahil, 9 sa yapılmış (hepsi dahil): 1 sa daha dahil + kalan tutar / saatlik
    const s = { ...S, included_overtime_hours: 10, monthly_goal_amount: 30500 };
    const g = goalProgress([E("2026-11-03", "overtime", 9)], s);
    expect(g.hoursDone).toBe(9);
    expect(g.hoursLeft).toBeCloseTo(1 + 500 / 100, 6);
    expect(g.hoursNeeded).toBeCloseTo(9 + g.hoursLeft, 6);
  });
  it("saat hedefi ve tamamlanan hedef", () => {
    const h = { ...S, goal_mode: "hours" as const, monthly_goal_hours: 20 };
    expect(goalProgress([E("2026-11-03", "overtime", 5)], h).hoursLeft).toBe(15);
    expect(goalProgress([E("2026-11-03", "overtime", 25)], h).hoursLeft).toBe(0);
  });
});

