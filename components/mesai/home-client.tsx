"use client";

import { useEffect, useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import { tr } from "date-fns/locale";
import { toast } from "sonner";
import { CalendarCheck, CalendarMinus, Check, PartyPopper, Plus, Stethoscope, UserX, type LucideIcon } from "lucide-react";
import { monthKey, mutate, useMonthEntries, useProfile, useSettings, useShortcuts, useTotalHours } from "@/lib/store";
import { realTap } from "@/lib/tap";
import { useToday } from "@/lib/now";
import { holidayName } from "@/lib/holidays";
import { hhmm, levelFor, hrs, overtimeAfter } from "@/lib/calc";
import { TYPE_META, type Entry, type EntryType } from "@/lib/types";
import { ShortcutButton } from "@/components/mesai/shortcut-button";
import { LevelIcon } from "@/components/mesai/level-icon";
import { GoalHero } from "@/components/mesai/goal-hero";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const STATUS: EntryType[] = ["paid_leave", "unpaid_leave", "sick", "absent", "holiday"];
const STATUS_META: Record<string, { icon: LucideIcon; tint: string; hint: string }> = {
  paid_leave: { icon: CalendarCheck, tint: "bg-sky-400/15 text-sky-300", hint: "Maaş kesilmez" },
  unpaid_leave: { icon: CalendarMinus, tint: "bg-orange-500/15 text-orange-300", hint: "Maaştan düşer" },
  sick: { icon: Stethoscope, tint: "bg-slate-300/15 text-slate-200", hint: "Doktor raporu" },
  absent: { icon: UserX, tint: "bg-rose-500/15 text-rose-300", hint: "Habersiz" },
  holiday: { icon: PartyPopper, tint: "bg-amber-400/15 text-amber-300", hint: "Çalışılmadı" },
};

type Opt = { add: Entry } | { remove: string };
const isWork = (e: { type: string }) => e.type === "overtime" || e.type === "holiday";

export function HomeClient() {
  const today = useToday();
  if (!today) return <div className="glass min-h-[24rem] w-full animate-pulse" aria-busy />;
  return <HomeView today={today} />;
}

function HomeView({ today }: { today: Date }) {
  const router = useRouter();
  const profile = useProfile();
  const name = profile?.full_name ?? "";
  const userId = profile?.id ?? "";
  useEffect(() => { if (profile?.role === "manager") router.replace("/manager"); }, [profile?.role, router]);
  const [date, setDate] = useState(format(today, "yyyy-MM-dd"));
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
  const [byExit, setByExit] = useState(false);
  const [exitTime, setExitTime] = useState("");
  const [onHoliday, setOnHoliday] = useState(false);
  const holiday = holidayName(date);
  const workEnd = settings?.work_end ? hhmm(settings.work_end) : "";
  const exitHours = overtimeAfter(workEnd, exitTime);

  // Seviye için toplam saat: gerçek toplam + henüz sunucuya yazılmamış anlık fark
  const pendingDelta = entries.filter(isWork).reduce((a, e) => a + Number(e.hours), 0)
    - (realEntries ?? []).filter(isWork).reduce((a, e) => a + Number(e.hours), 0);
  const totalHours = (realTotal ?? 0) + pendingDelta;
  const lvl = levelFor(totalHours);

  function add(type: EntryType, hours: number, start?: string | null, end?: string | null, undo = false) {
    if (!userId) { toast.info("Hesap bilgileri yükleniyor, birkaç saniye sonra tekrar dene"); return; }
    const row = { user_id: userId, work_date: date, type, hours, note: null, start_time: start ?? null, end_time: end ?? null };
    startTransition(async () => {
      applyOpt({ add: { ...row, id: `tmp-${crypto.randomUUID()}` } });
      try {
        const saved = await mutate.addEntry(row);
        // Kısayol/durum kartları ikinci dokunuşla geri alır; "Farklı mesai"nin geri alma yolu bu bildirimdeki düğme
        toast.success(`${TYPE_META[type].label} eklendi`, undo ? { duration: 4500, action: { label: "Geri al", onClick: () => remove(saved) } } : undefined);
      }
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
  const todayHours = todays.filter(isWork).reduce((a, e) => a + Number(e.hours), 0);
  const monthHours = entries.filter(isWork).reduce((a, e) => a + Number(e.hours), 0);

  return (
    <div className="space-y-5">
      <header className="flex items-end justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{format(new Date(date), "d MMMM EEEE", { locale: tr })}</p>
          <h1 className="text-2xl font-bold">Merhaba{name ? `, ${name.split(" ")[0]}` : " 👋"}</h1>
        </div>
        <Input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} className="w-40" />
      </header>

      {holiday && (
        <div className="glass flex items-center justify-between px-4 py-3 text-sm">
          <span>🎉 {holiday}</span>
          <Button size="sm" variant="secondary" {...realTap(() => add("holiday", 0))}>Tatil olarak işaretle</Button>
        </div>
      )}

      {settings && realEntries && userId ? (
        <GoalHero userId={userId} settings={settings} entries={entries} monthLabel={format(parseISO(date), "LLLL yyyy", { locale: tr })} />
      ) : (
        <div className="glass min-h-[15.5rem] w-full animate-pulse" aria-busy />
      )}

      <div className="grid grid-cols-2 gap-3">
        <Card size="sm"><CardContent>
          <p className="text-xs text-muted-foreground">Bugünün mesaisi</p>
          <p className="text-xl font-bold tabular-nums">{hrs(todayHours)}</p>
        </CardContent></Card>
        <Card size="sm"><CardContent>
          <p className="text-xs text-muted-foreground">{format(parseISO(date), "LLLL", { locale: tr })} toplamı</p>
          <p className="text-xl font-bold tabular-nums">{hrs(monthHours)}</p>
        </CardContent></Card>
      </div>

      <section className="space-y-2">
        <div className="flex items-baseline justify-between">
          <h2 className="font-semibold">Mesai kısayolları</h2>
          <span className="text-xs text-muted-foreground">Ekle · tekrar dokun, geri al</span>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {shortcuts === null && [0, 1].map((i) => <div key={i} className="glass h-24 animate-pulse" aria-busy />)}
          {(shortcuts ?? []).map((s) => {
            const existing = [...todays].reverse().find((e) => e.type === "overtime" && Number(e.hours) === Number(s.hours));
            return (
              <ShortcutButton
                key={s.id} label={s.label} hoursText={hrs(Number(s.hours))}
                hint={s.start_time ? `${hhmm(s.start_time)}–${hhmm(s.end_time)}` : "Dokun, ekle"}
                active={!!existing} disabled={existing?.id.startsWith("tmp-")}
                onPress={() => (existing ? remove(existing) : add("overtime", Number(s.hours), s.start_time, s.end_time))}
              />
            );
          })}
        </div>
        <button type="button" {...realTap(() => { setOnHoliday(!!holiday); setCustom(true); })}
          className="glass flex w-full items-center justify-center gap-2 py-3 text-sm font-medium">
          <Plus className="size-4" />Farklı mesai ekle
        </button>
      </section>

      <div className="grid items-start gap-5 md:grid-cols-2">
        <section className="space-y-3">
          <div>
            <h2 className="font-semibold">Bugün işe gitmedin mi?</h2>
            <p className="text-xs text-muted-foreground">Nedenini seç, takvimine işlensin. Tekrar dokunursan geri alınır.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {STATUS.map((t) => {
              const m = STATUS_META[t];
              const existing = todays.find((e) => e.type === t);
              const pending = existing?.id.startsWith("tmp-");
              return (
                <button
                  key={t} type="button" disabled={pending} aria-pressed={!!existing}
                  {...realTap(() => (existing ? remove(existing) : add(t, 0)))}
                  className={`glass relative flex flex-col items-start gap-2.5 p-3.5 text-left transition active:scale-[0.97] disabled:opacity-60 ${existing ? "!border-primary/60 !bg-primary/15" : ""}`}
                >
                  <span className={`grid size-9 place-items-center rounded-xl ${existing ? "bg-primary text-primary-foreground" : m.tint}`}>
                    {existing ? <Check className="size-5" /> : <m.icon className="size-5" />}
                  </span>
                  <span>
                    <span className="block text-sm font-semibold leading-tight">{TYPE_META[t].label}</span>
                    <span className="mt-0.5 block text-xs leading-tight text-muted-foreground">{existing ? "Geri al" : m.hint}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <div className="space-y-5">
          <Card className={`transition-opacity duration-300 ${realTotal === null ? "opacity-0" : ""}`}>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <LevelIcon level={lvl.level} className="size-14" />
                  <div>
                    <p className="text-xs text-muted-foreground">Seviye {lvl.level}</p>
                    <p className="text-lg font-semibold">{lvl.name}</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">{hrs(totalHours)} toplam</p>
              </div>
              <Progress value={lvl.progress} />
              {lvl.next && (
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                  <LevelIcon level={lvl.level + 1} className="size-6 opacity-80" />{lvl.next.name} için {hrs(lvl.toNext)} kaldı
                </p>
              )}
            </CardContent>
          </Card>

        </div>
      </div>

      <Dialog open={custom} onOpenChange={setCustom}>
        <DialogContent>
          <DialogHeader><DialogTitle>Farklı mesai</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Giriş yöntemi">
            <Button type="button" role="radio" aria-checked={!byExit} variant={!byExit ? "default" : "secondary"} onClick={() => setByExit(false)}>Saat gir</Button>
            <Button type="button" role="radio" aria-checked={byExit} variant={byExit ? "default" : "secondary"} onClick={() => setByExit(true)} disabled={!workEnd}>Çıkış saatine göre</Button>
          </div>
          {byExit ? (
            <div className="space-y-1.5">
              <label htmlFor="exit-time" className="text-sm font-medium">Bugün kaçta çıktın?</label>
              <Input id="exit-time" type="time" value={exitTime} onChange={(e) => setExitTime(e.target.value)} />
              <p className="text-xs text-muted-foreground">
                Normal çıkışın {workEnd}. {exitTime ? (exitHours > 0 ? <>Mesai: <b className="text-foreground">{hrs(exitHours)}</b></> : "Bu çıkış saatinde mesai oluşmaz.") : "Çıkış saatini girince fazla süre otomatik hesaplanır."}
              </p>
            </div>
          ) : (
            <Input type="number" step="0.25" min="0" max="24" placeholder="Örn. 4" value={customHours} onChange={(e) => setCustomHours(e.target.value)} />
          )}
          <label className="flex items-center justify-between text-sm">Resmi tatilde çalıştım (tatil çarpanı)<Switch checked={onHoliday} onCheckedChange={setOnHoliday} /></label>
          <Button onClick={() => {
            const h = byExit ? exitHours : parseFloat(customHours);
            if (!(h > 0)) return;
            if (byExit) add(onHoliday ? "holiday" : "overtime", h, workEnd, exitTime, true);
            else add(onHoliday ? "holiday" : "overtime", h, null, null, true);
            setCustom(false); setCustomHours(""); setExitTime("");
          }}>Ekle</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
