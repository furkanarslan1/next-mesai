"use client";

import { addMonths } from "date-fns/addMonths";
import { format } from "date-fns/format";
import { parseISO } from "date-fns/parseISO";
import { goalProgress, hrs, money, monthSummary, num } from "@mesai/core/calc";
import { daysToPayday, summaryDetails } from "@mesai/core/summary";
import type { Entry, Settings } from "@mesai/core/types";
import { AnimatedNumber } from "@/components/mesai/animated-number";
import { useFinance, useMonthEntries } from "@/lib/store";

/** Aylık özet: toplam kazanç (maaş − kesinti + mesai) ve mesai saati / günü / kazancı. Hedef kartında (hedef yokken) ve hedef varken günün durum kartlarının altında kullanılır. */
export function MonthSummary({ entries, settings, month, today }: {
  entries: Entry[]; settings: Settings;
  /** Özetin ayı (yyyy-MM): geçen ay farkı ve gelir-gider için */
  month: string;
  /** Verilirse (içinde bulunulan ay) maaş günü geri sayımı gösterilir */
  today?: Date;
}) {
  const g = goalProgress(entries, settings);
  const sum = monthSummary(entries, settings);
  const cur = settings.currency;
  const workDays = new Set(entries.filter((e) => (e.type === "overtime" || e.type === "holiday") && Number(e.hours) > 0).map((e) => e.work_date)).size;
  return (
    <div className="space-y-5">
      <div className="text-center">
        <p className="text-sm text-muted-foreground">Bu ay toplam kazanç</p>
        <AnimatedNumber value={g.income} format={(n) => money(n, cur)} className="mt-1 block text-5xl font-bold tracking-tight" />
        <p className="mt-2 text-xs text-muted-foreground tabular-nums">
          Maaş {money(settings.monthly_salary, cur)}{g.deduction > 0 && <> − kesinti {money(g.deduction, cur)}</>} + mesai {money(g.earned, cur)}
        </p>
      </div>
      <div className="grid grid-cols-3 gap-2.5">
        {[
          { label: "Mesai saati", value: hrs(sum.hours) },
          { label: "Mesai günü", value: `${workDays} gün` },
          { label: "Mesai kazancı", value: money(sum.earned, cur) },
        ].map((t) => (
          <div key={t.label} className="@container r-md bg-muted px-2 py-3 text-center">
            {/* Dar ekranda (360 px) tek satırda kalsın: yazı kutu genişliğine göre küçülür (mobil: adjustsFontSizeToFit) */}
            <p className="whitespace-nowrap text-[clamp(0.75rem,16cqi,1.125rem)] font-bold tabular-nums leading-tight">{t.value}</p>
            <p className="mt-1 text-[11px] leading-tight text-muted-foreground">{t.label}</p>
          </div>
        ))}
      </div>
      {sum.sickHours > 0 && (
        <p className="text-center text-xs text-muted-foreground tabular-nums">
          {sum.sickDays} raporlu gün için {hrs(sum.sickHours)} mesaiden düşüldü ({hrs(sum.grossHours)} girildi)
        </p>
      )}
      <SummaryDetails entries={entries} settings={settings} month={month} today={today} />
      {sum.includedHours > 0 && (
        <p className="text-center text-xs text-muted-foreground tabular-nums">
          {hrs(sum.includedHours)} maaşa dahil · {sum.paidHours === 0 && sum.quotaLeft > 0
            ? `${hrs(sum.quotaLeft)} sonra ücretli mesai başlar`
            : `${hrs(sum.paidHours)} ücretli mesai`}
        </p>
      )}
    </div>
  );
}

const signed = (n: number, f: (x: number) => string) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${f(Math.abs(n))}`;

/** Özetin ayrıntıları: türe göre mesai, kesinti, geçen aya göre fark, gelir-gider ve maaş günü. */
function SummaryDetails({ entries, settings, month, today }: { entries: Entry[]; settings: Settings; month: string; today?: Date }) {
  const prevKey = format(addMonths(parseISO(`${month}-01`), -1), "yyyy-MM");
  const prev = useMonthEntries(prevKey);
  const items = useFinance(month);
  const cur = settings.currency;
  const d = summaryDetails(entries, settings, prev, items);
  const payIn = today ? daysToPayday(today, settings.payday) : null;
  // Geçen ayda hiç kayıt yoksa (uygulamayı yeni kullanmaya başladıysa) fark anlamsız
  const showPrev = d.vsPrev && prev && prev.length > 0;
  const ded = d.deduction;
  const dedParts = [ded.unpaid && `${ded.unpaid} gün ücretsiz izin`, ded.absent && `${ded.absent} gün gelmedi`, ded.sick && `${ded.sick} gün rapor`].filter(Boolean).join(", ");
  const rows: { label: string; hint?: string; value: string; tone?: "good" | "bad" }[] = [];
  if (d.byKind.length > 1 || d.byKind.some((k) => k.kind !== "weekday")) {
    d.byKind.forEach((k) => rows.push({ label: `${k.label} mesaisi`, hint: hrs(k.hours), value: money(k.amount, cur) }));
  }
  if (ded.days > 0) rows.push({ label: "Maaş kesintisi", hint: dedParts, value: `−${money(ded.amount, cur)}`, tone: "bad" });
  if (d.finance) {
    if (d.finance.extra > 0) rows.push({ label: "Ek gelir", value: `+${money(d.finance.extra, cur)}`, tone: "good" });
    rows.push({ label: "Harcamalar", value: `−${money(d.finance.expense, cur)}` });
    rows.push({ label: "Cebinde kalan", value: money(d.finance.left, cur), tone: d.finance.left < 0 ? "bad" : "good" });
  }
  if (!rows.length && !showPrev && payIn === null) return null;

  return (
    <div className="space-y-3">
      {(showPrev || payIn !== null) && (
        <div className="flex flex-wrap justify-center gap-2 text-xs tabular-nums">
          {showPrev && d.vsPrev && (
            <span className="rounded-full bg-muted px-3 py-1 text-muted-foreground">
              Geçen aya göre{" "}
              <b className={d.vsPrev.income > 0 ? "text-[var(--tint)]" : d.vsPrev.income < 0 ? "text-destructive" : "text-foreground"}>{signed(d.vsPrev.income, (x) => money(x, cur))}</b>
              {" · "}{signed(d.vsPrev.hours, (x) => `${num(Math.round(x * 10) / 10)} saat`)}
            </span>
          )}
          {payIn !== null && (
            <span className="rounded-full bg-muted px-3 py-1 text-muted-foreground">
              {payIn === 0 ? <b className="text-[var(--tint)]">Maaş bugün</b> : <>Maaşa <b className="text-foreground">{payIn} gün</b></>}
            </span>
          )}
        </div>
      )}
      {rows.length > 0 && (
        <dl className="divide-y divide-border/60 r-md bg-muted px-3 text-sm">
          {rows.map((r) => (
            <div key={r.label} className="flex items-center justify-between gap-3 py-2.5">
              <dt className="min-w-0">
                <span className="block leading-tight">{r.label}</span>
                {r.hint && <span className="block text-xs leading-tight text-muted-foreground">{r.hint}</span>}
              </dt>
              <dd className={`shrink-0 font-semibold tabular-nums ${r.tone === "good" ? "text-[var(--tint)]" : r.tone === "bad" ? "text-destructive" : ""}`}>{r.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
