"use client";

import { useState } from "react";
import { addMonths, eachDayOfInterval, endOfMonth, format, getDay, startOfMonth } from "date-fns";
import { tr } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMesai } from "@/lib/use-data";
import { useProfile } from "@/lib/store";
import { DaySheet } from "@/components/mesai/day-sheet";
import { useToday } from "@/lib/now";
import { holidayName } from "@/lib/holidays";
import { goalProgress, hrs, money, monthSummary } from "@/lib/calc";
import { TYPE_META } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/** İzin/rapor gibi günlerin hücre rengi ve kısa etiketi (mesai olan günlerde saat yazar) */
const STATUS_CELL: Record<string, { bg: string; text: string; short: string }> = {
  paid_leave: { bg: "color-mix(in oklch, oklch(0.7 0.14 235) 38%, var(--navy))", text: "text-sky-200", short: "İzin" },
  unpaid_leave: { bg: "color-mix(in oklch, oklch(0.68 0.16 50) 38%, var(--navy))", text: "text-orange-200", short: "Ücretsiz" },
  sick: { bg: "color-mix(in oklch, oklch(0.7 0.14 340) 36%, var(--navy))", text: "text-pink-200", short: "Rapor" },
  absent: { bg: "color-mix(in oklch, oklch(0.62 0.2 20) 42%, var(--navy))", text: "text-rose-200", short: "Gelmedi" },
  holiday: { bg: "color-mix(in oklch, oklch(0.8 0.15 85) 36%, var(--navy))", text: "text-amber-200", short: "Tatil" },
};

export default function CalendarPage() {
  const today = useToday();
  if (!today) return <div className="glass min-h-[28rem] w-full animate-pulse" aria-busy />;
  return <CalendarView today={today} />;
}

function CalendarView({ today }: { today: Date }) {
  const [month, setMonth] = useState(today);
  const [selected, setSelected] = useState<string | null>(null);
  const userId = useProfile()?.id ?? "";
  const { entries, settings } = useMesai(month);
  const days = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) });
  const offset = (getDay(startOfMonth(month)) + 6) % 7; // Pzt başlangıç
  const sum = monthSummary(entries, settings);
  const total = goalProgress(entries, settings); // income = maaş − kesinti + mesai kazancı
  const maxH = Math.max(1, ...entries.map((e) => Number(e.hours)));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <Button size="icon" variant="secondary" onClick={() => setMonth(addMonths(month, -1))}><ChevronLeft /></Button>
        <h1 className="text-xl font-bold capitalize">{format(month, "MMMM yyyy", { locale: tr })}</h1>
        <Button size="icon" variant="secondary" onClick={() => setMonth(addMonths(month, 1))}><ChevronRight /></Button>
      </div>
      <Card>
        <CardContent>
          <div className="grid grid-cols-7 gap-1.5 text-center text-xs text-muted-foreground">
            {["Pt", "Sa", "Ça", "Pe", "Cu", "Ct", "Pz"].map((d) => <div key={d}>{d}</div>)}
            {Array.from({ length: offset }).map((_, i) => <div key={i} />)}
            {days.map((d) => {
              const key = format(d, "yyyy-MM-dd");
              const list = entries.filter((e) => e.work_date === key);
              const worked = list.filter((e) => e.type === "overtime" || e.type === "holiday").reduce((a, e) => a + Number(e.hours), 0);
              const status = list.find((e) => e.type !== "overtime" && e.type !== "holiday") ?? list.find((e) => e.type === "holiday" && Number(e.hours) === 0);
              const alpha = worked > 0 ? 0.25 + 0.75 * (worked / maxH) : 0;
              const strong = alpha > 0.6;
              const isToday = key === format(today, "yyyy-MM-dd");
              const st = status ? STATUS_CELL[status.type] : null;
              return (
                <button key={key} type="button" onClick={() => setSelected(key)} aria-label={`${format(d, "d MMMM", { locale: tr })} kayıtlarını aç`} title={[holidayName(key), ...list.map((e) => TYPE_META[e.type].label)].filter(Boolean).join(", ")}
                  className={`relative flex aspect-square flex-col items-center justify-center r-md text-sm leading-none transition active:scale-95 ${holidayName(key) ? "ring-2 ring-amber-400" : isToday ? "ring-2 ring-[var(--teal)] ring-offset-2 ring-offset-card" : ""}`}
                  style={{ background: worked > 0 ? `color-mix(in oklch, var(--teal) ${Math.round(alpha * 100)}%, var(--navy))` : st ? st.bg : "var(--muted)", color: worked > 0 || st ? (strong ? "var(--ink)" : "oklch(0.99 0 0)") : "var(--foreground)" }}>
                  <span className={isToday ? "font-bold" : ""}>{format(d, "d")}</span>
                  {worked > 0 ? (
                    <span className="mt-1 text-[10px] font-semibold tabular-nums">{+worked.toFixed(2)} sa</span>
                  ) : st ? (
                    <span className={`mt-1 text-[10px] font-medium ${st.text}`}>{st.short}</span>
                  ) : null}
                  {worked > 0 && status && <span className={`absolute right-1 top-1 size-1.5 rounded-full ${TYPE_META[status.type].color}`} />}
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-center text-xs text-muted-foreground">Bir güne dokun: kayıtlarını gör, ekle, değiştir veya sil.</p>
        </CardContent>
      </Card>
      <div className="flex flex-wrap gap-3 text-xs">
        <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-[var(--teal)]" />Mesai (saat yazar)</span>
        {Object.values(TYPE_META).slice(1).map((m) => (
          <span key={m.label} className="flex items-center gap-1"><span className={`size-2 rounded-full ${m.color}`} />{m.label}</span>
        ))}
      </div>
      {days.some((d) => holidayName(format(d, "yyyy-MM-dd"))) && (
        <p className="text-xs text-muted-foreground">
          <span className="mr-1 inline-block size-2 rounded-full ring-2 ring-amber-400" />
          {days.filter((d) => holidayName(format(d, "yyyy-MM-dd"))).map((d) => `${format(d, "d")} ${holidayName(format(d, "yyyy-MM-dd"))}`).join(" · ")}
        </p>
      )}
      <DaySheet date={selected} entries={entries} userId={userId} onClose={() => setSelected(null)} />
      <div className="grid grid-cols-2 gap-3">
        <Card className="r-lg"><CardContent className="text-center"><p className="text-xs text-muted-foreground">Toplam mesai</p><p className="text-xl font-bold tabular-nums">{hrs(sum.hours)}</p></CardContent></Card>
        <Card className="r-lg"><CardContent className="text-center"><p className="text-xs text-muted-foreground">Mesai kazancı</p><p className="text-xl font-bold tabular-nums">{money(sum.earned, settings.currency)}</p></CardContent></Card>
        <Card className="r-lg col-span-2"><CardContent className="text-center">
          <p className="text-xs text-muted-foreground">Toplam maaş</p>
          <p className="text-2xl font-bold tabular-nums">{money(total.income, settings.currency)}</p>
          <p className="mt-1 text-xs text-muted-foreground tabular-nums">
            Maaş {money(settings.monthly_salary, settings.currency)}{total.deduction > 0 && <> − kesinti {money(total.deduction, settings.currency)}</>} + mesai {money(sum.earned, settings.currency)}
          </p>
        </CardContent></Card>
      </div>
    </div>
  );
}
