import { hrs, num } from "@mesai/core/calc";
import { daysToPayday } from "@mesai/core/summary";
import { TYPE_HEX, TYPE_META, type Entry, type Settings } from "@mesai/core/types";
import { weekDays } from "@mesai/core/week";
import { router } from "expo-router";
import { Pressable, View } from "react-native";
import { haptic } from "@/lib/haptics";
import { useMonthEntries } from "@/lib/store";
import { radius, useColors } from "@/theme";
import { Card, Txt } from "./ui";

/**
 * Ana sayfa "Bu hafta" (web: components/mesai/week-card.tsx): seçili günün haftası 7 çubukla, haftalık toplam
 * ve maaş gününe kalan. Hafta öbür aya taşıyorsa o ay ayrıca yüklenir.
 */
export function WeekCard({ date, todayStr, today, month, entries, settings }: {
  date: string; todayStr: string; today: Date; month: string; entries: Entry[]; settings: Settings;
}) {
  const c = useColors();
  const months = weekDays(date, []).months;
  const other = months.find((m) => m !== month) ?? month;
  const otherEntries = useMonthEntries(other);
  const all = other === month ? entries : [...entries, ...(otherEntries ?? [])];
  const w = weekDays(date, all);
  const scale = Math.max(4, w.max);
  const payIn = daysToPayday(today, settings.payday);

  return (
    <Pressable onPress={() => { haptic(); router.navigate("/reports"); }} accessibilityRole="button" accessibilityLabel="Haftalık özeti aç"
      style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.99 : 1 }] })}>
      <Card size="lg" style={{ padding: 16, gap: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" }}>
          <Txt style={{ fontSize: 16, lineHeight: 24, fontWeight: "600" }}>Bu hafta</Txt>
          <Txt style={{ fontSize: 14, fontWeight: "600", fontVariant: ["tabular-nums"] }}>{hrs(w.total)}</Txt>
        </View>
        <View style={{ height: 112, flexDirection: "row", alignItems: "flex-end", gap: 8 }}
          accessible accessibilityLabel={w.days.map((d) => `${d.label} ${d.hours ? hrs(d.hours) : d.status ? TYPE_META[d.status].label : "yok"}`).join(", ")}>
          {w.days.map((d) => {
            const isToday = d.date === todayStr;
            return (
              <View key={d.date} style={{ flex: 1, height: "100%", alignItems: "center", justifyContent: "flex-end", gap: 4 }}>
                {d.hours > 0 ? <Txt muted style={{ fontSize: 11, lineHeight: 11, fontVariant: ["tabular-nums"] }}>{num(d.hours)}</Txt> : null}
                {d.hours > 0 ? (
                  <View style={{ width: "100%", maxWidth: 28, height: Math.max(8, (d.hours / scale) * 72), borderRadius: 19.2 /* web rounded-md */, backgroundColor: TYPE_HEX[d.workType] }} />
                ) : d.status ? (
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: TYPE_HEX[d.status] }} />
                ) : (
                  <View style={{ width: "100%", maxWidth: 28, height: 4, borderRadius: radius.pill, backgroundColor: c.muted }} />
                )}
                <Txt style={{ fontSize: 12, lineHeight: 12, fontWeight: isToday ? "700" : "400", color: isToday ? c.primary : d.holiday ? "#f59e0b" : c.mutedForeground }}>{d.label}</Txt>
              </View>
            );
          })}
        </View>
        {payIn !== null ? <Txt muted style={{ fontSize: 12, lineHeight: 16 }}>{payIn === 0 ? "Bugün maaş günü" : `Maaş gününe ${payIn} gün`}</Txt> : null}
      </Card>
    </Pressable>
  );
}
