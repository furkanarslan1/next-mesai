"use client";

import { useOptimistic, useState, useTransition } from "react";
import { format, parseISO } from "date-fns";
import { tr } from "date-fns/locale";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { monthKey, mutate, useMonthEntries, useSettings, useShortcuts, useTotalHours } from "@/lib/store";
import { holidayName } from "@/lib/holidays";
import { hhmm, levelFor, hrs } from "@/lib/calc";
import { TYPE_META, type Entry, type EntryType } from "@/lib/types";
import { ShortcutButton } from "@/components/mesai/shortcut-button";
import { GoalHero } from "@/components/mesai/goal-hero";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const STATUS: EntryType[] = ["paid_leave", "unpaid_leave", "sick", "absent", "holiday"];

type Opt = { add: Entry } | { remove: string };
const isWork = (e: { type: string }) => e.type === "overtime" || e.type === "holiday";

export function HomeClient({ name, userId }: { name: string; userId: string }) {
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const key = monthKey(parseISO(date));
  const realEntries = useMonthEntries(key);
  const settings = useSettings();
  const shortcuts = useShortcuts();
  const realTotal = useTotalHours();
  const [entries, applyOpt] = useOptimistic(realEntries ?? [], (list, a: Opt) =>
    "add" in a ? [...list, a.add] : list.filter((e) => e.id !== a.remove));
  const [, startTransition] = useTransition();
  const [custom, setCustom] = useState(false);
  const [customHours, setCustomHours] = useState("");
  const [onHoliday, setOnHoliday] = useState(false);
  const holiday = holidayName(date);

  // Seviye için toplam saat: gerçek toplam + henüz sunucuya yazılmamış anlık fark
  const pendingDelta = entries.filter(isWork).reduce((a, e) => a + Number(e.hours), 0)
    - (realEntries ?? []).filter(isWork).reduce((a, e) => a + Number(e.hours), 0);
  const totalHours = (realTotal ?? 0) + pendingDelta;
  const lvl = levelFor(totalHours);

  function add(type: EntryType, hours: number, start?: string | null, end?: string | null) {
    const row = { user_id: userId, work_date: date, type, hours, note: null, start_time: start ?? null, end_time: end ?? null };
    startTransition(async () => {
      applyOpt({ add: { ...row, id: `tmp-${crypto.randomUUID()}` } });
      try { await mutate.addEntry(row); toast.success(`${TYPE_META[type].label} eklendi`); }
      catch (e) { toast.error(e instanceof Error ? e.message : "Eklenemedi"); }
    });
  }
  function remove(e: Entry) {
    startTransition(async () => {
      applyOpt({ remove: e.id });
      try { await mutate.removeEntry(e); }
      catch (err) { toast.error(err instanceof Error ? err.message : "Silinemedi"); }
    });
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

      {settings && realEntries ? (
        <GoalHero userId={userId} settings={settings} entries={entries} monthLabel={format(parseISO(date), "LLLL yyyy", { locale: tr })} />
      ) : (
        <div className="glass h-56 w-full animate-pulse" aria-busy />
      )}

      <section className="space-y-2">
        <h2 className="font-semibold">Mesai kısayolları</h2>
        <div className="grid grid-cols-2 gap-3">
          {(shortcuts ?? []).map((s) => (
            <ShortcutButton
              key={s.id} label={s.label} hoursText={hrs(Number(s.hours))}
              hint={s.start_time ? `${hhmm(s.start_time)} – ${hhmm(s.end_time)}` : "dokun, ekle"}
              onPress={() => add("overtime", Number(s.hours), s.start_time, s.end_time)}
            />
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

      {todays.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-semibold">Bu günün kayıtları</h2>
          {todays.map((e) => (
            <div key={e.id} className="glass flex items-center justify-between px-4 py-3 text-sm">
              <span>{TYPE_META[e.type].label} {e.hours > 0 && `· ${hrs(Number(e.hours))}`}{e.start_time && ` · ${hhmm(e.start_time)}–${hhmm(e.end_time)}`}</span>
              <button className="text-destructive" onClick={() => remove(e)}>Sil</button>
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
