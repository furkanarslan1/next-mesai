import { goalProgress, hhmm, hrs, levelFor, overtimeAfter } from "@mesai/core/calc";
import { dayRules } from "@mesai/core/day";
import { errorText } from "@mesai/core/errors";
import { holidayName } from "@mesai/core/holidays";
import { parseNum } from "@mesai/core/num";
import { TYPE_META, type Entry, type EntryType } from "@mesai/core/types";
import DateTimePicker from "@react-native-community/datetimepicker";
import { format, parseISO } from "date-fns";
import { tr } from "date-fns/locale";
import { CalendarDays, Check, ChevronDown, Plus, Sparkles } from "lucide-react-native";
import { useOptimistic, useState, useTransition } from "react";
import { Platform, Pressable, RefreshControl, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CalendarGrid } from "@/components/calendar-grid";
import { FormSection, NumberRow, Segmented, SwitchRow } from "@/components/form";
import { GoalHero, MonthSummary } from "@/components/goal-hero";
import { LevelIcon } from "@/components/level-icon";
import { Sheet } from "@/components/sheet";
import { ShortcutButton } from "@/components/shortcut-button";
import { StatusIcon } from "@/components/status-icon";
import { toast } from "@/components/toast";
import { TodayCard } from "@/components/today-card";
import { Button, Card, TAB_BAR_SPACE, Txt } from "@/components/ui";
import { confirm, haptic } from "@/lib/haptics";
import { monthKey, mutate, useMonthEntries, useProfile, useSettings, useShortcuts, useTotalHours } from "@/lib/store";
import { radius, useColors } from "@/theme";

const STATUS: EntryType[] = ["paid_leave", "unpaid_leave", "sick", "absent", "holiday"];
const STATUS_HINT: Record<string, string> = {
  paid_leave: "Maaş kesilmez", unpaid_leave: "Maaştan düşer", sick: "Doktor raporu", absent: "Habersiz", holiday: "Çalışılmadı",
};
type Opt = { add: Entry } | { remove: string };
const isWork = (e: { type: string }) => e.type === "overtime" || e.type === "holiday";
const fmtHours = (h: number) => `${(+h.toFixed(2)).toLocaleString("tr-TR", { maximumFractionDigits: 2 })} saat`;
const tmpId = () => `tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`;

/** Ana sayfa: web'deki ana sayfanın aynısı (tarih seçici, Bugün kartı, hedef, kısayollar, durum kartları, seviye). */
export default function Home() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const today = new Date();
  const todayStr = format(today, "yyyy-MM-dd");
  const profile = useProfile();
  const userId = profile?.id ?? "";
  const [date, setDate] = useState(todayStr);
  // Gece yarısı geçince, "bugün"e bakıyorsan tarih de yeni güne geçsin
  const [seenToday, setSeenToday] = useState(todayStr);
  if (seenToday !== todayStr) {
    if (date === seenToday) setDate(todayStr);
    setSeenToday(todayStr);
  }
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerMonth, setPickerMonth] = useState(() => parseISO(todayStr));
  const key = monthKey(parseISO(date));
  const realEntries = useMonthEntries(key);
  const pickerEntries = useMonthEntries(monthKey(pickerMonth));
  const settings = useSettings();
  const shortcuts = useShortcuts();
  const realTotal = useTotalHours();
  const [entries, applyOpt] = useOptimistic(realEntries ?? [], (list, a: Opt) =>
    "add" in a ? [...list, a.add] : list.filter((e) => e.id !== a.remove));
  const [, startTransition] = useTransition();
  const [refreshing, setRefreshing] = useState(false);

  // "Farklı mesai" paneli
  const [custom, setCustom] = useState(false);
  const [customHours, setCustomHours] = useState("");
  const [byExit, setByExit] = useState(false);
  const [exitTime, setExitTime] = useState("");
  const [showTime, setShowTime] = useState(false);
  const [onHoliday, setOnHoliday] = useState(false);

  const holiday = holidayName(date);
  const workEnd = settings?.work_end ? hhmm(settings.work_end) : "";
  const exitHours = overtimeAfter(workEnd, exitTime);
  const customValid = byExit ? exitHours : parseNum(customHours);

  const pendingDelta = entries.filter(isWork).reduce((a, e) => a + Number(e.hours), 0)
    - (realEntries ?? []).filter(isWork).reduce((a, e) => a + Number(e.hours), 0);
  const totalHours = (realTotal ?? 0) + pendingDelta;
  const lvl = levelFor(totalHours);

  const todays = entries.filter((e) => e.work_date === date);
  const rules = dayRules(todays, date);
  const isStatusRow = (e: Entry) => STATUS.includes(e.type) && !(e.type === "holiday" && Number(e.hours) > 0);
  const activeStatus = todays.find(isStatusRow);
  const workEntry = todays.find((e) => isWork(e) && Number(e.hours) > 0);
  const dayLabel = format(parseISO(date), "d MMMM", { locale: tr });
  const todayHours = todays.filter(isWork).reduce((a, e) => a + Number(e.hours), 0);
  const monthHours = entries.filter(isWork).reduce((a, e) => a + Number(e.hours), 0);
  const isToday = date === todayStr;

  function add(type: EntryType, hours: number, start?: string | null, end?: string | null, undo = false, shortcutId?: string) {
    const isWorkRow = type === "overtime" || (type === "holiday" && hours > 0);
    if (isWorkRow && rules.work) return toast.info("Bu güne zaten mesai girdin. Önce onu geri al.");
    if (isWorkRow && rules.off) return toast.info(`Bu gün "${TYPE_META[rules.off.type].label}" olarak işaretli. Mesai eklemek için önce onu geri al.`);
    if (!isWorkRow && type !== "holiday" && rules.work) return toast.info("Bu güne mesai girilmiş. İzin/rapor işaretlemek için önce mesaiyi geri al.");
    if (!userId) return toast.info("Hesap bilgileri yükleniyor, birkaç saniye sonra tekrar dene");
    const row = { user_id: userId, work_date: date, type, hours, note: null, start_time: start ?? null, end_time: end ?? null, ...(shortcutId ? { shortcut_id: shortcutId } : {}) };
    startTransition(async () => {
      applyOpt({ add: { ...row, id: tmpId() } });
      try {
        const saved = await mutate.addEntry(row);
        haptic("success");
        toast.success(`${TYPE_META[type].label} eklendi`, undo ? { duration: 4500, action: { label: "Geri al", onPress: () => remove(saved) } } : undefined);
      } catch (e) { toast.error(errorText(e, "Eklenemedi")); }
    });
  }
  function remove(e: Entry) {
    startTransition(async () => {
      applyOpt({ remove: e.id });
      try { await mutate.removeEntry(e); } catch (err) { toast.error(errorText(err, "Silinemedi")); }
    });
  }
  function askStatus(t: EntryType) {
    const existing = todays.find((e) => e.type === t && isStatusRow(e));
    if (existing) confirm({ title: `${TYPE_META[t].label} geri alınsın mı?`, desc: `${dayLabel} tarihindeki "${TYPE_META[t].label}" kaydı silinecek.`, yes: "Evet, geri al", run: () => remove(existing) });
    else if (!activeStatus) confirm({ title: `${TYPE_META[t].label} olarak işaretlensin mi?`, desc: `${dayLabel} günü "${TYPE_META[t].label}" olarak kaydedilecek. Bir gün için tek durum seçilebilir.`, yes: "Evet, işaretle", run: () => add(t, 0) });
  }
  const askRemoveWork = (e: Entry) => confirm({ title: "Mesai geri alınsın mı?", desc: `${dayLabel} gününün ${hrs(Number(e.hours))} mesai kaydı silinecek.`, yes: "Evet, geri al", run: () => remove(e) });

  if (profile?.role === "manager") {
    return (
      <View style={{ flex: 1, backgroundColor: c.background, paddingTop: insets.top + 16, paddingHorizontal: 16 }}>
        <Card style={{ gap: 8 }}>
          <Txt style={{ fontSize: 20, fontWeight: "700" }}>Yönetici hesabı</Txt>
          <Txt muted>Ekip paneli web uygulamasında. Mobil uygulama çalışanlar için.</Txt>
        </Card>
      </View>
    );
  }

  const status = (t: EntryType) => {
    const existing = todays.find((e) => e.type === t && isStatusRow(e));
    const pending = existing?.id.startsWith("tmp-");
    const blockedByWork = !existing && t !== "holiday" && !!workEntry;
    const locked = (!existing && !!activeStatus) || blockedByWork;
    const hint = existing ? "Geri almak için dokun" : blockedByWork ? "Bu gün mesai var" : locked ? "Önce seçileni geri al"
      : t === "sick" && (settings?.sick_leave_unpaid || settings?.sick_deducts_overtime)
        ? [settings.sick_leave_unpaid && "Maaştan düşer", settings.sick_deducts_overtime && "Mesaiden düşer"].filter(Boolean).join(" · ")
        : STATUS_HINT[t];
    return (
      <Pressable key={t} disabled={pending || locked} onPress={() => askStatus(t)} accessibilityRole="button" accessibilityState={{ selected: !!existing, disabled: pending || locked }}
        style={({ pressed }) => ({
          width: "48%", flexGrow: 1, alignItems: "center", gap: 10, padding: 16, borderRadius: radius.lg,
          backgroundColor: existing ? `${c.primary}22` : c.card, borderWidth: 1, borderColor: existing ? `${c.primary}99` : "transparent",
          opacity: locked || pending ? 0.45 : 1, transform: [{ scale: pressed ? 0.97 : 1 }],
          shadowColor: "#071b2b", shadowOpacity: 0.07, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 2,
        })}>
        <View style={{ width: 48, height: 48, alignItems: "center", justifyContent: "center", borderRadius: radius.md, backgroundColor: existing ? c.primary : "transparent" }}>
          {existing ? <Check size={24} color={c.primaryForeground} /> : <StatusIcon type={t} size={44} />}
        </View>
        <View style={{ alignItems: "center" }}>
          <Txt style={{ fontSize: 14, fontWeight: "600" }}>{TYPE_META[t].label}</Txt>
          <Txt muted style={{ fontSize: 12, textAlign: "center" }}>{hint}</Txt>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: TAB_BAR_SPACE + insets.bottom, paddingHorizontal: 16, gap: 20 }}
        refreshControl={<RefreshControl refreshing={refreshing} tintColor={c.tint}
          onRefresh={async () => { setRefreshing(true); try { await mutate.refresh.everything(); } finally { setRefreshing(false); } }} />}>
        {/* Başlık + tarih seçici */}
        <View style={{ gap: 4 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 36 }}>
            <Txt muted style={{ fontSize: 13, fontWeight: "600", letterSpacing: 0.4, textTransform: "uppercase" }}>{format(today, "d MMMM EEEE", { locale: tr })}</Txt>
            <Pressable onPress={() => { haptic(); setPickerMonth(parseISO(date)); setPickerOpen(true); }} accessibilityLabel="Tarih seç"
              style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 6, height: 36, paddingLeft: 12, paddingRight: 10, borderRadius: 18, backgroundColor: c.primary, opacity: pressed ? 0.85 : 1 })}>
              <CalendarDays size={17} color={c.primaryForeground} />
              <Txt style={{ fontSize: 14, fontWeight: "600", color: c.primaryForeground }}>{isToday ? "Bugün" : format(parseISO(date), "d MMM", { locale: tr })}</Txt>
              <ChevronDown size={15} color={c.primaryForeground} />
            </Pressable>
          </View>
          <Txt style={{ fontSize: 34, lineHeight: 41, fontWeight: "700", letterSpacing: -0.7 }} numberOfLines={1} adjustsFontSizeToFit>
            {profile?.full_name ? `Merhaba, ${profile.full_name.split(" ")[0]}` : "Merhaba"}
          </Txt>
        </View>

        {!isToday ? (
          <Card style={{ padding: 14, flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Txt style={{ flex: 1, fontSize: 14 }}>{date < todayStr ? "Geçmiş bir günü düzenliyorsun" : "Gelecek bir güne bakıyorsun"}: <Txt style={{ fontWeight: "700", fontSize: 14 }}>{dayLabel}</Txt></Txt>
            <Pressable onPress={() => setDate(todayStr)} style={{ paddingHorizontal: 12, height: 34, borderRadius: 17, justifyContent: "center", backgroundColor: c.muted }}>
              <Txt style={{ fontSize: 13, fontWeight: "600" }}>Bugüne dön</Txt>
            </Pressable>
          </Card>
        ) : null}

        {isToday && settings && realEntries ? (
          <TodayCard settings={settings} entries={todays} holiday={holiday}
            onAddUntil={(exit, h) => confirm({
              title: "Mesai eklensin mi?", desc: `Normal çıkışın ${workEnd}, şu an ${exit}. Bugüne ${hrs(h)} ${rules.isHoliday ? "resmi tatil mesaisi" : "mesai"} eklenecek.`,
              yes: "Evet, ekle", run: () => add(rules.workType, h, workEnd, exit, true),
            })} />
        ) : null}

        {holiday && !activeStatus ? (
          <Card style={{ padding: 14, flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Sparkles size={18} color="#f59e0b" />
            <Txt style={{ flex: 1, fontWeight: "600" }}>{holiday}</Txt>
            <Pressable onPress={() => askStatus("holiday")} style={{ paddingHorizontal: 12, height: 34, borderRadius: 17, justifyContent: "center", backgroundColor: c.muted }}>
              <Txt style={{ fontSize: 13, fontWeight: "600" }}>Tatil olarak işaretle</Txt>
            </Pressable>
          </Card>
        ) : null}

        {settings && realEntries && userId ? (
          <GoalHero userId={userId} settings={settings} entries={entries} monthLabel={format(parseISO(date), "LLLL yyyy", { locale: tr })}
            today={date.slice(0, 7) === todayStr.slice(0, 7) ? today : undefined} />
        ) : (
          <Card style={{ height: 248, opacity: 0.6 }} />
        )}

        <View style={{ flexDirection: "row", gap: 12 }}>
          <Card style={{ flex: 1, padding: 14, alignItems: "center", borderRadius: radius.lg }}>
            <Txt muted style={{ fontSize: 12 }}>{isToday ? "Bugünün mesaisi" : `${dayLabel} mesaisi`}</Txt>
            <Txt style={{ fontSize: 20, fontWeight: "700" }}>{hrs(todayHours)}</Txt>
          </Card>
          <Card style={{ flex: 1, padding: 14, alignItems: "center", borderRadius: radius.lg }}>
            <Txt muted style={{ fontSize: 12, textTransform: "capitalize" }}>{format(parseISO(date), "LLLL", { locale: tr })} toplamı</Txt>
            <Txt style={{ fontSize: 20, fontWeight: "700" }}>{hrs(monthHours)}</Txt>
          </Card>
        </View>

        {/* Mesai kısayolları */}
        <View style={{ gap: 10 }}>
          <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" }}>
            <Txt style={{ fontWeight: "700", fontSize: 16 }}>Mesai kısayolları</Txt>
            <Txt muted style={{ fontSize: 12 }}>Ekle · tekrar dokun, geri al</Txt>
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
            {(shortcuts ?? []).map((s) => {
              const existing = [...todays].reverse().find((e) => isWork(e) && Number(e.hours) > 0 && e.shortcut_id === s.id);
              return (
                <View key={s.id} style={{ width: "47%", flexGrow: 1 }}>
                  <ShortcutButton label={fmtHours(Number(s.hours))} hoursText={hrs(Number(s.hours))}
                    hint={!existing && workEntry ? "Bugün mesai var" : !existing && rules.off ? TYPE_META[rules.off.type].label : s.start_time ? `${hhmm(s.start_time)}–${hhmm(s.end_time)}` : "Dokun, ekle"}
                    active={!!existing} disabled={existing?.id.startsWith("tmp-") || (!existing && (!!workEntry || !!rules.off))}
                    onPress={() => confirm(existing
                      ? { title: "Mesai geri alınsın mı?", desc: `${hrs(Number(s.hours))} mesai kaydı silinecek.`, yes: "Evet, geri al", run: () => remove(existing) }
                      : { title: "Mesai eklensin mi?", desc: `${dayLabel} tarihine ${hrs(Number(s.hours))} ${rules.isHoliday ? "resmi tatil mesaisi (tatil oranıyla)" : "mesai"} eklenecek.`, yes: "Evet, ekle", run: () => add(rules.workType, Number(s.hours), s.start_time, s.end_time, false, s.id) })} />
                </View>
              );
            })}
            {/* "Farklı mesai" ile girilen kayıt da kısayol gibi görünür; dokununca geri alınır */}
            {workEntry && !(shortcuts ?? []).some((x) => x.id === workEntry.shortcut_id) ? (
              <View style={{ width: "47%", flexGrow: 1 }}>
                <ShortcutButton label={fmtHours(Number(workEntry.hours))} hoursText={hrs(Number(workEntry.hours))}
                  hint={workEntry.start_time ? `${hhmm(workEntry.start_time)}–${hhmm(workEntry.end_time)}` : workEntry.type === "holiday" ? "Resmi tatil" : "Farklı mesai"}
                  active disabled={workEntry.id.startsWith("tmp-")} onPress={() => askRemoveWork(workEntry)} />
              </View>
            ) : null}
          </View>
          {!workEntry && !rules.off ? (
            <Pressable onPress={() => { haptic(); setOnHoliday(rules.isHoliday); setCustom(true); }}
              style={({ pressed }) => ({ marginTop: 8, height: 50, borderRadius: radius.pill, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: c.card, opacity: pressed ? 0.8 : 1,
                shadowColor: "#071b2b", shadowOpacity: 0.07, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 2 })}>
              <Plus size={16} color={c.foreground} /><Txt style={{ fontWeight: "500" }}>Farklı mesai ekle</Txt>
            </Pressable>
          ) : null}
        </View>

        {/* İşe gitmedin mi? */}
        <View style={{ gap: 12 }}>
          <View>
            <Txt style={{ fontWeight: "700", fontSize: 16 }}>{isToday ? "Bugün" : dayLabel} işe gitmedin mi?</Txt>
            <Txt muted style={{ fontSize: 12 }}>Nedenini seç, takvimine işlensin. Tekrar dokunursan geri alınır.</Txt>
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>{STATUS.map(status)}</View>
        </View>

        {settings && realEntries && goalProgress(entries, settings).set ? (
          <Card><MonthSummary entries={entries} settings={settings} /></Card>
        ) : null}

        {/* Seviye */}
        <Card style={{ gap: 12, opacity: realTotal === null ? 0 : 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <LevelIcon level={lvl.level} size={56} />
              <View>
                <Txt muted style={{ fontSize: 12 }}>Seviye {lvl.level}</Txt>
                <Txt style={{ fontSize: 18, fontWeight: "600" }}>{lvl.name}</Txt>
              </View>
            </View>
            <Txt muted style={{ fontSize: 14 }}>{hrs(totalHours)} toplam</Txt>
          </View>
          <View style={{ height: 8, borderRadius: 4, backgroundColor: c.muted, overflow: "hidden" }}>
            <View style={{ height: "100%", width: `${Math.min(100, lvl.progress)}%`, backgroundColor: c.ring, borderRadius: 4 }} />
          </View>
          {lvl.next ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <LevelIcon level={lvl.level + 1} size={24} />
              <Txt muted style={{ fontSize: 12 }}>{lvl.next.name} için {hrs(lvl.toNext)} kaldı</Txt>
            </View>
          ) : null}
        </Card>
      </ScrollView>

      {/* Tarih seçici */}
      <Sheet open={pickerOpen} onClose={() => setPickerOpen(false)}>
        <CalendarGrid month={pickerMonth} onMonthChange={setPickerMonth} value={date} today={todayStr}
          marked={new Set((pickerEntries ?? []).map((e) => e.work_date))}
          onSelect={(d) => { setDate(d); setPickerOpen(false); }} />
        <Button title="Bugüne dön" variant="ghost" onPress={() => { setDate(todayStr); setPickerOpen(false); }} />
      </Sheet>

      {/* Farklı mesai */}
      <Sheet open={custom} onClose={() => setCustom(false)} title="Farklı mesai">
        <Segmented value={byExit ? "exit" : "hours"} onChange={(v) => setByExit(v === "exit")}
          options={[{ value: "hours", label: "Saat gir" }, { value: "exit", label: "Çıkış saatine göre", disabled: !workEnd }]} />
        {byExit ? (
          <FormSection footer={exitTime
            ? (exitHours > 0 ? `Normal çıkışın ${workEnd}. Mesai: ${hrs(exitHours)}` : `Normal çıkışın ${workEnd}. Bu çıkış saatinde mesai oluşmaz.`)
            : `Normal çıkışın ${workEnd}. Çıkış saatini seçince fazla süre otomatik hesaplanır.`}>
            <Pressable onPress={() => setShowTime(true)} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, minHeight: 52 }}>
              <Txt style={{ fontSize: 15, fontWeight: "500" }}>Kaçta çıktın?</Txt>
              <Txt style={{ fontSize: 17, fontWeight: "700", color: exitTime ? c.foreground : c.mutedForeground }}>{exitTime || "Seç"}</Txt>
            </Pressable>
            {showTime ? (
              <DateTimePicker mode="time" is24Hour locale="tr-TR" display={Platform.OS === "ios" ? "spinner" : "default"}
                value={(() => { const d = new Date(); const [h, m] = (exitTime || workEnd || "18:00").split(":").map(Number); d.setHours(h, m, 0, 0); return d; })()}
                onChange={(ev, d) => {
                  if (Platform.OS !== "ios") setShowTime(false);
                  if (ev.type === "set" && d) setExitTime(`${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`);
                }} />
            ) : null}
          </FormSection>
        ) : (
          <FormSection>
            <NumberRow label="Mesai" suffix="saat" placeholder="Örn. 4" value={customHours} onChange={setCustomHours} />
          </FormSection>
        )}
        <FormSection>
          <SwitchRow label="Resmi tatilde çalıştım" hint="Tatil oranıyla hesaplanır" value={onHoliday} onChange={setOnHoliday} />
        </FormSection>
        <Button title="Ekle" disabled={!(customValid > 0 && customValid <= 24)} onPress={() => {
          const h = customValid;
          if (!(h > 0 && h <= 24)) return;
          add(onHoliday ? "holiday" : "overtime", h, byExit ? workEnd : null, byExit ? exitTime : null, true);
          setCustom(false); setCustomHours(""); setExitTime(""); setShowTime(false);
        }} />
      </Sheet>
    </View>
  );
}
