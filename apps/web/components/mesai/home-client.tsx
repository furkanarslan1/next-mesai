"use client";

import { parseNum } from "@mesai/core/num";
import { errorText } from "@mesai/core/errors";
import { useEffect, useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { tr } from "date-fns/locale";
import { toast } from "sonner";
import { CalendarDays, Check, ChevronDown, Plus, Sparkles } from "lucide-react";
import { monthKey, mutate, useMonthEntries, useProfile, useSettings, useShortcuts, useTotalHours } from "@/lib/store";
import { realTap } from "@/lib/tap";
import { useToday } from "@/lib/now";
import { holidayName } from "@mesai/core/holidays";
import { dayRules } from "@mesai/core/day";
import { goalProgress, hhmm, levelFor, hrs, overtimeAfter } from "@mesai/core/calc";
import { TYPE_META, type Entry, type EntryType } from "@mesai/core/types";
import { ShortcutButton } from "@/components/mesai/shortcut-button";
import { DatePicker } from "@/components/mesai/date-picker";
import { StatusIcon } from "@/components/mesai/status-icon";
import { LevelIcon } from "@/components/mesai/level-icon";
import { Celebrate, usePop, useRiseBurst } from "@/components/mesai/celebrate";
import { FormRow, FormSection, NumberRow, Segmented, SwitchRow } from "@/components/mesai/ios-form";
import { ReminderCard } from "@/components/mesai/reminder-card";
import { MonthSummary } from "@/components/mesai/month-summary";
import { GoalHero } from "@/components/mesai/goal-hero";
import { fmtHours } from "@/components/mesai/hours-chips";
import { Page } from "@/components/mesai/page";
import { TodayCard } from "@/components/mesai/today-card";
import { Onboarding } from "@/components/mesai/onboarding";
import { AnimatedNumber } from "@/components/mesai/animated-number";
import { haptic } from "@/lib/haptics";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const STATUS: EntryType[] = ["paid_leave", "unpaid_leave", "sick", "absent", "holiday"];
const STATUS_META: Record<string, { hint: string }> = {
  paid_leave: { hint: "Maaş kesilmez" },
  unpaid_leave: { hint: "Maaştan düşer" },
  sick: { hint: "Doktor raporu" },
  absent: { hint: "Habersiz" },
  holiday: { hint: "Çalışılmadı" },
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
  const todayStr = format(today, "yyyy-MM-dd");
  const [date, setDate] = useState(todayStr);
  // Gece yarısı geçince, "bugün"e bakıyorsan tarih de yeni güne geçsin
  const [pickerOpen, setPickerOpen] = useState(false);
  const [seenToday, setSeenToday] = useState(todayStr);
  if (seenToday !== todayStr) {
    if (date === seenToday) setDate(todayStr);
    setSeenToday(todayStr);
  }
  // Yanlışlıkla dokunmaya karşı: kısayol eklemeden/geri almadan önce Evet/Hayır sorulur
  const [confirm, setConfirm] = useState<{ title: string; desc: string; yes: string; run: () => void } | null>(null);
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
  const customValid = byExit ? exitHours : parseNum(customHours);

  // Seviye için toplam saat: gerçek toplam + henüz sunucuya yazılmamış anlık fark
  const pendingDelta = entries.filter(isWork).reduce((a, e) => a + Number(e.hours), 0)
    - (realEntries ?? []).filter(isWork).reduce((a, e) => a + Number(e.hours), 0);
  const totalHours = (realTotal ?? 0) + pendingDelta;
  const lvl = levelFor(totalHours);
  const lvlBurst = useRiseBurst("level", lvl.level, realTotal !== null);
  const lvlRef = usePop<HTMLSpanElement>(lvlBurst);

  function add(type: EntryType, hours: number, start?: string | null, end?: string | null, undo = false, shortcutId?: string) {
    const isWorkRow = type === "overtime" || (type === "holiday" && hours > 0);
    if (isWorkRow && rules.work) { toast.info("Bu güne zaten mesai girdin. Önce onu geri al."); return; }
    if (isWorkRow && rules.off) { toast.info(`Bu gün "${TYPE_META[rules.off.type].label}" olarak işaretli. Mesai eklemek için önce onu geri al.`); return; }
    if (!isWorkRow && type !== "holiday" && rules.work) { toast.info("Bu güne mesai girilmiş. İzin/rapor işaretlemek için önce mesaiyi geri al."); return; }
    if (!userId) { toast.info("Hesap bilgileri yükleniyor, birkaç saniye sonra tekrar dene"); return; }
    const row = { user_id: userId, work_date: date, type, hours, note: null, start_time: start ?? null, end_time: end ?? null, ...(shortcutId ? { shortcut_id: shortcutId } : {}) };
    startTransition(async () => {
      applyOpt({ add: { ...row, id: `tmp-${crypto.randomUUID()}` } });
      try {
        const saved = await mutate.addEntry(row);
        haptic("success");
        // Kısayol/durum kartları ikinci dokunuşla geri alır; "Farklı mesai"nin geri alma yolu bu bildirimdeki düğme
        toast.success(`${TYPE_META[type].label} eklendi`, undo ? { duration: 4500, action: { label: "Geri al", onClick: () => remove(saved) } } : undefined);
      }
      catch (e) { toast.error(errorText(e, "Eklenemedi")); }
    });
  }
  function remove(e: Entry) {
    startTransition(async () => {
      applyOpt({ remove: e.id });
      try { await mutate.removeEntry(e); }
      catch (err) { toast.error(errorText(err, "Silinemedi")); }
    });
  }

  const todays = entries.filter((e) => e.work_date === date);
  const rules = dayRules(todays, date);
  // Günün durumu (izin/rapor/gelmedim/tatil) tek olabilir; çalışılan tatil (saatli) durum sayılmaz
  const isStatusRow = (e: Entry) => STATUS.includes(e.type) && !(e.type === "holiday" && Number(e.hours) > 0);
  const activeStatus = todays.find(isStatusRow);
  const dayLabel = format(parseISO(date), "d MMMM", { locale: tr });
  function askStatus(t: EntryType) {
    const existing = todays.find((e) => e.type === t && isStatusRow(e));
    if (existing) {
      setConfirm({ title: `${TYPE_META[t].label} geri alınsın mı?`, desc: `${dayLabel} tarihindeki "${TYPE_META[t].label}" kaydı silinecek.`, yes: "Evet, geri al", run: () => remove(existing) });
    } else if (!activeStatus) {
      setConfirm({ title: `${TYPE_META[t].label} olarak işaretlensin mi?`, desc: `${dayLabel} günü "${TYPE_META[t].label}" olarak kaydedilecek.${t === "holiday" && rules.work ? " Bu günün mesaisi resmi tatil oranıyla hesaplanacak." : ""} Bir gün için tek durum seçilebilir.`, yes: "Evet, işaretle", run: () => add(t, 0) });
    }
  }
  // Günde tek mesai kaydı: mesai ya da çalışılan tatil (saatli). Varsa yenisi eklenemez, önce o geri alınmalı.
  const workEntry = todays.find((e) => (e.type === "overtime" || e.type === "holiday") && Number(e.hours) > 0);
  function askRemoveWork(e: Entry) {
    setConfirm({ title: "Mesai geri alınsın mı?", desc: `${dayLabel} gününün ${hrs(Number(e.hours))} mesai kaydı silinecek.`, yes: "Evet, geri al", run: () => remove(e) });
  }
  const todayHours = todays.filter(isWork).reduce((a, e) => a + Number(e.hours), 0);
  const monthHours = entries.filter(isWork).reduce((a, e) => a + Number(e.hours), 0);

  return (
    <Page
      eyebrow={format(parseISO(todayStr), "d MMMM EEEE", { locale: tr })}
      title={name ? `Merhaba, ${name.split(" ")[0]}` : "Merhaba"}
      accessory={
        <button type="button" onClick={() => { haptic(); setPickerOpen(true); }} aria-label="Tarih seç"
          className="glass-navy flex h-9 items-center gap-1.5 rounded-full pr-2.5 pl-3 text-sm font-semibold">
          <CalendarDays className="size-4.5 opacity-90" aria-hidden />
          <span className="tabular-nums">{format(parseISO(date), date === todayStr ? "'Bugün'" : "d MMM", { locale: tr })}</span>
          <ChevronDown className="size-4 opacity-70" aria-hidden />
        </button>
      }>
      {profile?.role === "employee" && <Onboarding />}

      <DatePicker open={pickerOpen} value={date} today={todayStr} onSelect={(d) => { setDate(d); setPickerOpen(false); }} onClose={() => setPickerOpen(false)} />

      {date !== todayStr && (
        <div className="glass r-lg flex items-center justify-between gap-3 px-4 py-3 text-sm">
          <span>{date < todayStr ? "Geçmiş bir günü düzenliyorsun" : "Gelecek bir güne bakıyorsun"}: <b>{dayLabel}</b></span>
          <Button size="sm" variant="secondary" onClick={() => setDate(todayStr)}>Bugüne dön</Button>
        </div>
      )}

      <ReminderCard todayStr={todayStr} hasRecords={todays.length > 0} isToday={date === todayStr} />

      {date === todayStr && settings && realEntries && (
        <TodayCard settings={settings} entries={todays} holiday={holiday}
          onAddUntil={(exit, h) => setConfirm({
            title: "Mesai eklensin mi?", desc: `Normal çıkışın ${workEnd}, şu an ${exit}. Bugüne ${hrs(h)} ${rules.isHoliday ? "resmi tatil mesaisi" : "mesai"} eklenecek.`,
            yes: "Evet, ekle", run: () => add(rules.workType, h, workEnd, exit, true),
          })} />
      )}

      {holiday && !activeStatus && (
        <div className="glass r-lg flex items-center justify-between px-4 py-3 text-sm">
          <span className="flex items-center gap-2 font-medium"><Sparkles className="size-4 text-amber-500" aria-hidden />{holiday}</span>
          <Button size="sm" variant="secondary" {...realTap(() => askStatus("holiday"))}>Tatil olarak işaretle</Button>
        </div>
      )}

      {settings && realEntries && userId ? (
        <GoalHero userId={userId} settings={settings} entries={entries} monthLabel={format(parseISO(date), "LLLL yyyy", { locale: tr })} today={date.slice(0, 7) === todayStr.slice(0, 7) ? today : undefined} />
      ) : (
        <div className="glass min-h-[15.5rem] w-full animate-pulse" aria-busy />
      )}

      <div className="grid grid-cols-2 gap-3">
        <Card size="sm" className="r-lg"><CardContent className="text-center">
          <p className="text-xs text-muted-foreground">{date === todayStr ? "Bugünün mesaisi" : `${dayLabel} mesaisi`}</p>
          <AnimatedNumber value={todayHours} format={hrs} className="block text-xl font-bold" />
        </CardContent></Card>
        {/* Dokununca Raporlar → Özet (hafta / ay / yıl dökümü) */}
        <Link href="/reports" transitionTypes={["nav-forward"]} aria-label="Mesai özetini aç" className="block transition active:scale-[0.97]">
          <Card size="sm" className="r-lg h-full"><CardContent className="text-center">
            <p className="text-xs text-muted-foreground">{format(parseISO(date), "LLLL", { locale: tr })} toplamı</p>
            <AnimatedNumber value={monthHours} format={hrs} className="block text-xl font-bold" />
          </CardContent></Card>
        </Link>
      </div>

      <section className="space-y-2">
        <div className="flex items-baseline justify-between">
          <h2 className="font-semibold">Mesai kısayolları</h2>
          <span className="text-xs text-muted-foreground">Ekle · tekrar dokun, geri al</span>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {shortcuts === null && [0, 1].map((i) => <div key={i} className="glass r-lg h-24 animate-pulse" aria-busy />)}
          {(shortcuts ?? []).map((s) => {
            const existing = [...todays].reverse().find((e) => isWork(e) && Number(e.hours) > 0 && e.shortcut_id === s.id);
            return (
              <ShortcutButton
                key={s.id} label={fmtHours(Number(s.hours))} hoursText={hrs(Number(s.hours))}
                hint={!existing && workEntry ? "Bugün mesai var" : !existing && rules.off ? TYPE_META[rules.off.type].label : s.start_time ? `${hhmm(s.start_time)}–${hhmm(s.end_time)}` : "Dokun, ekle"}
                active={!!existing} disabled={existing?.id.startsWith("tmp-") || (!existing && (!!workEntry || !!rules.off))}
                onPress={() => setConfirm(existing
                  ? { title: "Mesai geri alınsın mı?", desc: `${hrs(Number(s.hours))} mesai kaydı silinecek.`, yes: "Evet, geri al", run: () => remove(existing) }
                  : { title: "Mesai eklensin mi?", desc: `${format(parseISO(date), "d MMMM", { locale: tr })} tarihine ${hrs(Number(s.hours))} ${rules.isHoliday ? "resmi tatil mesaisi (tatil oranıyla)" : "mesai"} eklenecek.`, yes: "Evet, ekle", run: () => add(rules.workType, Number(s.hours), s.start_time, s.end_time, false, s.id) })}
              />
            );
          })}
          {/* "Farklı mesai" ile girilen (ya da silinmiş kısayoldan gelen) kayıt da kısayol gibi görünür; dokununca geri alınır */}
          {workEntry && !(shortcuts ?? []).some((x) => x.id === workEntry.shortcut_id) && (
            <ShortcutButton
              label={fmtHours(Number(workEntry.hours))} hoursText={hrs(Number(workEntry.hours))}
              hint={workEntry.start_time ? `${hhmm(workEntry.start_time)}–${hhmm(workEntry.end_time)}` : workEntry.type === "holiday" ? "Resmi tatil" : "Farklı mesai"}
              active disabled={workEntry.id.startsWith("tmp-")}
              onPress={() => askRemoveWork(workEntry)}
            />
          )}
        </div>
        {!workEntry && !rules.off && (
          <button type="button" {...realTap(() => { setOnHoliday(rules.isHoliday); setCustom(true); })}
            className="glass r-pill mt-5 flex w-full items-center justify-center gap-2 py-3.5 text-sm font-medium">
            <Plus className="size-4" />Farklı mesai ekle
          </button>
        )}
      </section>

      <div className="grid items-start gap-5 md:grid-cols-2">
        <section className="space-y-3">
          <div>
            <h2 className="font-semibold">{date === todayStr ? "Bugün" : dayLabel} işe gitmedin mi?</h2>
            <p className="text-xs text-muted-foreground">Nedenini seç, takvimine işlensin. Tekrar dokunursan geri alınır.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {STATUS.map((t) => {
              const m = STATUS_META[t];
              const existing = todays.find((e) => e.type === t && isStatusRow(e));
              const pending = existing?.id.startsWith("tmp-");
              // Başka bir durum seçiliyse bu kart kilitlenir; önce seçili olan geri alınmalı
              const blockedByWork = !existing && t !== "holiday" && !!workEntry;
              const locked = (!existing && !!activeStatus) || blockedByWork;
              return (
                <button
                  key={t} type="button" disabled={pending || locked} aria-pressed={!!existing}
                  {...realTap(() => askStatus(t))}
                  className={`glass r-lg relative flex flex-col items-center gap-2.5 p-4 text-center transition active:scale-[0.97] disabled:opacity-50 ${locked ? "grayscale" : ""} ${existing ? "!border-primary/60 !bg-primary/15" : ""}`}
                >
                  <span className={`grid size-12 place-items-center ${existing ? "r-md bg-primary text-primary-foreground" : ""}`}>
                    {existing ? <Check className="size-6" /> : <StatusIcon type={t} className="size-11" />}
                  </span>
                  <span>
                    <span className="block text-sm font-semibold leading-tight">{TYPE_META[t].label}</span>
                    <span className="mt-0.5 block text-xs leading-tight text-muted-foreground">{existing ? "Geri almak için dokun" : blockedByWork ? "Bu gün mesai var" : locked ? "Önce seçileni geri al" : t === "sick" && (settings?.sick_leave_unpaid || settings?.sick_deducts_overtime) ? [settings.sick_leave_unpaid && "Maaştan düşer", settings.sick_deducts_overtime && "Mesaiden düşer"].filter(Boolean).join(" · ") : m.hint}</span>
                  </span>
                </button>
              );
            })}
          </div>
          {/* Hedef belirlenmişse özet burada; hedef yokken hedef kartının içinde görünür */}
          {settings && realEntries && goalProgress(entries, settings).set && (
            <div className="glass mt-2 p-5 sm:p-6"><MonthSummary entries={entries} settings={settings} /></div>
          )}
        </section>

        <div className="space-y-5">
          <Card className={`transition-opacity duration-300 ${realTotal === null ? "opacity-0" : ""}`}>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {/* Seviye atlanınca: ikon bir kez "pop" + parçacık patlaması */}
                  <span ref={lvlRef} className="relative grid shrink-0 place-items-center">
                    <Celebrate burst={lvlBurst} distance={44} />
                    <LevelIcon level={lvl.level} className="size-14" />
                  </span>
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

      <Dialog open={!!confirm} onOpenChange={(o) => { if (!o) setConfirm(null); }}>
        <DialogContent showCloseButton={false} className="gap-7 p-7 sm:max-w-md">
          <DialogHeader className="gap-2.5">
            <DialogTitle className="text-xl leading-snug">{confirm?.title}</DialogTitle>
            <DialogDescription className="text-base leading-relaxed">{confirm?.desc}</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <Button variant="secondary" autoFocus className="h-14 text-base font-semibold" onClick={() => setConfirm(null)}>Hayır</Button>
            <Button className="h-14 text-base font-semibold" onClick={() => { const c = confirm; setConfirm(null); haptic(); c?.run(); }}>{confirm?.yes ?? "Evet"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={custom} onOpenChange={setCustom}>
        <DialogContent className="gap-5 p-5 sm:max-w-md">
          <DialogHeader><DialogTitle className="text-lg">Farklı mesai</DialogTitle></DialogHeader>
          <Segmented label="Giriş yöntemi" value={byExit ? "exit" : "hours"} onChange={(v) => setByExit(v === "exit")}
            options={[{ value: "hours", label: "Saat gir" }, { value: "exit", label: "Çıkış saatine göre", disabled: !workEnd }]} />
          {byExit ? (
            <FormSection tone="muted" footer={<>Normal çıkışın {workEnd}. {exitTime ? (exitHours > 0 ? <>Mesai: <b className="text-foreground">{hrs(exitHours)}</b></> : "Bu çıkış saatinde mesai oluşmaz.") : "Çıkış saatini girince fazla süre otomatik hesaplanır."}</>}>
              <FormRow label="Bugün kaçta çıktın?">
                <input id="exit-time" type="time" value={exitTime} onChange={(e) => setExitTime(e.target.value)} aria-label="Çıkış saati"
                  className="h-11 rounded-full bg-card dark:bg-background px-4 text-[17px] font-semibold tabular-nums outline-none" />
              </FormRow>
            </FormSection>
          ) : (
            <FormSection tone="muted">
              <NumberRow label="Mesai" suffix="saat" placeholder="Örn. 4" value={customHours} onChange={setCustomHours} />
            </FormSection>
          )}
          <FormSection tone="muted">
            <SwitchRow label="Resmi tatilde çalıştım" hint="Tatil oranıyla hesaplanır" checked={onHoliday} onChange={setOnHoliday} />
          </FormSection>
          <Button className="h-14 text-base font-semibold" disabled={!(customValid > 0 && customValid <= 24)} onClick={() => {
            const h = customValid;
            if (!(h > 0 && h <= 24)) return;
            if (byExit) add(onHoliday ? "holiday" : "overtime", h, workEnd, exitTime, true);
            else add(onHoliday ? "holiday" : "overtime", h, null, null, true);
            setCustom(false); setCustomHours(""); setExitTime("");
          }}>Ekle</Button>
        </DialogContent>
      </Dialog>
    </Page>
  );
}
