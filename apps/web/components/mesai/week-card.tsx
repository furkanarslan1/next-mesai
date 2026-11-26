"use client";

import Link from "next/link";
import { hrs, num } from "@mesai/core/calc";
import { daysToPayday } from "@mesai/core/summary";
import { TYPE_META, type Entry, type Settings } from "@mesai/core/types";
import { weekDays } from "@mesai/core/week";
import { Card, CardContent } from "@/components/ui/card";
import { useMonthEntries } from "@/lib/store";

/**
 * Ana sayfa "Bu hafta": seçili günün haftası (pazartesi–pazar) 7 çubukla, haftalık toplam ve maaş gününe kalan.
 * `entries` seçili ayın (iyimser güncellemeli) kayıtları; hafta öbür aya taşıyorsa o ay ayrıca yüklenir.
 * Mobil: components/week-card.tsx
 */
export function WeekCard({ date, todayStr, today, month, entries, settings }: {
  date: string; todayStr: string; today: Date; month: string; entries: Entry[]; settings: Settings;
}) {
  const months = weekDays(date, []).months;
  const other = months.find((m) => m !== month) ?? month;
  const otherEntries = useMonthEntries(other);
  const all = other === month ? entries : [...entries, ...(otherEntries ?? [])];
  const w = weekDays(date, all);
  const scale = Math.max(4, w.max);
  const payIn = daysToPayday(today, settings.payday);

  return (
    <Link href="/reports" transitionTypes={["nav-forward"]} aria-label="Haftalık özeti aç" className="block transition active:scale-[0.99]">
      <Card className="r-lg"><CardContent className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="font-semibold">Bu hafta</h2>
          <span className="text-sm font-semibold tabular-nums">{hrs(w.total)}</span>
        </div>
        <div className="grid h-28 grid-cols-7 items-end gap-2" role="img"
          aria-label={w.days.map((d) => `${d.label} ${d.hours ? hrs(d.hours) : d.status ? TYPE_META[d.status].label : "yok"}`).join(", ")}>
          {w.days.map((d) => {
            const isToday = d.date === todayStr;
            return (
              <div key={d.date} className="flex h-full flex-col items-center justify-end gap-1">
                {d.hours > 0 && <span className="text-[11px] leading-none tabular-nums text-muted-foreground">{num(d.hours)}</span>}
                {d.hours > 0 ? (
                  <span className={`w-full max-w-7 rounded-md ${TYPE_META[d.workType].color}`} style={{ height: `${Math.max(8, (d.hours / scale) * 72)}px` }} />
                ) : d.status ? (
                  <span className={`size-2.5 rounded-full ${TYPE_META[d.status].color}`} title={TYPE_META[d.status].label} />
                ) : (
                  <span className="h-1 w-full max-w-7 rounded-full bg-muted" />
                )}
                <span className={`text-xs leading-none ${isToday ? "font-bold text-primary" : d.holiday ? "text-amber-500" : "text-muted-foreground"}`}>{d.label}</span>
              </div>
            );
          })}
        </div>
        {payIn !== null && (
          <p className="text-xs text-muted-foreground">{payIn === 0 ? "Bugün maaş günü" : `Maaş gününe ${payIn} gün`}</p>
        )}
      </CardContent></Card>
    </Link>
  );
}
