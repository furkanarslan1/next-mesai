"use client";

import { errorText } from "@/lib/errors";
import { useState } from "react";
import { addMonths, format, parseISO, startOfMonth } from "date-fns";
import { tr } from "date-fns/locale";
import { ArrowDownRight, ArrowUpRight, FileText, Minus, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useToday } from "@/lib/now";
import { mutate, useEntriesMap, usePayslips, useProfile, useSettings, useTotalHours } from "@/lib/store";
import { hrs, money } from "@/lib/calc";
import { annualLeave, change, keyOf, lastMonths, leaveByTenure, monthStats, payslipCheck } from "@/lib/reports";
import { BADGES, earnedBadges, streaks } from "@/lib/badges";
import { download, toCSV } from "@/lib/backup";
import type { Payslip, Settings } from "@/lib/types";
import { BadgeIcon } from "@/components/mesai/badge-icon";
import { PayslipSheet } from "@/components/mesai/payslip-sheet";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";

function Delta({ cur: c, prev: p, fmt }: { cur: number; prev: number; fmt: (n: number) => string }) {
  const { delta, pct } = change(c, p);
  const Icon = delta > 0 ? ArrowUpRight : delta < 0 ? ArrowDownRight : Minus;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${delta > 0 ? "text-emerald-600" : delta < 0 ? "text-destructive" : "text-muted-foreground"}`}>
      <Icon className="size-3.5" />{fmt(Math.abs(delta))}{pct !== null && ` (%${Math.round(Math.abs(pct))})`}
    </span>
  );
}

export default function ReportsPage() {
  const today = useToday();
  const settings = useSettings();
  if (!today || !settings) return <div className="glass min-h-[28rem] w-full animate-pulse" aria-busy />;
  return <ReportsView today={today} settings={settings} />;
}

function ReportsView({ today, settings }: { today: Date; settings: Settings }) {
  const profile = useProfile();
  const userId = profile?.id ?? "";
  const payslips = usePayslips();
  const totalHours = useTotalHours() ?? 0;
  const cur = settings.currency;
  const [metric, setMetric] = useState<"hours" | "income">("hours");
  const [sheet, setSheet] = useState<{ item: Payslip | null; del?: boolean } | null>(null);

  // Grafik için son 6 ay, yıllık özet/izin için yılın tüm ayları, bordrolu aylar
  const six = lastMonths(today, 6);
  const year = today.getFullYear();
  const yearMonths = Array.from({ length: today.getMonth() + 1 }, (_, i) => new Date(year, i, 1));
  const slipKeys = (payslips ?? []).map((p) => p.month.slice(0, 7));
  const keys = [...new Set([...six.map(keyOf), ...yearMonths.map(keyOf), ...slipKeys])];
  const byMonth = useEntriesMap(keys);
  // Kaydı olmayan ay "veri yok" sayılır (uygulama kullanılmadan önceki aylar tam maaş gibi görünmesin)
  const ZERO = { hours: 0, earned: 0, deduction: 0, absentDays: 0, salaryNet: 0, income: 0, workDays: 0 };
  const statsOf = (k: string) => ((byMonth[k]?.length ?? 0) > 0 ? monthStats(byMonth[k], settings) : ZERO);

  const series = six.map((d) => ({ d, key: keyOf(d), s: statsOf(keyOf(d)) }));
  const value = (s: ReturnType<typeof monthStats>) => (metric === "hours" ? s.hours : s.income);
  const max = Math.max(1, ...series.map((x) => value(x.s)));
  const curStats = statsOf(keyOf(today));
  const prevStats = statsOf(keyOf(addMonths(startOfMonth(today), -1)));

  const ytd = yearMonths.map((d) => ({ d, s: statsOf(keyOf(d)) }));
  const ytdHours = ytd.reduce((a, x) => a + x.s.hours, 0);
  const ytdIncome = ytd.reduce((a, x) => a + x.s.income, 0);
  const activeMonths = ytd.filter((x) => (byMonth[keyOf(x.d)]?.length ?? 0) > 0).length;
  const best = ytd.reduce((b, x) => (x.s.hours > b.s.hours ? x : b), ytd[0]);

  const leave = annualLeave(byMonth, year, settings.annual_leave_days);
  const [leaveInput, setLeaveInput] = useState(String(settings.annual_leave_days));
  const earned = earnedBadges(byMonth, settings, totalHours, today);
  const st = streaks(Object.values(byMonth).flat(), today);

  async function saveLeave() {
    const n = Math.round(Number(leaveInput));
    if (!(n >= 0 && n <= 60) || !userId) return;
    try { await mutate.saveSettings(userId, { annual_leave_days: n }); toast.success("Yıllık izin hakkı kaydedildi"); }
    catch (e) { toast.error(errorText(e, "Kaydedilemedi")); }
  }
  function exportCsv() {
    const rows = ytd.map(({ d, s }) => ({ ay: format(d, "yyyy-MM"), mesai_saat: s.hours, mesai_kazanc: Math.round(s.earned), maas_kesinti: Math.round(s.deduction), toplam_gelir: Math.round(s.income), mesai_gunu: s.workDays }));
    download(`rapor-${year}.csv`, toCSV(rows), "text/csv");
  }

  const slipMonths = lastMonths(today, 12).reverse();
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Raporlar</h1>
        <div className="no-print flex gap-2">
          <Button size="sm" variant="secondary" onClick={exportCsv}>CSV</Button>
          <Button size="sm" variant="secondary" onClick={() => window.print()}><FileText className="size-4" />PDF</Button>
        </div>
      </div>

      <Card><CardContent className="space-y-4">
        <h2 className="font-semibold">Bu ay · geçen aya göre</h2>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Mesai saati", v: hrs(curStats.hours), d: <Delta cur={curStats.hours} prev={prevStats.hours} fmt={hrs} /> },
            { label: "Toplam gelir", v: money(curStats.income, cur), d: <Delta cur={curStats.income} prev={prevStats.income} fmt={(n) => money(n, cur)} /> },
          ].map((t) => (
            <div key={t.label} className="r-md bg-muted px-3 py-3 text-center">
              <p className="text-xs text-muted-foreground">{t.label}</p>
              <p className="text-xl font-bold tabular-nums">{t.v}</p>
              {t.d}
            </div>
          ))}
        </div>
      </CardContent></Card>

      <Card><CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-semibold">Son 6 ay</h2>
          <div className="no-print grid grid-cols-2 gap-1 rounded-full bg-muted p-1 text-xs font-semibold" role="radiogroup" aria-label="Gösterge">
            {(["hours", "income"] as const).map((m) => (
              <button key={m} type="button" role="radio" aria-checked={metric === m} onClick={() => setMetric(m)}
                className={`rounded-full px-3 py-1.5 transition ${metric === m ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
                {m === "hours" ? "Mesai" : "Gelir"}
              </button>
            ))}
          </div>
        </div>
        <div className="flex h-44 items-end gap-2.5" role="img" aria-label="Aylara göre grafik">
          {series.map(({ d, key, s }) => {
            const v = value(s);
            const isCur = key === keyOf(today);
            return (
              <div key={key} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
                <span className="text-[10px] font-semibold tabular-nums text-muted-foreground">{v > 0 ? (metric === "hours" ? +v.toFixed(1) : `${Math.round(v / 1000)}b`) : ""}</span>
                <div className="w-full rounded-t-xl" style={{ height: `${Math.max(v > 0 ? 6 : 2, (v / max) * 100)}%`, background: isCur ? "var(--teal)" : "color-mix(in oklch, var(--teal) 38%, transparent)" }} />
                <span className="text-[11px] capitalize text-muted-foreground">{format(d, "LLL", { locale: tr })}</span>
              </div>
            );
          })}
        </div>
      </CardContent></Card>

      <Card><CardContent className="space-y-3">
        <h2 className="font-semibold">{year} yılı özeti</h2>
        <div className="grid grid-cols-3 gap-2.5 text-center">
          {[
            { label: "Toplam mesai", v: hrs(ytdHours) },
            { label: "Toplam gelir", v: money(ytdIncome, cur) },
            { label: "Aylık ortalama", v: money(activeMonths ? ytdIncome / activeMonths : 0, cur) },
          ].map((t) => (
            <div key={t.label} className="r-md bg-muted px-2 py-3">
              <p className="text-base font-bold tabular-nums leading-tight">{t.v}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">{t.label}</p>
            </div>
          ))}
        </div>
        {best && best.s.hours > 0 && <p className="text-center text-xs text-muted-foreground">En yoğun ay: <b className="capitalize text-foreground">{format(best.d, "LLLL", { locale: tr })}</b> ({hrs(best.s.hours)})</p>}
      </CardContent></Card>

      <Card><CardContent className="space-y-3">
        <h2 className="font-semibold">Yıllık izin</h2>
        <div className="flex items-baseline justify-between">
          <p className="text-4xl font-bold tabular-nums">{leave.left}<span className="ml-1 text-base font-medium text-muted-foreground">gün kaldı</span></p>
          <p className="text-sm text-muted-foreground tabular-nums">{leave.used} / {settings.annual_leave_days} kullanıldı</p>
        </div>
        <Progress value={settings.annual_leave_days > 0 ? Math.min(100, (leave.used / settings.annual_leave_days) * 100) : 0} />
        {leave.over > 0 && <p className="text-xs text-destructive">Hakkını {leave.over} gün aştın.</p>}
        <p className="text-xs text-muted-foreground">Takvimde &quot;Ücretli izin&quot; olarak işaretlediğin günler sayılır.</p>
        <div className="no-print flex gap-2">
          <Input type="number" inputMode="numeric" min="0" max="60" value={leaveInput} onChange={(e) => setLeaveInput(e.target.value)} aria-label="Yıllık izin hakkı (gün)" />
          <Button variant="secondary" onClick={saveLeave} disabled={Number(leaveInput) === settings.annual_leave_days}>Hakkı kaydet</Button>
        </div>
        <p className="text-xs text-muted-foreground">Yasal asgari hak: 1–5 yıl {leaveByTenure(1)} gün, 5–15 yıl {leaveByTenure(5)} gün, 15 yıl ve üzeri {leaveByTenure(15)} gün.</p>
      </CardContent></Card>

      <Card><CardContent className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">Bordro kontrolü</h2>
            <p className="text-xs text-muted-foreground">Bordrodaki mesai, uygulamanın hesabıyla aynı mı?</p>
          </div>
          <Button size="sm" className="no-print" disabled={!userId} onClick={() => setSheet({ item: null })}><Plus className="size-4" />Ekle</Button>
        </div>
        {payslips === null && <div className="glass r-lg h-16 animate-pulse" aria-busy />}
        {payslips?.length === 0 && <p className="r-lg bg-muted px-4 py-4 text-center text-sm text-muted-foreground">Henüz bordro eklemedin.</p>}
        {(payslips ?? []).map((p) => {
          const c = payslipCheck(p, byMonth[p.month.slice(0, 7)] ?? [], settings);
          const tone = c.status === "ok" ? "text-emerald-600" : "text-destructive";
          return (
            <div key={p.id} className="r-lg flex items-stretch gap-1 bg-muted pr-2">
            <button type="button" onClick={() => setSheet({ item: p })} className="min-w-0 flex-1 space-y-1.5 py-3 pl-4 text-left transition active:scale-[0.98]">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold capitalize">{format(parseISO(p.month), "LLLL yyyy", { locale: tr })}</span>
                <span className={`text-sm font-semibold ${tone}`}>
                  {c.status === "ok" ? "Uyumlu" : c.status === "missing" ? `${hrs(Math.abs(c.hoursDiff))} eksik ödenmiş olabilir` : `${hrs(c.hoursDiff)} fazla yazılmış`}
                </span>
              </div>
              <p className="text-xs text-muted-foreground tabular-nums">
                Bordro {hrs(p.paid_hours)} · {money(p.paid_amount, cur)} &nbsp;|&nbsp; Uygulama {hrs(c.appHours)} · {money(c.appAmount, cur)}
                {c.status !== "ok" && <> &nbsp;|&nbsp; Tutar farkı {c.amountDiff > 0 ? "+" : ""}{money(c.amountDiff, cur)}</>}
              </p>
            </button>
            <button type="button" aria-label="Bordroyu sil" onClick={() => setSheet({ item: p, del: true })} className="no-print my-2 grid w-10 shrink-0 place-items-center rounded-full bg-destructive text-white transition hover:bg-destructive/90 active:scale-90"><Trash2 className="size-4" /></button>
            </div>
          );
        })}
        <p className="text-xs text-muted-foreground">Tutar karşılaştırması, saatlik ücretini bordrodakiyle aynı varsayar; brüt/net farkı yüzünden küçük sapmalar olabilir. Saat farkı daha güvenilir göstergedir.</p>
      </CardContent></Card>

      <Card><CardContent className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="font-semibold">Başarılar</h2>
          <span className="text-xs text-muted-foreground">{earned.size} / {BADGES.length} · seri {st.current} gün (en iyi {st.best})</span>
        </div>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {BADGES.map((b) => (
            <div key={b.key} className="flex flex-col items-center gap-1.5 text-center">
              <BadgeIcon badge={b.key} earned={earned.has(b.key)} />
              <p className={`text-xs font-semibold leading-tight ${earned.has(b.key) ? "" : "text-muted-foreground"}`}>{b.title}</p>
              {!earned.has(b.key) && <p className="text-[10px] leading-tight text-muted-foreground">{b.hint}</p>}
            </div>
          ))}
        </div>
      </CardContent></Card>

      {sheet && userId && (
        <PayslipSheet key={`${sheet.item?.id ?? "new"}${sheet.del ? "-del" : ""}`} userId={userId} months={slipMonths} item={sheet.item} startInDelete={sheet.del} existingMonths={slipKeys} defaultMonth={keyOf(addMonths(startOfMonth(today), -1))} onClose={() => setSheet(null)} />
      )}
    </div>
  );
}
