import type { Timesheet } from "@mesai/core/timesheet";
import { buildTimesheetSheet } from "@mesai/core/timesheet-sheet";

export { buildTimesheetSheet };

/** Çizelgeyi .xlsx dosyası olarak indirir (kütüphane yalnızca tıklanınca yüklenir). */
export async function downloadTimesheetXlsx(ts: Timesheet, month: Date, who: string) {
  const writeXlsxFile = (await import("write-excel-file/browser")).default;
  const { data, options, fileName } = buildTimesheetSheet(ts, month, who);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await writeXlsxFile(data as any, options as any).toFile(fileName);
}
