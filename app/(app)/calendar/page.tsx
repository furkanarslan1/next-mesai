"use client";

import { useState } from "react";
import { addMonths, eachDayOfInterval, endOfMonth, format, getDay, startOfMonth } from "date-fns";
import { tr } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMesai } from "@/lib/use-data";
import { hrs, money, monthSummary } from "@/lib/calc";
import { TYPE_META } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function CalendarPage() {
  const [month, setMonth] = useState(new Date());
  const { entries, settings } = useMesai(month);
  const days = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) });
  const offset = (getDay(startOfMonth(month)) + 6) % 7; // Pzt başlangıç
  const sum = monthSummary(entries, settings);
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
              const status = list.find((e) => e.type !== "overtime");
              const alpha = worked > 0 ? 0.25 + 0.75 * (worked / maxH) : 0;
              return (
                <div key={key} title={list.map((e) => TYPE_META[e.type].label).join(", ")}
                  className="relative grid aspect-square place-items-center rounded-xl text-sm text-foreground"
                  style={{ background: worked > 0 ? `oklch(0.58 0.21 270 / ${alpha})` : "var(--muted)", color: alpha > 0.55 ? "white" : undefined }}>
                  {format(d, "d")}
                  {status && <span className={`absolute bottom-1 size-1.5 rounded-full ${TYPE_META[status.type].color}`} />}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
      <div className="flex flex-wrap gap-3 text-xs">
        {Object.values(TYPE_META).slice(1).map((m) => (
          <span key={m.label} className="flex items-center gap-1"><span className={`size-2 rounded-full ${m.color}`} />{m.label}</span>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Card><CardContent><p className="text-xs text-muted-foreground">Toplam mesai</p><p className="text-xl font-bold">{hrs(sum.hours)}</p></CardContent></Card>
        <Card><CardContent><p className="text-xs text-muted-foreground">Kazanç</p><p className="text-xl font-bold">{money(sum.earned, settings.currency)}</p></CardContent></Card>
      </div>
    </div>
  );
}
