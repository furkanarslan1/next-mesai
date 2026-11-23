import { describe, expect, it } from "vitest";
import { addHours, buildTimesheet } from "../src/timesheet";
import { SETTINGS, day, entry as E } from "./helpers";

const S = { ...SETTINGS, daily_hours: 8, work_start: "07:30:00", work_end: "16:10:00" };

describe("çalışma çizelgesi", () => {
  it("saat toplama gece yarısını sarar", () => {
    expect(addHours("16:10", 2.5)).toBe("18:40");
    expect(addHours("22:00", 3)).toBe("01:00");
  });
  it("ayın her günü için bir satır", () => {
    expect(buildTimesheet(day("2026-11-10"), [], S).rows).toHaveLength(30);
    expect(buildTimesheet(day("2026-02-10"), [], S).rows).toHaveLength(28);
  });
  it("normal hafta içi gün: giriş/çıkış çalışma saatinden, mesai 0", () => {
    const r = buildTimesheet(day("2026-11-10"), [], S).rows.find((x) => x.date === "2026-11-03")!; // Salı
    expect([r.start, r.end, r.normalHours, r.overtimeHours, r.weekend]).toEqual(["07:30", "16:10", 8, 0, false]);
    expect(r.dayName).toBe("Salı");
  });
  it("hafta sonu boş, kayıtsız günler 'normal sayma' kapalıyken de boş", () => {
    const rows = buildTimesheet(day("2026-11-10"), [], S).rows;
    const sat = rows.find((x) => x.date === "2026-11-07")!;
    expect([sat.start, sat.normalHours, sat.status]).toEqual(["", 0, "Hafta tatili"]);
    const off = buildTimesheet(day("2026-11-10"), [], S, { assumeWorkdays: false }).rows.find((x) => x.date === "2026-11-03")!;
    expect([off.start, off.normalHours]).toEqual(["", 0]);
  });
  it("mesai olan günde çıkış mesai kadar uzar ve oran yazılır", () => {
    const ts = buildTimesheet(day("2026-11-10"), [E("2026-11-03", "overtime", 2.5)], { ...S, base_hourly_rate: 100, weekday_percent: 150 });
    const r = ts.rows.find((x) => x.date === "2026-11-03")!;
    expect([r.end, r.overtimeHours, r.percent]).toEqual(["18:40", 2.5, 150]);
    expect(ts.totals.overtimeHours).toBe(2.5);
  });
  it("kayıttaki çıkış saati varsa o kullanılır", () => {
    const e = { ...E("2026-11-03", "overtime", 2), start_time: "16:10:00", end_time: "18:10:00" };
    expect(buildTimesheet(day("2026-11-10"), [e], S).rows.find((x) => x.date === "2026-11-03")!.end).toBe("18:10");
  });
  it("pazar mesaisi: normal saat 0, mesai ve %oran var", () => {
    const r = buildTimesheet(day("2026-11-10"), [E("2026-11-01", "overtime", 5)], { ...S, sunday_percent: 100 }).rows.find((x) => x.date === "2026-11-01")!;
    // Giriş normal girişten, çıkış giriş + mesai süresinden yazılır (çizelgede boş kalmaz)
    expect([r.normalHours, r.overtimeHours, r.percent, r.start, r.end]).toEqual([0, 5, 100, "07:30", "12:30"]);
  });
  it("izin, rapor ve gelmedi günlerinde saatler boş, ilgili sütun 1", () => {
    const ts = buildTimesheet(day("2026-11-10"), [E("2026-11-02", "paid_leave"), E("2026-11-03", "sick"), E("2026-11-04", "absent"), E("2026-11-05", "unpaid_leave")], S);
    const get = (d: string) => ts.rows.find((x) => x.date === d)!;
    expect([get("2026-11-02").paidLeave, get("2026-11-03").sick, get("2026-11-04").absent, get("2026-11-05").unpaidLeave]).toEqual([1, 1, 1, 1]);
    expect(get("2026-11-02").start).toBe("");
    expect(get("2026-11-04").status).toBe("Gelmedi");
    expect([ts.totals.paidLeave, ts.totals.sick, ts.totals.absent, ts.totals.unpaidLeave]).toEqual([1, 1, 1, 1]);
  });
  it("resmi tatil günü boş ve işaretli (29 Ekim)", () => {
    const r = buildTimesheet(day("2026-10-10"), [], S).rows.find((x) => x.date === "2026-10-29")!;
    expect([r.holiday, r.start, r.status]).toEqual([1, "", "Resmi tatil (Cumhuriyet Bayramı)"]);
  });
  it("toplamlar: normal gün sayısı ve ücretli mesai (maaşa dahil düşülür)", () => {
    const ts = buildTimesheet(day("2026-11-10"), [E("2026-11-03", "overtime", 6), E("2026-11-04", "overtime", 8)], { ...S, included_overtime_hours: 10.5 });
    expect(ts.totals.overtimeHours).toBe(14);
    expect(ts.totals.includedHours).toBe(10.5);
    expect(ts.totals.paidOvertimeHours).toBe(3.5);
    expect(ts.totals.normalDays).toBe(21); // Kasım 2026: 30 gün - 9 hafta sonu = 21 hafta içi, resmi tatil yok
  });
  it("giriş/çıkış ayarı yoksa saatler boş kalır, normal saat sayılır", () => {
    const r = buildTimesheet(day("2026-11-10"), [], { ...S, work_start: null, work_end: null }).rows.find((x) => x.date === "2026-11-03")!;
    expect([r.start, r.end, r.normalHours]).toEqual(["", "", 8]);
  });
});

describe("cumartesi ayarı", () => {
  const S6 = { ...SETTINGS, daily_hours: 8, work_start: "08:00:00", work_end: "16:00:00" };
  it("cumartesi tatilse (varsayılan) boş kalır", () => {
    const r = buildTimesheet(day("2026-11-10"), [], { ...S6, saturday_off: true }).rows.find((x) => x.date === "2026-11-07")!;
    expect([r.weekend, r.normalHours, r.status]).toEqual([true, 0, "Hafta tatili"]);
  });
  it("cumartesi iş günüyse normal çalışma sayılır", () => {
    const r = buildTimesheet(day("2026-11-10"), [], { ...S6, saturday_off: false }).rows.find((x) => x.date === "2026-11-07")!;
    expect([r.weekend, r.normalHours, r.start, r.end]).toEqual([false, 8, "08:00", "16:00"]);
  });
  it("pazar her zaman tatil", () => {
    const r = buildTimesheet(day("2026-11-10"), [], { ...S6, saturday_off: false }).rows.find((x) => x.date === "2026-11-08")!;
    expect(r.weekend).toBe(true);
  });
});
