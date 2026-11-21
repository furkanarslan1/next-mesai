"use client";

import { addMonths, eachDayOfInterval, endOfMonth, format, getDay, startOfMonth } from "date-fns";
import { tr } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { holidayName } from "@/lib/holidays";
import { Button } from "@/components/ui/button";

/** Ay takvimi ızgarası (gün seçmek için). Ay durumu dışarıdan yönetilir; kayıtlı günler `marked` ile işaretlenir. */
export function CalendarGrid({ month, onMonthChange, value, today, marked, onSelect }: {
  month: Date; onMonthChange: (m: Date) => void; value: string; today: string; marked?: Set<string>; onSelect: (d: string) => void;
}) {
  const days = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) });
  const offset = (getDay(startOfMonth(month)) + 6) % 7;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button size="icon" variant="secondary" aria-label="Önceki ay" onClick={() => onMonthChange(addMonths(month, -1))}><ChevronLeft /></Button>
        <p className="text-lg font-bold capitalize">{format(month, "MMMM yyyy", { locale: tr })}</p>
        <Button size="icon" variant="secondary" aria-label="Sonraki ay" onClick={() => onMonthChange(addMonths(month, 1))}><ChevronRight /></Button>
      </div>
      <div className="grid grid-cols-7 gap-1.5 text-center text-xs text-muted-foreground">
        {["Pt", "Sa", "Ça", "Pe", "Cu", "Ct", "Pz"].map((d) => <div key={d}>{d}</div>)}
        {Array.from({ length: offset }).map((_, i) => <div key={i} />)}
        {days.map((d) => {
          const key = format(d, "yyyy-MM-dd");
          const selected = key === value;
          const isMarked = marked?.has(key);
          return (
            <button key={key} type="button" aria-pressed={selected} aria-label={format(d, "d MMMM EEEE", { locale: tr })}
              onClick={() => onSelect(key)}
              className={`r-md relative flex aspect-square flex-col items-center justify-center text-sm font-medium leading-none transition active:scale-95 ${
                selected ? "bg-[var(--teal)] text-[var(--ink)]" : isMarked ? "bg-[var(--fill)] text-white" : "bg-muted text-foreground"
              } ${key === today && !selected ? "ring-2 ring-[var(--teal)] ring-offset-2 ring-offset-popover" : ""} ${holidayName(key) && !selected ? "ring-2 ring-amber-400" : ""}`}>
              {format(d, "d")}
              {isMarked && selected && <span className="absolute bottom-1.5 size-1.5 rounded-full bg-[var(--ink)]" aria-hidden />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
