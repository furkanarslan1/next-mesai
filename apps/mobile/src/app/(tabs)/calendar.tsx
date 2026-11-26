import { goalProgress, hrs, money, monthSummary, num } from "@mesai/core/calc";
import { holidayName } from "@mesai/core/holidays";
import { DEFAULT_SETTINGS } from "@mesai/core/settings";
import { TYPE_HEX, TYPE_META, type EntryType } from "@mesai/core/types";
import { addMonths } from "date-fns/addMonths";
import { eachDayOfInterval } from "date-fns/eachDayOfInterval";
import { endOfMonth } from "date-fns/endOfMonth";
import { format } from "date-fns/format";
import { getDay } from "date-fns/getDay";
import { startOfMonth } from "date-fns/startOfMonth";
import { tr } from "date-fns/locale/tr";
import { ChevronLeft, ChevronRight } from "@/components/icons";
import { useState } from "react";
import { PanResponder, Pressable, View } from "react-native";
import Reanimated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { DaySheet } from "@/components/day-sheet";
import { useReduceMotion } from "@/lib/motion";
import { AnimatedNumber } from "@/components/animated-number";
import { Button, Card, IconButton, LargeTitle, Screen, Txt } from "@/components/ui";
import { mixOklch } from "@/lib/color";
import { haptic } from "@/lib/haptics";
import { useToday } from "@/lib/now";
import { monthKey, mutate, useMonthEntries, useProfile, useSettings } from "@/lib/store";
import { bulkPlan, SKIP_LABEL, type BulkType } from "@mesai/core/day";
import { errorText } from "@mesai/core/errors";
import { parseISO } from "date-fns/parseISO";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { toast } from "@/components/toast";
import { radius, useColors, useIsDark } from "@/theme";

/**
 * İzin/rapor gibi günlerin hücre rengi ve kısa etiketi (web: STATUS_CELL). Renkler web'deki
 * `color-mix(in oklch, …, var(--fill))` sonuçlarıdır (koyu / açık tema).
 */
const STATUS_CELL: Record<string, { dark: string; light: string; text: string; short: string }> = {
  paid_leave: { dark: "#376b90", light: "#2a4b70", text: "#b8e6fe", short: "İzin" },
  unpaid_leave: { dark: "#72558b", light: "#593762", text: "#ffd6a7", short: "Ücretsiz" },
  sick: { dark: "#5b5f91", light: "#473f6a", text: "#fccee8", short: "Rapor" },
  absent: { dark: "#6c4f93", light: "#58326c", text: "#ffccd3", short: "Gelmedi" },
  holiday: { dark: "#227e77", light: "#005c60", text: "#fee685", short: "Tatil" },
};
/** Tür renk noktaları (web: TYPE_META'daki Tailwind renkleri) */
const DOT: Record<EntryType, string> = TYPE_HEX;
const DAYS = ["Pt", "Sa", "Ça", "Pe", "Cu", "Ct", "Pz"];
const isWork = (t: string) => t === "overtime" || t === "holiday";

/** Takvim: web'deki takvim sayfasının (app/(app)/calendar/page.tsx) birebir aynısı. */
export default function CalendarScreen() {
  const c = useColors();
  const dark = useIsDark();
  const today = useToday();
  const todayStr = format(today, "yyyy-MM-dd");
  const [month, setMonth] = useState(today);
  // Ay değişince ızgara geldiği yönden 24 px kayarak belirir (web: .month-slide, 260 ms)
  const reduce = useReduceMotion();
  const slide = useSharedValue(1);
  // Toplu işaretleme (web ile aynı): "Seç" ya da bir güne uzun basınca seçim modu
  const insets = useSafeAreaInsets();
  const [picking, setPicking] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [bulkType, setBulkType] = useState<BulkType>("paid_leave");
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const togglePick = (k: string) => { haptic(); setConfirming(false); setPicked((p) => (p.includes(k) ? p.filter((x) => x !== k) : [...p, k])); };
  const stopPicking = () => { setPicking(false); setPicked([]); setConfirming(false); };
  const dir = useSharedValue(0);
  const go = (n: number) => {
    setMonth(addMonths(month, n));
    setPicked([]); setConfirming(false);
    if (reduce) return;
    dir.set(n);
    slide.set(0);
    slide.set(withTiming(1, { duration: 260, easing: Easing.bezier(0.2, 0.9, 0.3, 1) }));
  };
  // Sağa/sola kaydırarak ay değiştirme: ızgara parmağı biraz (dirençli) izler, eşik geçilince ay değişir
  const drag = useSharedValue(0);
  const swipe = PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
    onPanResponderMove: (_, g) => { if (!reduce) drag.set(g.dx * 0.35); },
    onPanResponderRelease: (_, g) => {
      drag.set(withTiming(0, { duration: 180 }));
      if (g.dx < -50 || g.vx < -0.5) { haptic(); go(1); }
      else if (g.dx > 50 || g.vx > 0.5) { haptic(); go(-1); }
    },
    onPanResponderTerminate: () => drag.set(withTiming(0, { duration: 180 })),
  });
  const slideStyle = useAnimatedStyle(() => ({ opacity: slide.get(), transform: [{ translateX: (1 - slide.get()) * dir.get() * 24 + drag.get() }] }));
  const [selected, setSelected] = useState<string | null>(null);
  const userId = useProfile()?.id ?? "";
  const entries = useMonthEntries(monthKey(month)) ?? [];
  const settings = useSettings() ?? DEFAULT_SETTINGS;
  const days = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) });
  const offset = (getDay(startOfMonth(month)) + 6) % 7; // Pzt başlangıç
  const sum = monthSummary(entries, settings);
  const total = goalProgress(entries, settings); // income = maaş − kesinti + mesai kazancı
  // Yoğunluk, günün toplam mesaisine göre (bir güne birden çok kayıt düşmüş olabilir)
  const dayTotals = new Map<string, number>();
  entries.filter((e) => isWork(e.type)).forEach((e) => dayTotals.set(e.work_date, (dayTotals.get(e.work_date) ?? 0) + Number(e.hours)));
  const maxH = Math.max(1, ...dayTotals.values());

  const cells: (Date | null)[] = [...Array.from({ length: offset }, () => null), ...days];
  while (cells.length % 7) cells.push(null);
  const rows = Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7));
  const holidays = days.filter((d) => holidayName(format(d, "yyyy-MM-dd")));
  const title = format(month, "MMMM yyyy", { locale: tr });
  const capTitle = title.charAt(0).toLocaleUpperCase("tr") + title.slice(1);

  const plan = confirming ? bulkPlan(picked, bulkType, entries, settings) : null;
  async function saveBulk() {
    if (!plan?.add.length) return;
    setBusy(true);
    try {
      await mutate.addEntries(plan.add.map((work_date) => ({ user_id: userId, work_date, type: bulkType, hours: 0, note: null, start_time: null, end_time: null })));
      haptic("success");
      toast.success(`${plan.add.length} gün işaretlendi`);
      stopPicking();
    } catch (e) { toast.error(errorText(e, "Kaydedilemedi")); }
    finally { setBusy(false); }
  }
  const overlay = picking ? (
    <View pointerEvents="box-none" style={{ position: "absolute", left: 16, right: 16, bottom: 100 + insets.bottom }}>
      <Card style={{ padding: 16, gap: 12, boxShadow: "0px 10px 15px -3px rgba(0,0,0,0.25)" }}>
        {plan ? (
          <>
            <Txt style={{ fontSize: 14, lineHeight: 20 }}>
              <Txt style={{ fontSize: 14, fontWeight: "700" }}>{plan.add.length} gün</Txt> “{TYPE_META[bulkType].label}” olarak işaretlenecek.
              {plan.skipped.length ? <Txt muted style={{ fontSize: 14 }}> Atlanacak: {plan.skipped.map((x) => `${format(parseISO(x.date), "d MMM", { locale: tr })} (${SKIP_LABEL[x.reason]})`).join(", ")}.</Txt> : null}
            </Txt>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Button title="Hayır" size="md" variant="secondary" disabled={busy} onPress={() => setConfirming(false)} style={{ flex: 1 }} />
              <Button title="Evet, işaretle" size="md" disabled={busy || !plan.add.length} onPress={() => { void saveBulk(); }} style={{ flex: 1 }} />
            </View>
          </>
        ) : (
          <>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {(["paid_leave", "unpaid_leave", "sick", "absent", "holiday"] as BulkType[]).map((t) => (
                <Pressable key={t} onPress={() => { haptic(); setBulkType(t); }} accessibilityState={{ selected: bulkType === t }}
                  style={{ borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: bulkType === t ? c.primary : c.muted }}>
                  <Txt style={{ fontSize: 12, fontWeight: "500", color: bulkType === t ? c.primaryForeground : c.foreground }}>{TYPE_META[t].label}</Txt>
                </Pressable>
              ))}
            </View>
            <Button title={picked.length ? `${picked.length} günü işaretle` : "Gün seç"} size="md" disabled={!picked.length} onPress={() => setConfirming(true)} />
          </>
        )}
      </Card>
    </View>
  ) : null;

  return (
    <Screen eyebrow="Takvim" title={<LargeTitle>{capTitle}</LargeTitle>} compactTitle={capTitle} overlay={overlay}
      actions={(
        <>
          <Button title={picking ? "Bitti" : "Seç"} size="default" variant={picking ? "primary" : "secondary"} onPress={() => { haptic(); if (picking) stopPicking(); else setPicking(true); }} />
          <IconButton label="Önceki ay" onPress={() => go(-1)}><ChevronLeft size={16} color={c.secondaryForeground} /></IconButton>
          <IconButton label="Sonraki ay" onPress={() => go(1)}><ChevronRight size={16} color={c.secondaryForeground} /></IconButton>
        </>
      )}>
      <Card style={{ paddingVertical: 16, paddingHorizontal: 16 }}>
        <Reanimated.View style={[{ gap: 6 }, slideStyle]} {...swipe.panHandlers}>
          <View style={{ flexDirection: "row", gap: 6 }}>
            {DAYS.map((d) => <Txt key={d} muted style={{ flex: 1, textAlign: "center", fontSize: 12, lineHeight: 16 }}>{d}</Txt>)}
          </View>
          {rows.map((row, ri) => (
            <View key={ri} style={{ flexDirection: "row", gap: 6 }}>
              {row.map((d, ci) => {
                if (!d) return <View key={ci} style={{ flex: 1, aspectRatio: 1 }} />;
                const key = format(d, "yyyy-MM-dd");
                const list = entries.filter((e) => e.work_date === key);
                const worked = list.filter((e) => isWork(e.type)).reduce((a, e) => a + Number(e.hours), 0);
                const status = list.find((e) => !isWork(e.type)) ?? list.find((e) => e.type === "holiday" && Number(e.hours) === 0);
                const a = worked > 0 ? Math.min(1, 0.25 + 0.75 * (worked / maxH)) : 0;
                const strong = a > 0.6;
                const isToday = key === todayStr;
                const hol = !!holidayName(key);
                const st = status ? STATUS_CELL[status.type] : null;
                const bg = worked > 0 ? mixOklch(c.teal, c.fill, Math.round(a * 100) / 100) : st ? (dark ? st.dark : st.light) : c.muted;
                const fg = worked > 0 || st ? (strong ? c.ink : "#fcfcfc") : c.foreground;
                return (
                  <Pressable key={key} onPress={() => { if (picking) togglePick(key); else { haptic(); setSelected(key); } }}
                    onLongPress={() => { if (!picking) { setPicking(true); togglePick(key); } }}
                    accessibilityLabel={picking ? `${format(d, "d MMMM", { locale: tr })} seç` : `${format(d, "d MMMM", { locale: tr })} kayıtlarını aç`}
                    accessibilityState={picking ? { selected: picked.includes(key) } : undefined}
                    style={({ pressed }) => ({
                      flex: 1, aspectRatio: 1, borderRadius: radius.md, alignItems: "center", justifyContent: "center", backgroundColor: bg,
                      ...(picking && picked.includes(key)
                        ? { outlineStyle: "solid" as const, outlineWidth: 3, outlineColor: c.primary, outlineOffset: 2 }
                        : { outlineStyle: "solid" as const, outlineWidth: hol || isToday ? 2 : 0, outlineColor: hol ? "#fbbf24" : c.teal, outlineOffset: !hol && isToday ? 2 : 0 }),
                      transform: [{ scale: pressed ? 0.95 : 1 }],
                    })}>
                    <Txt style={{ fontSize: 14, lineHeight: 14, fontWeight: isToday ? "700" : "400", color: fg }}>{format(d, "d")}</Txt>
                    {worked > 0 ? (
                      // Hücre dar: sayı ve "saat" alt alta (web ile aynı)
                      <View style={{ marginTop: 2, alignItems: "center" }}>
                        <Txt style={{ fontSize: 10, lineHeight: 11, fontWeight: "600", color: fg, fontVariant: ["tabular-nums"] }}>{num(worked)}</Txt>
                        <Txt style={{ fontSize: 9, lineHeight: 10, fontWeight: "500", color: fg, opacity: 0.8 }}>saat</Txt>
                      </View>
                    ) : st ? (
                      <Txt style={{ marginTop: 4, fontSize: 10, lineHeight: 10, fontWeight: "500", color: st.text }}>{st.short}</Txt>
                    ) : null}
                    {worked > 0 && status ? <View style={{ position: "absolute", right: 4, top: 4, width: 6, height: 6, borderRadius: 3, backgroundColor: DOT[status.type] }} /> : null}
                  </Pressable>
                );
              })}
            </View>
          ))}
        </Reanimated.View>
        <Txt muted style={{ marginTop: 12, textAlign: "center", fontSize: 12, lineHeight: 16 }}>{picking ? "İzin/rapor işaretlemek istediğin günlere dokun." : "Bir güne dokun: kayıtlarını gör, ekle, değiştir veya sil. Ay değiştirmek için sağa sola kaydır. Birden çok güne izin için “Seç” ya da güne uzun bas."}</Txt>
      </Card>

      {/* Renk açıklaması */}
      <View style={{ flexDirection: "row", flexWrap: "wrap", columnGap: 12, rowGap: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c.teal }} />
          <Txt style={{ fontSize: 12, lineHeight: 16 }}>Mesai (saat yazar)</Txt>
        </View>
        {(Object.keys(TYPE_META) as EntryType[]).slice(1).map((t) => (
          <View key={t} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: DOT[t] }} />
            <Txt style={{ fontSize: 12, lineHeight: 16 }}>{TYPE_META[t].label}</Txt>
          </View>
        ))}
      </View>
      {holidays.length ? (
        <Txt muted style={{ fontSize: 12, lineHeight: 16 }}>
          {/* Web: başta sarı halkalı nokta (takvimdeki tatil çerçevesinin açıklaması) */}
          <View style={{ width: 8, height: 8, borderRadius: 4, borderWidth: 2, borderColor: "#fbbf24", marginRight: 4 }} />
          {holidays.map((d) => `${format(d, "d")} ${holidayName(format(d, "yyyy-MM-dd"))}`).join(" · ")}
        </Txt>
      ) : null}

      <DaySheet date={selected} entries={entries} userId={userId} onClose={() => setSelected(null)} />

      <View style={{ gap: 12 }}>
        <View style={{ flexDirection: "row", gap: 12 }}>
          <Card size="lg" style={{ flex: 1, paddingVertical: 16, paddingHorizontal: 16, alignItems: "center" }}>
            <Txt muted style={{ fontSize: 12, lineHeight: 16 }}>Toplam mesai</Txt>
            <Txt style={{ fontSize: 20, lineHeight: 28, fontWeight: "700", fontVariant: ["tabular-nums"] }}>{hrs(sum.hours)}</Txt>
          </Card>
          <Card size="lg" style={{ flex: 1, paddingVertical: 16, paddingHorizontal: 16, alignItems: "center" }}>
            <Txt muted style={{ fontSize: 12, lineHeight: 16 }}>Mesai kazancı</Txt>
            <Txt style={{ fontSize: 20, lineHeight: 28, fontWeight: "700", fontVariant: ["tabular-nums"] }}>{money(sum.earned, settings.currency)}</Txt>
          </Card>
        </View>
        <Card size="lg" style={{ paddingVertical: 16, paddingHorizontal: 16, alignItems: "center" }}>
          <Txt muted style={{ fontSize: 12, lineHeight: 16 }}>Toplam maaş</Txt>
          <AnimatedNumber value={total.income} format={(n) => money(n, settings.currency)} style={{ fontSize: 24, lineHeight: 32, fontWeight: "700" }} />
          <Txt muted style={{ marginTop: 4, fontSize: 12, lineHeight: 16, textAlign: "center", fontVariant: ["tabular-nums"] }}>
            Maaş {money(settings.monthly_salary, settings.currency)}{total.deduction > 0 ? ` − kesinti ${money(total.deduction, settings.currency)}` : ""} + mesai {money(sum.earned, settings.currency)}
          </Txt>
        </Card>
      </View>
    </Screen>
  );
}
