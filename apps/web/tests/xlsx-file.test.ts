import { describe, expect, it } from "vitest";
import writeExcelFile from "write-excel-file/node";
import { buildTimesheet } from "@mesai/core/timesheet";
import { buildTimesheetSheet } from "../lib/timesheet-xlsx";
import { SETTINGS, day, entry as E } from "@mesai/core/test-helpers";

describe("gerçek .xlsx dosyası", () => {
  it("geçerli bir xlsx (zip) üretir ve içinde çizelge metinleri bulunur", async () => {
    const S = { ...SETTINGS, work_start: "07:30:00", work_end: "16:10:00", daily_hours: 8 };
    const ts = buildTimesheet(day("2026-11-10"), [E("2026-11-03", "overtime", 2.5), E("2026-11-04", "absent")], S);
    const { data, options } = buildTimesheetSheet(ts, day("2026-11-10"), "Test Kişi");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const buf = await writeExcelFile(data as any, options as any).toBuffer();
    expect(buf.length).toBeGreaterThan(2000);
    expect(buf.subarray(0, 2).toString()).toBe("PK"); // zip imzası
    const { unzipSync, strFromU8 } = await import("fflate");
    const files = unzipSync(new Uint8Array(buf));
    expect(Object.keys(files)).toEqual(expect.arrayContaining(["[Content_Types].xml", "xl/workbook.xml"]));
    const all = Object.entries(files).filter(([k]) => k.endsWith(".xml")).map(([, v]) => strFromU8(v)).join("\n");
    for (const needle of ["03.11.2026", "Gelmedi", "TOPLAM", "Çalışan imzası", "07:30", "18:40"]) expect(all).toContain(needle);
  });
});
