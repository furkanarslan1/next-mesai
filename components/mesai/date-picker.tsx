"use client";

import { useState } from "react";
import { addMonths, eachDayOfInterval, endOfMonth, format, getDay, parseISO, startOfMonth } from "date-fns";
import { tr } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { monthKey, useMonthEntries } from "@/lib/store";
import { holidayName } from "@/lib/holidays";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";

/** Modern ay takvimi: gün seç, kayıtlı günlerde nokta görünür. Geçmiş günleri düzeltmek için de buradan gün seçilir. */
export function DatePicker({ open, value, today, onSelect, onClose }: {
  open: boolean; value: string; today: string; onSelect: (d: string) => void; onClose: () => void;
}) {
  const [month, setMonth] = useState(() => parseISO(value));
  const entries = useMonthEntries(monthKey(month)) ?? [];
  const days = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) });
  const offset = (getDay(startOfMonth(month)) + 6) % 7;
  const marked = new Set(entries.map((e) => e.work_date));

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); else setMonth(parseISO(value)); }}>
      <SheetContent side="bottom" className="mx-auto max-w-lg gap-5 rounded-t-[2rem] p-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
        <SheetHeader className="p-0">
          <SheetTitle className="sr-only">Tarih seç</SheetTitle>
          <SheetDescription className="sr-only">Mesai girmek ya da düzeltmek istediğin günü seç.</SheetDescription>
          <div className="flex items-center justify-between">
            <Button size="icon" variant="secondary" aria-label="Önceki ay" onClick={() => setMonth(addMonths(month, -1))}><ChevronLeft /></Button>
            <p className="text-lg font-bold capitalize">{format(month, "MMMM yyyy", { locale: tr })}</p>
            <Button size="icon" variant="secondary" aria-label="Sonraki ay" onClick={() => setMonth(addMonths(month, 1))}><ChevronRight /></Button>
          </div>
        </SheetHeader>
        <div className="grid grid-cols-7 gap-1.5 text-center text-xs text-muted-foreground">
          {["Pt", "Sa", "Ça", "Pe", "Cu", "Ct", "Pz"].map((d) => <div key={d}>{d}</div>)}
          {Array.from({ length: offset }).map((_, i) => <div key={i} />)}
          {days.map((d) => {
            const key = format(d, "yyyy-MM-dd");
            const selected = key === value;
            const isToday = key === today;
            return (
              <button key={key} type="button" aria-pressed={selected} aria-label={format(d, "d MMMM EEEE", { locale: tr })}
                onClick={() => onSelect(key)}
                className={`r-md relative flex aspect-square flex-col items-center justify-center text-sm font-medium leading-none transition active:scale-95 ${
                  selected ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                } ${isToday && !selected ? "ring-2 ring-primary" : ""} ${holidayName(key) && !selected ? "ring-2 ring-amber-400" : ""}`}>
                {format(d, "d")}
                {marked.has(key) && <span className={`absolute bottom-1.5 size-1.5 rounded-full ${selected ? "bg-primary-foreground" : "bg-[var(--teal)]"}`} aria-hidden />}
              </button>
            );
          })}
        </div>
        <Button variant="secondary" className="h-12 text-base" onClick={() => onSelect(today)}>Bugüne dön</Button>
      </SheetContent>
    </Sheet>
  );
}
