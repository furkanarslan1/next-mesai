"use client";

import { useState } from "react";
import { parseISO } from "date-fns";
import { monthKey, useMonthEntries } from "@/lib/store";
import { CalendarGrid } from "@/components/mesai/calendar-grid";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";

/** Alttan açılan ay takvimi: gün seç, mesai kaydı olan günler koyu görünür. Geçmiş günleri düzeltmek için de buradan gün seçilir. */
export function DatePicker({ open, value, today, onSelect, onClose }: {
  open: boolean; value: string; today: string; onSelect: (d: string) => void; onClose: () => void;
}) {
  const [month, setMonth] = useState(() => parseISO(value));
  // Açılış dışarıdan (open prop) yönetildiği için onOpenChange(true) gelmez: her açılışta seçili günün ayına dön
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setMonth(parseISO(value));
  }
  const entries = useMonthEntries(monthKey(month)) ?? [];
  const marked = new Set(entries.map((e) => e.work_date));

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent side="bottom" showCloseButton={false} className="mx-auto max-w-lg gap-5 rounded-t-[2rem] p-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
        <SheetHeader className="sr-only p-0">
          <SheetTitle>Tarih seç</SheetTitle>
          <SheetDescription>Mesai girmek ya da düzeltmek istediğin günü seç.</SheetDescription>
        </SheetHeader>
        <CalendarGrid month={month} onMonthChange={setMonth} value={value} today={today} marked={marked} onSelect={onSelect} />
        <Button variant="secondary" className="h-12 text-base" onClick={() => onSelect(today)}>Bugüne dön</Button>
      </SheetContent>
    </Sheet>
  );
}
