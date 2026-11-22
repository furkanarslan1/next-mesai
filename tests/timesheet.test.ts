import { describe, expect, it } from "vitest";
import { addHours, buildTimesheet } from "../lib/timesheet";
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
    expect([sat.start, sat.normalHours, sat.status]).toEqual(["", 0, "Hafta sonu"]);
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
    expect([r.normalHours, r.overtimeHours, r.percent, r.start]).toEqual([0, 5, 100, ""]);
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

import { buildTimesheetSheet } from "../lib/timesheet-xlsx";
describe("Excel sayfa verisi", () => {
  const ents = [E("2026-11-03", "overtime", 2.5), E("2026-11-04", "absent"), E("2026-11-02", "paid_leave")];
  const ts = buildTimesheet(day("2026-11-10"), ents, { ...S, base_hourly_rate: 100, weekday_percent: 150 });
  const sheet = buildTimesheetSheet(ts, day("2026-11-10"), "Test Kişi");
  const val = (c: unknown) => (c && typeof c === "object" && "value" in c ? (c as { value: unknown }).value : c);
  it("başlık, sütun başlıkları ve ay günü kadar satır", () => {
    expect(String(val(sheet.data[0][0]))).toContain("Kasım 2026");
    expect(String(val(sheet.data[0][0]))).toContain("Test Kişi");
    expect(sheet.data[2].map(val)).toEqual(["Tarih", "Gün", "Giriş", "Çıkış", "Normal (saat)", "Mesai (saat)", "Mesai oranı", "Ücretli izin", "Ücretsiz izin", "Raporlu", "Gelmedi", "Resmi tatil", "Durum", "Not"]);
    expect(sheet.data.slice(3, 33)).toHaveLength(30);
  });
  it("günlük satır: tarih, giriş/çıkış, mesai ve oran", () => {
    const row = sheet.data[3 + 2].map(val); // 3 Kasım
    expect(row.slice(0, 7)).toEqual(["03.11.2026", "Salı", "07:30", "18:40", 8, 2.5, "%150"]);
  });
  it("durum sütunları ve toplam satırı", () => {
    expect(sheet.data[3 + 3].map(val)[10]).toBe(1); // 4 Kasım gelmedi
    expect(sheet.data[3 + 1].map(val)[7]).toBe(1); // 2 Kasım ücretli izin
    const total = sheet.data[33].map(val);
    expect([total[0], total[5], total[7], total[10]]).toEqual(["TOPLAM", 2.5, 1, 1]);
  });
  it("dosya adı ve sayfa ayarı", () => {
    expect(sheet.fileName).toBe("calisma-cizelgesi-2026-11.xlsx");
    expect(sheet.options.orientation).toBe("landscape");
  });
});
