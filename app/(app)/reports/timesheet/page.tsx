"use client";

import { useState } from "react";
import { addMonths, format, startOfMonth } from "date-fns";
import { tr } from "date-fns/locale";
import { ChevronLeft, ChevronRight, FileSpreadsheet, FileText } from "lucide-react";
import { toast } from "sonner";
import { useToday } from "@/lib/now";
import { errorText } from "@/lib/errors";
import { monthKey, useMonthEntries, useProfile, useSettings } from "@/lib/store";
import { hrs } from "@/lib/calc";
import { buildTimesheet } from "@/lib/timesheet";
import { downloadTimesheetXlsx } from "@/lib/timesheet-xlsx";
import { SwitchRow, FormSection } from "@/components/mesai/ios-form";
import { Button } from "@/components/ui/button";
import { Page } from "@/components/mesai/page";

export default function TimesheetPage() {
  const today = useToday();
  const settings = useSettings();
  if (!today || !settings) return <div className="glass min-h-[28rem] w-full animate-pulse" aria-busy />;
  return <TimesheetView today={today} />;
}

function TimesheetView({ today }: { today: Date }) {
  const [month, setMonth] = useState(startOfMonth(today));
  const [assume, setAssume] = useState(true);
  const [busy, setBusy] = useState(false);
  const profile = useProfile();
  const settings = useSettings()!;
  const entries = useMonthEntries(monthKey(month));
  if (!entries) return <div className="glass min-h-[28rem] w-full animate-pulse" aria-busy />;

  const ts = buildTimesheet(month, entries, settings, { assumeWorkdays: assume });
  const monthName = format(month, "LLLL yyyy", { locale: tr });
  const who = profile?.full_name ?? "";
  const noSchedule = !settings.work_start || !settings.work_end;
  const cell = "px-1 py-1.5 text-center tabular-nums";

  async function xlsx() {
    setBusy(true);
    try { await downloadTimesheetXlsx(ts, month, who); toast.success("Excel dosyası hazırlandı"); }
    catch (e) { toast.error(errorText(e, "Excel dosyası oluşturulamadı")); }
    finally { setBusy(false); }
  }

  return (
    <Page title="Çalışma çizelgesi" back={{ href: "/reports", label: "Raporlar" }}>

      <div className="no-print flex items-center justify-between">
        <Button size="icon" variant="secondary" aria-label="Önceki ay" onClick={() => setMonth(addMonths(month, -1))}><ChevronLeft /></Button>
        <p className="text-lg font-bold capitalize">{monthName}</p>
        <Button size="icon" variant="secondary" aria-label="Sonraki ay" onClick={() => setMonth(addMonths(month, 1))}><ChevronRight /></Button>
      </div>

      <div className="no-print space-y-4">
        <FormSection footer="Uygulama her günün giriş/çıkışını ayrıca tutmaz: normal günlerde giriş/çıkış çalışma saatinden, mesai olan günlerde çıkış mesai kadar uzatılarak yazılır.">
          <SwitchRow label="Kayıtsız hafta içi günler normal çalışma sayılsın" hint={settings.saturday_off ?? true ? "Cumartesi, pazar ve resmi tatiller boş kalır" : "Pazar ve resmi tatiller boş kalır (cumartesi iş günü)"} checked={assume} onChange={setAssume} />
        </FormSection>
        {noSchedule && <p className="rounded-[var(--r-md)] bg-muted px-4 py-3 text-sm text-muted-foreground">Giriş/çıkış saatleri boş görünüyor. Profil sayfasında çalışma saatini kaydedersen çizelgede dolu çıkar.</p>}
        <div className="grid grid-cols-2 gap-3">
          <Button className="h-14 text-base font-semibold" onClick={xlsx} disabled={busy}><FileSpreadsheet className="size-5" />Excel (.xlsx)</Button>
          <Button variant="secondary" className="h-14 text-base font-semibold" onClick={() => window.print()}><FileText className="size-5" />PDF</Button>
        </div>
        <p className="text-center text-xs text-muted-foreground">PDF için açılan pencerede &quot;PDF olarak kaydet&quot; (iPhone&apos;da paylaş → Yazdır → PDF) seç.</p>
      </div>

      <section className="timesheet rounded-[var(--r-lg)] bg-card p-3 sm:p-4" aria-label="Çalışma çizelgesi">
        <header className="mb-3 space-y-0.5">
          <h2 className="text-lg font-bold capitalize">Aylık Çalışma Çizelgesi · {monthName}</h2>
          <p className="text-sm text-muted-foreground">
            {who && <>Çalışan: <b className="text-foreground">{who}</b> · </>}
            Normal çalışma: {settings.work_start && settings.work_end ? `${settings.work_start.slice(0, 5)}–${settings.work_end.slice(0, 5)}` : "-"} ({hrs(settings.daily_hours)}/gün)
          </p>
        </header>

        <div className="overflow-x-auto">
          <table className="timesheet-table w-full min-w-[40rem] border-collapse text-[11px] sm:text-xs">
            <thead>
              <tr className="bg-muted text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {["Tarih", "Gün", "Giriş", "Çıkış", "Norm.", "Mesai", "Oran", "Ü.izin", "Üc.siz", "Rapor", "Gelm.", "Tatil"].map((h) => <th key={h} className={cell}>{h}</th>)}
                <th className="min-w-[7rem] px-1.5 py-1.5 text-left">Durum / Not</th>
              </tr>
            </thead>
            <tbody>
              {ts.rows.map((r) => (
                <tr key={r.date} className={`border-t border-border/60 ${r.weekend || r.holiday ? "bg-muted/60 text-muted-foreground" : ""}`}>
                  <td className={cell}>{r.label}</td>
                  <td className="px-1 py-1.5">{r.dayName}</td>
                  <td className={cell}>{r.start || "-"}</td>
                  <td className={cell}>{r.end || "-"}</td>
                  <td className={cell}>{r.normalHours || 0}</td>
                  <td className={`${cell} ${r.overtimeHours > 0 ? "font-bold text-foreground" : ""}`}>{+r.overtimeHours.toFixed(2)}</td>
                  <td className={cell}>{r.percent ? `%${r.percent}` : "-"}</td>
                  <td className={cell}>{r.paidLeave}</td><td className={cell}>{r.unpaidLeave}</td><td className={cell}>{r.sick}</td><td className={cell}>{r.absent}</td><td className={cell}>{r.holiday}</td>
                  <td className="px-1.5 py-1.5 leading-tight">{[r.status, r.note].filter(Boolean).join(" · ")}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-border bg-muted font-bold">
                <td className={cell} colSpan={4}>TOPLAM</td>
                <td className={cell}>{ts.totals.normalHours}</td><td className={cell}>{ts.totals.overtimeHours}</td><td className={cell}>-</td>
                <td className={cell}>{ts.totals.paidLeave}</td><td className={cell}>{ts.totals.unpaidLeave}</td><td className={cell}>{ts.totals.sick}</td><td className={cell}>{ts.totals.absent}</td><td className={cell}>{ts.totals.holiday}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-4">
          <div><dt className="text-xs text-muted-foreground">Normal çalışma günü</dt><dd className="font-semibold tabular-nums">{ts.totals.normalDays}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Toplam mesai</dt><dd className="font-semibold tabular-nums">{hrs(ts.totals.overtimeHours)}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Maaşa dahil mesai</dt><dd className="font-semibold tabular-nums">{hrs(ts.totals.includedHours)}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Ücretli mesai</dt><dd className="font-semibold tabular-nums">{hrs(ts.totals.paidOvertimeHours)}</dd></div>
          {Object.entries(ts.totals.overtimeByPercent).sort((a, b) => Number(a[0]) - Number(b[0])).map(([p, h]) => (
            <div key={p}><dt className="text-xs text-muted-foreground">Ek mesai %{p}</dt><dd className="font-semibold tabular-nums">{hrs(h)}</dd></div>
          ))}
        </dl>

        <div className="mt-8 grid grid-cols-2 gap-10 text-sm">
          <div className="border-t border-foreground/40 pt-1 text-center text-xs text-muted-foreground">Çalışan imzası</div>
          <div className="border-t border-foreground/40 pt-1 text-center text-xs text-muted-foreground">Onay (İK / Yönetici)</div>
        </div>
      </section>
    </Page>
  );
}
