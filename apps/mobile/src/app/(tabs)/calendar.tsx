import { goalProgress, hrs, money, monthSummary } from "@mesai/core/calc";
import { holidayName } from "@mesai/core/holidays";
import { DEFAULT_SETTINGS } from "@mesai/core/settings";
import { TYPE_META, type EntryType } from "@mesai/core/types";
import { addMonths, eachDayOfInterval, endOfMonth, format, getDay, startOfMonth } from "date-fns";
import { tr } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { DaySheet } from "@/components/day-sheet";
import { AnimatedNumber } from "@/components/animated-number";
import { Card, IconButton, LargeTitle, Screen, Txt } from "@/components/ui";
import { mixOklch } from "@/lib/color";
import { haptic } from "@/lib/haptics";
import { useToday } from "@/lib/now";
import { monthKey, useMonthEntries, useProfile, useSettings } from "@/lib/store";
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
const DOT: Record<EntryType, string> = {
  overtime: "#00d492", holiday: "#ffb900", paid_leave: "#00bcff", unpaid_leave: "#f54a00", sick: "#cad5e2", absent: "#ff2056",
};
const DAYS = ["Pt", "Sa", "Ça", "Pe", "Cu", "Ct", "Pz"];
const isWork = (t: string) => t === "overtime" || t === "holiday";

/** Takvim: web'deki takvim sayfasının (app/(app)/calendar/page.tsx) birebir aynısı. */
export default function CalendarScreen() {
  const c = useColors();
  const dark = useIsDark();
  const today = useToday();
  const todayStr = format(today, "yyyy-MM-dd");
  const [month, setMonth] = useState(today);
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

  return (
    <Screen eyebrow="Takvim" title={<LargeTitle>{capTitle}</LargeTitle>} compactTitle={capTitle}
      actions={(
        <>
          <IconButton label="Önceki ay" onPress={() => setMonth(addMonths(month, -1))}><ChevronLeft size={16} color={c.secondaryForeground} /></IconButton>
          <IconButton label="Sonraki ay" onPress={() => setMonth(addMonths(month, 1))}><ChevronRight size={16} color={c.secondaryForeground} /></IconButton>
        </>
      )}>
      <Card style={{ paddingVertical: 16, paddingHorizontal: 16 }}>
        <View style={{ gap: 6 }}>
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
                  <Pressable key={key} onPress={() => { haptic(); setSelected(key); }}
                    accessibilityLabel={`${format(d, "d MMMM", { locale: tr })} kayıtlarını aç`}
                    style={({ pressed }) => ({
                      flex: 1, aspectRatio: 1, borderRadius: radius.md, alignItems: "center", justifyContent: "center", backgroundColor: bg,
                      outlineStyle: "solid", outlineWidth: hol || isToday ? 2 : 0, outlineColor: hol ? "#fbbf24" : c.teal, outlineOffset: !hol && isToday ? 2 : 0,
                      transform: [{ scale: pressed ? 0.95 : 1 }],
                    })}>
                    <Txt style={{ fontSize: 14, lineHeight: 14, fontWeight: isToday ? "700" : "400", color: fg }}>{format(d, "d")}</Txt>
                    {worked > 0 ? (
                      <Txt style={{ marginTop: 4, fontSize: 10, lineHeight: 10, fontWeight: "600", color: fg, fontVariant: ["tabular-nums"] }}>{hrs(worked)}</Txt>
                    ) : st ? (
                      <Txt style={{ marginTop: 4, fontSize: 10, lineHeight: 10, fontWeight: "500", color: st.text }}>{st.short}</Txt>
                    ) : null}
                    {worked > 0 && status ? <View style={{ position: "absolute", right: 4, top: 4, width: 6, height: 6, borderRadius: 3, backgroundColor: DOT[status.type] }} /> : null}
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>
        <Txt muted style={{ marginTop: 12, textAlign: "center", fontSize: 12, lineHeight: 16 }}>Bir güne dokun: kayıtlarını gör, ekle, değiştir veya sil.</Txt>
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
