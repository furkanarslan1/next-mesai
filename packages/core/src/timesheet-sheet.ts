import { format } from "date-fns/format";
import { tr } from "date-fns/locale/tr";
import type { Timesheet } from "./timesheet";

/** Çizelgeyi Excel sayfa verisine çevirir (dosya yazmadan, test edilebilir). */
export function buildTimesheetSheet(ts: Timesheet, month: Date, who: string) {
  const head = ["Tarih", "Gün", "Giriş", "Çıkış", "Normal (saat)", "Mesai (saat)", "Mesai oranı", "Ücretli izin", "Ücretsiz izin", "Raporlu", "Gelmedi", "Resmi tatil", "Durum", "Not"];
  const bold = { fontWeight: "bold" as const, backgroundColor: "#dfe9f3" };
  const num = (v: number) => (v === 0 ? 0 : v);
  const data: unknown[][] = [
    [{ value: `Aylık Çalışma Çizelgesi · ${format(month, "LLLL yyyy", { locale: tr })}${who ? ` · ${who}` : ""}`, fontWeight: "bold", columnSpan: head.length }, ...Array(head.length - 1).fill(null)],
    [],
    head.map((h) => ({ value: h, ...bold, align: "center" as const })),
    ...ts.rows.map((r) => {
      const shade = r.weekend || r.holiday ? { backgroundColor: "#f1f3f5" } : {};
      return [
        { value: r.label, ...shade }, { value: r.dayName, ...shade }, { value: r.start, align: "center" as const, ...shade }, { value: r.end, align: "center" as const, ...shade },
        { value: num(r.normalHours), type: Number, align: "center" as const, ...shade }, { value: num(r.overtimeHours), type: Number, align: "center" as const, ...shade },
        { value: r.percent ? `%${r.percent}` : "", align: "center" as const, ...shade },
        { value: r.paidLeave, type: Number, align: "center" as const, ...shade }, { value: r.unpaidLeave, type: Number, align: "center" as const, ...shade },
        { value: r.sick, type: Number, align: "center" as const, ...shade }, { value: r.absent, type: Number, align: "center" as const, ...shade },
        { value: r.holiday, type: Number, align: "center" as const, ...shade }, { value: r.status, ...shade }, { value: r.note, ...shade },
      ];
    }),
    [
      { value: "TOPLAM", ...bold }, { value: "", ...bold }, { value: "", ...bold }, { value: "", ...bold },
      { value: ts.totals.normalHours, type: Number, ...bold, align: "center" as const }, { value: ts.totals.overtimeHours, type: Number, ...bold, align: "center" as const }, { value: "", ...bold },
      { value: ts.totals.paidLeave, type: Number, ...bold, align: "center" as const }, { value: ts.totals.unpaidLeave, type: Number, ...bold, align: "center" as const },
      { value: ts.totals.sick, type: Number, ...bold, align: "center" as const }, { value: ts.totals.absent, type: Number, ...bold, align: "center" as const },
      { value: ts.totals.holiday, type: Number, ...bold, align: "center" as const }, { value: "", ...bold }, { value: "", ...bold },
    ],
    [],
    [{ value: "Özet", fontWeight: "bold" }],
    [{ value: "Normal çalışma günü" }, null, null, null, { value: ts.totals.normalDays, type: Number }],
    [{ value: "Toplam mesai (saat)" }, null, null, null, { value: ts.totals.overtimeHours, type: Number }],
    ...(ts.totals.sickDeductedHours > 0 ? [[{ value: "Rapor düşümü (saat)" }, null, null, null, { value: -ts.totals.sickDeductedHours, type: Number }]] : []),
    [{ value: "Maaşa dahil mesai (saat)" }, null, null, null, { value: ts.totals.includedHours, type: Number }],
    [{ value: "Ücretli mesai (saat)" }, null, null, null, { value: ts.totals.paidOvertimeHours, type: Number }],
    ...Object.entries(ts.totals.overtimeByPercent).sort((a, b) => Number(a[0]) - Number(b[0])).map(([p, h]) => [{ value: `  Ek mesai %${p} (saat)` }, null, null, null, { value: h, type: Number }]),
    [],
    [{ value: "Çalışan imzası: ____________________" }, null, null, null, null, null, null, null, { value: "Onay (İK / Yönetici): ____________________" }],
  ];
  const widths = [12, 13, 8, 8, 13, 12, 12, 12, 13, 10, 10, 12, 34, 28];
  return {
    data,
    options: { columns: widths.map((width) => ({ width })), stickyRowsCount: 3, orientation: "landscape" as const, sheet: format(month, "LLLL yyyy", { locale: tr }) },
    fileName: `calisma-cizelgesi-${format(month, "yyyy-MM")}.xlsx`,
  };
}
