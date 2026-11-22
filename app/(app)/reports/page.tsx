"use client";

import { errorText } from "@/lib/errors";
import { useState } from "react";
import Link from "next/link";
import { addMonths, format, parseISO, startOfMonth } from "date-fns";
import { tr } from "date-fns/locale";
import { AlertTriangle, ArrowDownRight, ArrowUpRight, Check, FileText, Minus, Plus, Table2 } from "lucide-react";
import { toast } from "sonner";
import { useToday } from "@/lib/now";
import { mutate, useEntriesMap, usePayslips, useProfile, useSettings, useTotalHours } from "@/lib/store";
import { hrs, levelFor, LEVELS, money, num } from "@/lib/calc";
import { Page } from "@/components/mesai/page";
import { SwipeRow } from "@/components/mesai/swipe-row";
import { LevelIcon } from "@/components/mesai/level-icon";
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
  // Yıllık izin için yılın tüm ayları okunur: ileriye planlanmış ücretli izinler de haktan düşsün
  const fullYear = Array.from({ length: 12 }, (_, i) => new Date(year, i, 1));
  const keys = [...new Set([...six.map(keyOf), ...fullYear.map(keyOf), ...slipKeys])];
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
  const lvl = levelFor(totalHours);

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
    <Page title="Raporlar" actions={
      <div className="no-print flex gap-2">
        <Button size="sm" variant="secondary" onClick={exportCsv}>CSV</Button>
        <Button size="sm" variant="secondary" onClick={() => window.print()}><FileText className="size-4" />PDF</Button>
      </div>
    }>
      <Link href="/reports/timesheet" transitionTypes={["nav-forward"]}
        className="no-print settings-row flex items-center gap-3.5 rounded-[var(--r-lg)] bg-card px-4 py-3.5 shadow-[var(--shadow-soft),0_0_0_0.5px_var(--hairline)]">
        <span className="settings-icon" style={{ background: "var(--teal)" }}><Table2 className="size-[18px]" /></span>
        <span className="min-w-0 flex-1">
          <span className="block text-[17px] font-semibold">Aylık çalışma çizelgesi</span>
          <span className="text-[13px] text-muted-foreground">Gün gün giriş-çıkış · Excel ve PDF</span>
        </span>
        <span className="text-xl text-muted-foreground/60" aria-hidden>›</span>
      </Link>

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
                <span className="text-[10px] font-semibold tabular-nums text-muted-foreground">{v > 0 ? (metric === "hours" ? num(+v.toFixed(1)) : `${Math.round(v / 1000)}b`) : ""}</span>
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
        <p className="text-xs text-muted-foreground">Takvimde &quot;Ücretli izin&quot; olarak işaretlediğin günler (ileriye planladıkların dahil) sayılır.</p>
        <div className="no-print flex gap-2">
          <Input inputMode="numeric" value={leaveInput} onChange={(e) => setLeaveInput(e.target.value.replace(/\D/g, "").slice(0, 2))} aria-label="Yıllık izin hakkı (gün)" />
          <Button variant="secondary" onClick={saveLeave} disabled={leaveInput === "" || Number(leaveInput) > 60 || Number(leaveInput) === settings.annual_leave_days}>Hakkı kaydet</Button>
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
          const tone = c.issues === 0 ? "text-emerald-600" : "text-destructive";
          return (
            <SwipeRow key={p.id} className="r-lg" onDelete={() => setSheet({ item: p, del: true })}>
              <button type="button" onClick={() => setSheet({ item: p })} className="w-full space-y-2 bg-muted px-4 py-3 text-left transition active:brightness-95">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold capitalize">{format(parseISO(p.month), "LLLL yyyy", { locale: tr })}</span>
                  <span className={`text-sm font-semibold ${tone}`}>{c.issues === 0 ? "Uyumlu" : `${c.issues} fark var`}</span>
                </div>
                <ul className="space-y-1">
                  {c.rows.map((r) => (
                    <li key={r.key} className="text-xs">
                      <span className="flex items-start gap-1.5">
                        {r.ok ? <Check className="mt-0.5 size-3.5 shrink-0 text-emerald-600" aria-label="uyumlu" /> : <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-destructive" aria-label="fark var" />}
                        <span className="min-w-0 flex-1">
                          <span className="font-medium">{r.label}</span>
                          <span className="block tabular-nums text-muted-foreground">Bordro {r.bordro} · Uygulama {r.app}</span>
                          {r.note && <span className="block text-destructive">{r.note}</span>}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </button>
            </SwipeRow>
          );
        })}
        <p className="text-xs text-muted-foreground">Silmek için bordroyu sola kaydır. Tutarlar net esaslı karşılaştırılır (saatlik ücretini bordrodaki net ücretle girdiysen). Küçük farklar (çeyrek saat, gün kesri, birkaç TL) yok sayılır.</p>
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

      <Card><CardContent className="space-y-3">
        <div className="flex items-center gap-3">
          <LevelIcon level={lvl.level} className="size-12" />
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold">Seviye {lvl.level} · {lvl.name}</h2>
            <p className="text-xs text-muted-foreground">{lvl.next ? `${lvl.next.name} için ${hrs(lvl.toNext)} kaldı` : "En yüksek seviyedesin"} · toplam {hrs(totalHours)}</p>
          </div>
        </div>
        <Progress value={lvl.progress} />
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {LEVELS.map((l, i) => (
            <div key={l.name} className={`flex flex-col items-center gap-1 text-center ${i + 1 <= lvl.level ? "" : "opacity-40 grayscale"}`}>
              <LevelIcon level={i + 1} className="size-9" />
              <span className="text-[11px] font-semibold leading-tight">{l.name}</span>
              <span className="text-[10px] text-muted-foreground">{l.min} sa</span>
            </div>
          ))}
        </div>
      </CardContent></Card>

      {sheet && userId && (
        <PayslipSheet key={`${sheet.item?.id ?? "new"}${sheet.del ? "-del" : ""}`} userId={userId} months={slipMonths} item={sheet.item} startInDelete={sheet.del} existingMonths={slipKeys} settings={settings} defaultMonth={keyOf(addMonths(startOfMonth(today), -1))} onClose={() => setSheet(null)} />
      )}
    </Page>
  );
}
