import { describe, expect, it } from "vitest";
import { buildTimesheet } from "@mesai/core/timesheet";
import { SETTINGS, day, entry as E } from "@mesai/core/test-helpers";
import { buildTimesheetSheet } from "../lib/timesheet-xlsx";

const S = { ...SETTINGS, daily_hours: 8, work_start: "07:30:00", work_end: "16:10:00" };

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
