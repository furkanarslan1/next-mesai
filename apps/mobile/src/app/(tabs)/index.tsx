import { goalProgress, hhmm, hrs, levelFor, overtimeAfter } from "@mesai/core/calc";
import { scheduleFor } from "@mesai/core/shift";
import { dayRules } from "@mesai/core/day";
import { errorText } from "@mesai/core/errors";
import { holidayName } from "@mesai/core/holidays";
import { parseNum } from "@mesai/core/num";
import { TYPE_META, type Entry, type EntryType } from "@mesai/core/types";
import DateTimePicker from "@react-native-community/datetimepicker";
import { router } from "expo-router";
import { format } from "date-fns/format";
import { parseISO } from "date-fns/parseISO";
import { tr } from "date-fns/locale/tr";
import { Skeleton } from "@/components/skeleton";
import { CalendarDays, Check, ChevronDown, Plus, Sparkles } from "@/components/icons";
import { useOptimistic, useState, useTransition } from "react";
import { Platform, Pressable, RefreshControl, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CalendarGrid } from "@/components/calendar-grid";
import { Celebrate, usePop, useRiseBurst } from "@/components/celebrate";
import { AnimatedNumber } from "@/components/animated-number";
import { confirm, Dialog } from "@/components/dialog";
import { FormRow, FormSection, NumberRow, Segmented, SwitchRow } from "@/components/form";
import { GoalHero, MonthSummary } from "@/components/goal-hero";
import { LevelIcon } from "@/components/level-icon";
import { Onboarding } from "@/components/onboarding";
import { ReminderCard } from "@/components/reminder-card";
import { useTabRise } from "@/components/tab-rise";
import Reanimated from "react-native-reanimated";
import { PageStack, Sheet } from "@/components/sheet";
import { ShortcutButton } from "@/components/shortcut-button";
import { StatusIcon } from "@/components/status-icon";
import { toast } from "@/components/toast";
import { TodayCard } from "@/components/today-card";
import { Button, Card, COMPACT_AT, CompactBar, Eyebrow, TAB_BAR_SPACE, Txt } from "@/components/ui";
import { haptic } from "@/lib/haptics";
import { useToday } from "@/lib/now";
import { monthKey, mutate, useMonthEntries, useProfile, useSettings, useShortcuts, useTotalHours } from "@/lib/store";
import { alpha, radius, space, useColors } from "@/theme";

const STATUS: EntryType[] = ["paid_leave", "unpaid_leave", "sick", "absent", "holiday"];
const STATUS_HINT: Record<string, string> = {
  paid_leave: "Maaş kesilmez", unpaid_leave: "Maaştan düşer", sick: "Doktor raporu", absent: "Habersiz", holiday: "Çalışılmadı",
};
type Opt = { add: Entry } | { remove: string };
const isWork = (e: { type: string }) => e.type === "overtime" || e.type === "holiday";
const fmtHours = (h: number) => `${(+h.toFixed(2)).toLocaleString("tr-TR", { maximumFractionDigits: 2 })} saat`;
const tmpId = () => `tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
/** Web'deki 2 sütunlu ızgara: satır satır, tek kalan öğe yarım genişlikte kalır */
const pairs = <T,>(list: T[]) => Array.from({ length: Math.ceil(list.length / 2) }, (_, i) => list.slice(i * 2, i * 2 + 2));

/** Ana sayfa: web'deki ana sayfanın (components/mesai/home-client.tsx) birebir aynısı. */
export default function Home() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const today = useToday();
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
  const [compact, setCompact] = useState(false);
  // Sekmeye geçince içerik hafifçe yükselir (web: vt-rise)
  const rise = useTabRise();

  // "Farklı mesai" penceresi
  const [custom, setCustom] = useState(false);
  const [absenceOpen, setAbsenceOpen] = useState(false);
  const [customHours, setCustomHours] = useState("");
  const [byExit, setByExit] = useState(false);
  const [exitTime, setExitTime] = useState("");
  const [showTime, setShowTime] = useState(false);
  const [onHoliday, setOnHoliday] = useState(false);

  const holiday = holidayName(date);
  // Seçili günün çıkış saati (vardiya döngüsü varsa o haftanın vardiyası)
  const workEnd = settings ? scheduleFor(parseISO(date), settings).end : "";
  const exitHours = overtimeAfter(workEnd, exitTime);
  const customValid = byExit ? exitHours : parseNum(customHours);

  const pendingDelta = entries.filter(isWork).reduce((a, e) => a + Number(e.hours), 0)
    - (realEntries ?? []).filter(isWork).reduce((a, e) => a + Number(e.hours), 0);
  const totalHours = (realTotal ?? 0) + pendingDelta;
  const lvl = levelFor(totalHours);
  const lvlBurst = useRiseBurst("level", lvl.level, realTotal !== null);
  const lvlPop = usePop(lvlBurst);

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
        // Kısayol/durum kartları ikinci dokunuşla geri alır; "Farklı mesai"nin geri alma yolu bu bildirimdeki düğme
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
    else if (!activeStatus) confirm({ title: `${TYPE_META[t].label} olarak işaretlensin mi?`, desc: `${dayLabel} günü "${TYPE_META[t].label}" olarak kaydedilecek.${t === "holiday" && rules.work ? " Bu günün mesaisi resmi tatil oranıyla hesaplanacak." : ""} Bir gün için tek durum seçilebilir.`, yes: "Evet, işaretle", run: () => add(t, 0) });
  }
  const askRemoveWork = (e: Entry) => confirm({ title: "Mesai geri alınsın mı?", desc: `${dayLabel} gününün ${hrs(Number(e.hours))} mesai kaydı silinecek.`, yes: "Evet, geri al", run: () => remove(e) });

  if (profile?.role === "manager") {
    return (
      <View style={{ flex: 1, backgroundColor: c.background, paddingTop: insets.top + space.top, paddingHorizontal: space.page }}>
        <Card style={{ padding: 20, gap: 8 }}>
          <Txt style={{ fontSize: 20, fontWeight: "700" }}>Yönetici hesabı</Txt>
          <Txt muted>Ekip paneli web sitesinde ({(process.env.EXPO_PUBLIC_WEB_URL ?? "next-mesai.vercel.app").replace(/^https?:\/\//, "")}). Mobil uygulama çalışanlar içindir; hesap ayarların ve çıkış Ayarlar sekmesinde.</Txt>
          <Button title="Ayarlar" variant="secondary" size="md" onPress={() => router.push("/profile")} />
        </Card>
      </View>
    );
  }

  /* ---------- kısayol düğmeleri (web: grid-cols-2 gap-3) ---------- */
  const shortcutItems: React.ReactNode[] = (shortcuts ?? []).map((s) => {
    const existing = [...todays].reverse().find((e) => isWork(e) && Number(e.hours) > 0 && e.shortcut_id === s.id);
    return (
      <ShortcutButton key={s.id} label={fmtHours(Number(s.hours))} hoursText={hrs(Number(s.hours))}
        hint={!existing && workEntry ? "Bugün mesai var" : !existing && rules.off ? TYPE_META[rules.off.type].label : s.start_time ? `${hhmm(s.start_time)}–${hhmm(s.end_time)}` : "Dokun, ekle"}
        active={!!existing} disabled={existing?.id.startsWith("tmp-") || (!existing && (!!workEntry || !!rules.off))}
        onPress={() => confirm(existing
          ? { title: "Mesai geri alınsın mı?", desc: `${hrs(Number(s.hours))} mesai kaydı silinecek.`, yes: "Evet, geri al", run: () => remove(existing) }
          : { title: "Mesai eklensin mi?", desc: `${dayLabel} tarihine ${hrs(Number(s.hours))} ${rules.isHoliday ? "resmi tatil mesaisi (tatil oranıyla)" : "mesai"} eklenecek.`, yes: "Evet, ekle", run: () => add(rules.workType, Number(s.hours), s.start_time, s.end_time, false, s.id) })} />
    );
  });
  // "Farklı mesai" ile girilen (ya da silinmiş kısayoldan gelen) kayıt da kısayol gibi görünür; dokununca geri alınır
  if (workEntry && !(shortcuts ?? []).some((x) => x.id === workEntry.shortcut_id)) {
    shortcutItems.push(
      <ShortcutButton key="work" label={fmtHours(Number(workEntry.hours))} hoursText={hrs(Number(workEntry.hours))}
        hint={workEntry.start_time ? `${hhmm(workEntry.start_time)}–${hhmm(workEntry.end_time)}` : workEntry.type === "holiday" ? "Resmi tatil" : "Farklı mesai"}
        active disabled={workEntry.id.startsWith("tmp-")} onPress={() => askRemoveWork(workEntry)} />,
    );
  }

  /* ---------- "işe gitmedin mi?" kartları ---------- */
  const statusCard = (t: EntryType) => {
    const existing = todays.find((e) => e.type === t && isStatusRow(e));
    const pending = !!existing?.id.startsWith("tmp-");
    // Başka bir durum seçiliyse bu kart kilitlenir; önce seçili olan geri alınmalı
    const blockedByWork = !existing && t !== "holiday" && !!workEntry;
    const locked = (!existing && !!activeStatus) || blockedByWork;
    const hint = existing ? "Geri almak için dokun" : blockedByWork ? "Bu gün mesai var" : locked ? "Önce seçileni geri al"
      : t === "sick" && (settings?.sick_leave_unpaid || settings?.sick_deducts_overtime)
        ? [settings.sick_leave_unpaid && "Maaştan düşer", settings.sick_deducts_overtime && "Mesaiden düşer"].filter(Boolean).join(" · ")
        : STATUS_HINT[t];
    return (
      <Pressable key={t} disabled={pending || locked} onPress={() => askStatus(t)} accessibilityRole="button" accessibilityState={{ selected: !!existing, disabled: pending || locked }}
        style={({ pressed }) => ({
          flexGrow: 1, alignItems: "center", gap: 10, padding: 16, borderRadius: radius.lg, borderWidth: 1,
          backgroundColor: existing ? alpha(c.primary, 0.15) : c.card, borderColor: existing ? alpha(c.primary, 0.6) : c.cardBorder,
          boxShadow: c.shadow.card, opacity: pending || locked ? 0.5 : 1, filter: locked ? "grayscale(1)" : undefined,
          transform: [{ scale: pressed ? 0.97 : 1 }],
        })}>
        <View style={{ width: 48, height: 48, alignItems: "center", justifyContent: "center", borderRadius: radius.md, backgroundColor: existing ? c.primary : "transparent" }}>
          {existing ? <Check size={24} color={c.primaryForeground} /> : <StatusIcon type={t} size={44} />}
        </View>
        <View style={{ alignItems: "center" }}>
          <Txt style={{ fontSize: 14, lineHeight: 17.5, fontWeight: "600", textAlign: "center" }}>{TYPE_META[t].label}</Txt>
          <Txt muted style={{ marginTop: 2, fontSize: 12, lineHeight: 15, textAlign: "center" }}>{hint}</Txt>
        </View>
      </Pressable>
    );
  };

  const smallCard = (label: string, value: number) => (
    <Card size="lg" style={{ flex: 1, paddingVertical: 12, paddingHorizontal: 12, alignItems: "center" }}>
      <Txt muted style={{ fontSize: 12, lineHeight: 16, textAlign: "center" }}>{label}</Txt>
      <AnimatedNumber value={value} format={hrs} style={{ fontSize: 20, lineHeight: 28, fontWeight: "700" }} />
    </Card>
  );

  return (
    <PageStack>
      <Reanimated.View style={[{ flex: 1 }, rise]}>
      <ScrollView
        style={{ flex: 1 }}
        scrollEventThrottle={16}
        onScroll={(e) => setCompact(e.nativeEvent.contentOffset.y > COMPACT_AT)}
        contentContainerStyle={{ paddingTop: insets.top + space.top, paddingBottom: TAB_BAR_SPACE + insets.bottom, paddingHorizontal: space.page, gap: space.section }}
        refreshControl={<RefreshControl refreshing={refreshing} tintColor={c.tint}
          onRefresh={async () => { setRefreshing(true); try { await mutate.refresh.everything(); } finally { setRefreshing(false); } }} />}>
        {/* Başlık: tarih satırı + sağda tarih seçici, altında büyük başlık (web'deki 1px kaydırma işaretçisi dahil: +5px) */}
        <View style={{ gap: 4, paddingBottom: 5 }}>
          <View style={{ minHeight: 32, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <Eyebrow>{format(today, "d MMMM EEEE", { locale: tr })}</Eyebrow>
            <Pressable onPress={() => { haptic(); setPickerMonth(parseISO(date)); setPickerOpen(true); }} accessibilityLabel="Tarih seç"
              style={({ pressed }) => ({
                flexDirection: "row", alignItems: "center", gap: 6, height: 36, paddingLeft: 12, paddingRight: 10, borderRadius: radius.md,
                backgroundColor: c.primary, boxShadow: c.shadow.navy, transform: [{ scale: pressed ? 0.97 : 1 }],
              })}>
              <CalendarDays size={18} color={c.primaryForeground} style={{ opacity: 0.9 }} />
              <Txt style={{ fontSize: 14, lineHeight: 20, fontWeight: "600", color: c.primaryForeground, fontVariant: ["tabular-nums"] }}>
                {isToday ? "Bugün" : format(parseISO(date), "d MMM", { locale: tr })}
              </Txt>
              <ChevronDown size={16} color={c.primaryForeground} style={{ opacity: 0.7 }} />
            </Pressable>
          </View>
          <Txt numberOfLines={1} adjustsFontSizeToFit style={{ fontSize: 34, lineHeight: 40.8, fontWeight: "700", letterSpacing: -0.748 }}>
            {profile?.full_name ? `Merhaba, ${profile.full_name.split(" ")[0]}` : "Merhaba"}
          </Txt>
        </View>

        {!isToday ? (
          <Card size="lg" style={{ paddingHorizontal: 16, paddingVertical: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <Txt style={{ flex: 1, fontSize: 14, lineHeight: 20 }}>
              {date < todayStr ? "Geçmiş bir günü düzenliyorsun" : "Gelecek bir güne bakıyorsun"}: <Txt style={{ fontSize: 14, fontWeight: "700" }}>{dayLabel}</Txt>
            </Txt>
            <Button size="sm" variant="secondary" title="Bugüne dön" onPress={() => setDate(todayStr)} />
          </Card>
        ) : null}

        {profile?.role === "employee" ? <Onboarding /> : null}

        <ReminderCard todayStr={todayStr} hasRecords={todays.length > 0} isToday={isToday} />

        {isToday && settings && realEntries ? (
          <TodayCard settings={settings} entries={todays} holiday={holiday}
            onAddUntil={(exit, h) => confirm({
              title: "Mesai eklensin mi?", desc: `Normal çıkışın ${workEnd}, şu an ${exit}. Bugüne ${hrs(h)} ${rules.isHoliday ? "resmi tatil mesaisi" : "mesai"} eklenecek.`,
              yes: "Evet, ekle", run: () => add(rules.workType, h, workEnd, exit, true),
            })} />
        ) : null}

        {holiday && !activeStatus ? (
          <Card size="lg" style={{ paddingHorizontal: 16, paddingVertical: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
              <Sparkles size={16} color="#f59e0b" />
              <Txt style={{ fontSize: 14, fontWeight: "500", flexShrink: 1 }}>{holiday}</Txt>
            </View>
            <Button size="sm" variant="secondary" title="Tatil olarak işaretle" onPress={() => askStatus("holiday")} />
          </Card>
        ) : null}

        {settings && realEntries && userId ? (
          <GoalHero userId={userId} settings={settings} entries={entries} month={monthKey(parseISO(date))} monthLabel={format(parseISO(date), "LLLL yyyy", { locale: tr })}
            today={date.slice(0, 7) === todayStr.slice(0, 7) ? today : undefined} />
        ) : (
          <Skeleton style={{ minHeight: 248 }} />
        )}

        <View style={{ flexDirection: "row", gap: 12 }}>
          {smallCard(isToday ? "Bugünün mesaisi" : `${dayLabel} mesaisi`, todayHours)}
          {/* Dokununca Raporlar → Özet (hafta / ay / yıl dökümü) */}
          <Pressable onPress={() => { haptic(); router.navigate("/reports"); }} accessibilityRole="button" accessibilityLabel="Mesai özetini aç"
            style={({ pressed }) => ({ flex: 1, transform: [{ scale: pressed ? 0.97 : 1 }] })}>
            {smallCard(`${format(parseISO(date), "LLLL", { locale: tr })} toplamı`, monthHours)}
          </Pressable>
        </View>

        {/* Mesai kısayolları */}
        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" }}>
            <Txt style={{ fontSize: 16, lineHeight: 24, fontWeight: "600" }}>Mesai kısayolları</Txt>
            <Txt muted style={{ fontSize: 12, lineHeight: 16 }}>Ekle · tekrar dokun, geri al</Txt>
          </View>
          <View style={{ gap: 12 }}>
            {shortcuts === null ? (
              <View style={{ flexDirection: "row", gap: 12 }}>
                <Skeleton size="lg" style={{ flex: 1, height: 96 }} /><Skeleton size="lg" style={{ flex: 1, height: 96 }} />
              </View>
            ) : pairs(shortcutItems).map((row, i) => (
              <View key={i} style={{ flexDirection: "row", gap: 12 }}>
                {row.map((el, j) => <View key={j} style={{ flex: 1 }}>{el}</View>)}
                {row.length === 1 ? <View style={{ flex: 1 }} /> : null}
              </View>
            ))}
          </View>
          {!workEntry && !rules.off ? (
            <Pressable onPress={() => { haptic(); setOnHoliday(rules.isHoliday); setCustom(true); }}
              style={({ pressed }) => ({
                marginTop: 12, height: 50, borderRadius: radius.pill, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
                backgroundColor: c.card, borderWidth: 1, borderColor: c.cardBorder, boxShadow: c.shadow.card, transform: [{ scale: pressed ? 0.98 : 1 }],
              })}>
              <Plus size={16} color={c.foreground} /><Txt style={{ fontSize: 14, fontWeight: "500" }}>Farklı mesai ekle</Txt>
            </Pressable>
          ) : null}
        </View>

        {/* İşe gitmedin mi? */}
        <View style={{ gap: 12 }}>
          {/* Ayda birkaç kez kullanılır: tek satır, dokununca seçenekler açılır (web ile aynı) */}
          <Pressable onPress={() => { haptic(); setAbsenceOpen((o) => !o); }} accessibilityRole="button" accessibilityState={{ expanded: absenceOpen }}
            style={({ pressed }) => ({
              flexDirection: "row", alignItems: "center", gap: 12, padding: 16, borderRadius: radius.lg, borderWidth: 1,
              backgroundColor: activeStatus ? alpha(c.primary, 0.15) : c.card, borderColor: activeStatus ? alpha(c.primary, 0.6) : c.cardBorder,
              boxShadow: c.shadow.card, transform: [{ scale: pressed ? 0.99 : 1 }],
            })}>
            <View style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: radius.md, backgroundColor: activeStatus ? c.primary : "transparent" }}>
              {activeStatus ? <Check size={24} color={c.primaryForeground} /> : <StatusIcon type="absent" size={40} />}
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Txt style={{ fontSize: 16, lineHeight: 20, fontWeight: "600" }}>{activeStatus ? `${TYPE_META[activeStatus.type].label} işaretli` : `${isToday ? "Bugün" : dayLabel} işe gitmedim`}</Txt>
              <Txt muted style={{ marginTop: 2, fontSize: 12, lineHeight: 15 }}>{activeStatus ? "Geri almak için aç ve tekrar dokun" : "İzin, rapor, gelmedim ya da resmi tatil"}</Txt>
            </View>
            <View style={{ transform: [{ rotate: absenceOpen ? "180deg" : "0deg" }] }}><ChevronDown size={20} color={c.mutedForeground} /></View>
          </Pressable>
          {absenceOpen ? pairs(STATUS).map((row, i) => (
            <View key={i} style={{ flexDirection: "row", gap: 12 }}>
              {row.map((t) => <View key={t} style={{ flex: 1 }}>{statusCard(t)}</View>)}
              {row.length === 1 ? <View style={{ flex: 1 }} /> : null}
            </View>
          )) : null}
          {/* Hedef belirlenmişse özet burada; hedef yokken hedef kartının içinde görünür */}
          {settings && realEntries && goalProgress(entries, settings).set ? (
            <Card style={{ marginTop: 8, padding: 20 }}><MonthSummary entries={entries} settings={settings} month={monthKey(parseISO(date))} today={date.slice(0, 7) === todayStr.slice(0, 7) ? today : undefined} /></Card>
          ) : null}
        </View>

        {/* Seviye */}
        <Card style={{ paddingVertical: 16, paddingHorizontal: 16, gap: 12, opacity: realTotal === null ? 0 : 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              {/* Seviye atlanınca: ikon bir kez "pop" + parçacık patlaması */}
              <Reanimated.View style={lvlPop}>
                <LevelIcon level={lvl.level} size={56} />
                <Celebrate burst={lvlBurst} distance={44} />
              </Reanimated.View>
              <View>
                <Txt muted style={{ fontSize: 12, lineHeight: 16 }}>Seviye {lvl.level}</Txt>
                <Txt style={{ fontSize: 18, lineHeight: 28, fontWeight: "600" }}>{lvl.name}</Txt>
              </View>
            </View>
            <Txt muted style={{ fontSize: 14, lineHeight: 20 }}>{hrs(totalHours)} toplam</Txt>
          </View>
          <View style={{ height: 4, borderRadius: radius.pill, backgroundColor: c.muted, overflow: "hidden" }}>
            <View style={{ height: "100%", width: `${Math.min(100, lvl.progress)}%`, backgroundColor: c.primary }} />
          </View>
          {lvl.next ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <View style={{ opacity: 0.8 }}><LevelIcon level={lvl.level + 1} size={24} /></View>
              <Txt muted style={{ fontSize: 12, lineHeight: 16 }}>{lvl.next.name} için {hrs(lvl.toNext)} kaldı</Txt>
            </View>
          ) : null}
        </Card>
      </ScrollView>
      </Reanimated.View>

      <CompactBar title={profile?.full_name ? `Merhaba, ${profile.full_name.split(" ")[0]}` : "Merhaba"} visible={compact} />

      {/* Tarih seçici (web: alttan panel) */}
      <Sheet open={pickerOpen} onClose={() => setPickerOpen(false)} gap={20}>
        <CalendarGrid month={pickerMonth} onMonthChange={setPickerMonth} value={date} today={todayStr}
          marked={new Set((pickerEntries ?? []).map((e) => e.work_date))}
          onSelect={(d) => { setDate(d); setPickerOpen(false); }} />
        <Button title="Bugüne dön" variant="secondary" size="lg" onPress={() => { setDate(todayStr); setPickerOpen(false); }} />
      </Sheet>

      {/* Farklı mesai (web: ortada pencere, p-5 gap-5) */}
      <Dialog open={custom} onClose={() => setCustom(false)} title="Farklı mesai" titleSize={18} padding={20} gap={20}>
        <Segmented value={byExit ? "exit" : "hours"} onChange={(v) => setByExit(v === "exit")}
          options={[{ value: "hours", label: "Saat gir" }, { value: "exit", label: "Çıkış saatine göre", disabled: !workEnd }]} />
        {byExit ? (
          <FormSection tone="muted" footer={exitTime
            ? (exitHours > 0 ? `Normal çıkışın ${workEnd}. Mesai: ${hrs(exitHours)}` : `Normal çıkışın ${workEnd}. Bu çıkış saatinde mesai oluşmaz.`)
            : `Normal çıkışın ${workEnd}. Çıkış saatini girince fazla süre otomatik hesaplanır.`}>
            <FormRow label="Bugün kaçta çıktın?" onPress={() => setShowTime(true)}>
              <View style={{ height: 44, paddingHorizontal: 16, borderRadius: radius.pill, justifyContent: "center", backgroundColor: c.card }}>
                <Txt style={{ fontSize: 17, fontWeight: "600", fontVariant: ["tabular-nums"], color: exitTime ? c.foreground : c.mutedForeground }}>{exitTime || "--:--"}</Txt>
              </View>
            </FormRow>
          </FormSection>
        ) : (
          <FormSection tone="muted">
            <NumberRow label="Mesai" suffix="saat" placeholder="Örn. 4" value={customHours} onChange={setCustomHours} />
          </FormSection>
        )}
        {byExit && showTime ? (
          <DateTimePicker mode="time" is24Hour locale="tr-TR" display={Platform.OS === "ios" ? "spinner" : "default"}
            value={(() => { const d = new Date(); const [h, m] = (exitTime || workEnd || "18:00").split(":").map(Number); d.setHours(h, m, 0, 0); return d; })()}
            onChange={(ev, d) => {
              if (Platform.OS !== "ios") setShowTime(false);
              if (ev.type === "set" && d) setExitTime(`${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`);
            }} />
        ) : null}
        <FormSection tone="muted">
          <SwitchRow label="Resmi tatilde çalıştım" hint="Tatil oranıyla hesaplanır" value={onHoliday} onChange={setOnHoliday} />
        </FormSection>
        <Button title="Ekle" size="xl" disabled={!(customValid > 0 && customValid <= 24)} onPress={() => {
          const h = customValid;
          if (!(h > 0 && h <= 24)) return;
          add(onHoliday ? "holiday" : "overtime", h, byExit ? workEnd : null, byExit ? exitTime : null, true);
          setCustom(false); setCustomHours(""); setExitTime(""); setShowTime(false);
        }} />
      </Dialog>
    </PageStack>
  );
}
