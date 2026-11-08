"use client";

import { useState } from "react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useMesai } from "@/lib/use-data";
import { holidayName } from "@/lib/holidays";
import { hhmm, levelFor, monthSummary, money, hrs } from "@/lib/calc";
import { TYPE_META, type EntryType } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const STATUS: EntryType[] = ["paid_leave", "unpaid_leave", "sick", "absent", "holiday"];

export function HomeClient({ name }: { name: string }) {
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const { entries, settings, shortcuts, totalHours, reload } = useMesai(new Date(date));
  const [custom, setCustom] = useState(false);
  const [customHours, setCustomHours] = useState("");
  const [onHoliday, setOnHoliday] = useState(false);
  const holiday = holidayName(date);
  const sum = monthSummary(entries, settings);
  const lvl = levelFor(totalHours);

  async function add(type: EntryType, hours: number, start?: string | null, end?: string | null) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("entries").insert({ user_id: user!.id, work_date: date, type, hours, start_time: start ?? null, end_time: end ?? null });
    if (error) return toast.error(error.message);
    toast.success(`${TYPE_META[type].label} eklendi`);
    reload();
  }

  const todays = entries.filter((e) => e.work_date === date);

  return (
    <div className="space-y-5">
      <header className="flex items-end justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{format(new Date(date), "d MMMM EEEE", { locale: tr })}</p>
          <h1 className="text-2xl font-bold">Merhaba, {name.split(" ")[0] || "👋"}</h1>
        </div>
        <Input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} className="w-40" />
      </header>

      {holiday && (
        <div className="glass flex items-center justify-between px-4 py-3 text-sm">
          <span>🎉 {holiday}</span>
          <Button size="sm" variant="secondary" onClick={() => add("holiday", 0)}>Tatil olarak işaretle</Button>
        </div>
      )}

      <Card>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Seviye {lvl.level}</p>
              <p className="text-lg font-semibold">{lvl.emoji} {lvl.name}</p>
            </div>
            <p className="text-sm text-muted-foreground">{hrs(totalHours)} toplam</p>
          </div>
          <Progress value={lvl.progress} />
          {lvl.next && <p className="text-xs text-muted-foreground">{lvl.next.emoji} {lvl.next.name} için {hrs(lvl.toNext)} kaldı</p>}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3">
          <div className="flex items-baseline justify-between">
            <p className="font-semibold">Aylık hedef</p>
            <p className="text-sm text-muted-foreground">%{sum.percent.toFixed(0)}</p>
          </div>
          <Progress value={sum.percent} />
          <div className="flex justify-between text-sm">
            <span>Kazanılan <b>{money(sum.earned, settings.currency)}</b></span>
            <span className="text-muted-foreground">Hedef {money(sum.goal, settings.currency)}</span>
          </div>
          {sum.goal > 0 && <p className="text-xs text-muted-foreground">Hedefe ~{hrs(sum.remainingHours)} mesai kaldı · {hrs(sum.hours)} yapıldı</p>}
        </CardContent>
      </Card>

      <section className="space-y-2">
        <h2 className="font-semibold">Mesai kısayolları</h2>
        <div className="grid grid-cols-2 gap-3">
          {shortcuts.map((s) => (
            <Button key={s.id} className="h-20 flex-col text-lg" onClick={() => add("overtime", Number(s.hours), s.start_time, s.end_time)}>
              {s.label}<span className="text-xs font-normal opacity-80">{s.start_time ? `${hhmm(s.start_time)} – ${hhmm(s.end_time)}` : "+ ekle"}</span>
            </Button>
          ))}
          <Button variant="secondary" className="h-20 flex-col" onClick={() => { setOnHoliday(!!holiday); setCustom(true); }}>
            <Plus className="size-5" />Farklı mesai
          </Button>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold">Gün durumu</h2>
        <div className="grid grid-cols-2 gap-2">
          {STATUS.map((t) => (
            <Button key={t} variant="outline" onClick={() => add(t, 0)}>
              <span className={`mr-2 size-2.5 rounded-full ${TYPE_META[t].color}`} />{TYPE_META[t].label}
            </Button>
          ))}
        </div>
      </section>

      {todays.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-semibold">Bu günün kayıtları</h2>
          {todays.map((e) => (
            <div key={e.id} className="glass flex items-center justify-between px-4 py-3 text-sm">
              <span>{TYPE_META[e.type].label} {e.hours > 0 && `· ${hrs(Number(e.hours))}`}{e.start_time && ` · ${hhmm(e.start_time)}–${hhmm(e.end_time)}`}</span>
              <button className="text-destructive" onClick={async () => { await createClient().from("entries").delete().eq("id", e.id); reload(); }}>Sil</button>
            </div>
          ))}
        </section>
      )}

      <Dialog open={custom} onOpenChange={setCustom}>
        <DialogContent>
          <DialogHeader><DialogTitle>Farklı mesai saati</DialogTitle></DialogHeader>
          <Input type="number" step="0.25" min="0" max="24" placeholder="Örn. 4" value={customHours} onChange={(e) => setCustomHours(e.target.value)} />
          <label className="flex items-center justify-between text-sm">Resmi tatilde çalıştım (tatil çarpanı)<Switch checked={onHoliday} onCheckedChange={setOnHoliday} /></label>
          <Button onClick={() => { const h = parseFloat(customHours); if (h > 0) { add(onHoliday ? "holiday" : "overtime", h); setCustom(false); setCustomHours(""); } }}>Ekle</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
