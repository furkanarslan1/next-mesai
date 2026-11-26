import { holidayName } from "@mesai/core/holidays";
import { addMonths } from "date-fns/addMonths";
import { eachDayOfInterval } from "date-fns/eachDayOfInterval";
import { endOfMonth } from "date-fns/endOfMonth";
import { format } from "date-fns/format";
import { getDay } from "date-fns/getDay";
import { startOfMonth } from "date-fns/startOfMonth";
import { tr } from "date-fns/locale/tr";
import { ChevronLeft, ChevronRight } from "@/components/icons";
import { Pressable, View } from "react-native";
import { haptic } from "@/lib/haptics";
import { radius, useColors } from "@/theme";
import { Txt } from "./ui";

const DAYS = ["Pt", "Sa", "Ça", "Pe", "Cu", "Ct", "Pz"];

/** Ay takvimi ızgarası (web'deki CalendarGrid): kayıtlı günler koyu, bugün çerçeveli, resmi tatil sarı çerçeveli. */
export function CalendarGrid({ month, onMonthChange, value, today, marked, onSelect }: {
  month: Date; onMonthChange: (m: Date) => void; value: string; today: string; marked?: Set<string>; onSelect: (d: string) => void;
}) {
  const c = useColors();
  const days = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) });
  const offset = (getDay(startOfMonth(month)) + 6) % 7;
  const cells: (Date | null)[] = [...Array.from({ length: offset }, () => null), ...days];
  while (cells.length % 7) cells.push(null);
  const rows = Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7));

  return (
    <View style={{ gap: 16 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <NavBtn dir={-1} month={month} onMonthChange={onMonthChange} />
        <Txt style={{ fontSize: 18, lineHeight: 28, fontWeight: "700", textTransform: "capitalize" }}>{format(month, "MMMM yyyy", { locale: tr })}</Txt>
        <NavBtn dir={1} month={month} onMonthChange={onMonthChange} />
      </View>
      <View style={{ gap: 6 }}>
        <View style={{ flexDirection: "row", gap: 6 }}>
          {DAYS.map((d) => <Txt key={d} muted style={{ flex: 1, textAlign: "center", fontSize: 12, lineHeight: 16 }}>{d}</Txt>)}
        </View>
        {rows.map((row, ri) => (
          <View key={ri} style={{ flexDirection: "row", gap: 6 }}>
            {row.map((d, ci) => {
              if (!d) return <View key={ci} style={{ flex: 1, aspectRatio: 1 }} />;
              const key = format(d, "yyyy-MM-dd");
              const selected = key === value;
              const isMarked = marked?.has(key);
              const isToday = key === today && !selected;
              const hol = !!holidayName(key) && !selected;
              return (
                <Pressable key={key} onPress={() => onSelect(key)} accessibilityLabel={format(d, "d MMMM EEEE", { locale: tr })}
                  accessibilityState={{ selected }}
                  style={({ pressed }) => ({
                    flex: 1, aspectRatio: 1, borderRadius: radius.md, alignItems: "center", justifyContent: "center",
                    backgroundColor: selected ? c.teal : isMarked ? c.fill : c.muted,
                    outlineWidth: hol || isToday ? 2 : 0, outlineColor: hol ? "#fbbf24" : c.teal, outlineOffset: isToday && !hol ? 2 : 0, outlineStyle: "solid",
                    transform: [{ scale: pressed ? 0.95 : 1 }],
                  })}>
                  <Txt style={{ fontSize: 14, fontWeight: "500", color: selected ? c.ink : isMarked ? "#ffffff" : c.foreground }}>{format(d, "d")}</Txt>
                  {isMarked && selected ? <View style={{ position: "absolute", bottom: 6, width: 6, height: 6, borderRadius: 3, backgroundColor: c.ink }} /> : null}
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

function NavBtn({ dir, month, onMonthChange }: { dir: -1 | 1; month: Date; onMonthChange: (m: Date) => void }) {
  const c = useColors();
  return (
    <Pressable onPress={() => { haptic(); onMonthChange(addMonths(month, dir)); }} accessibilityLabel={dir < 0 ? "Önceki ay" : "Sonraki ay"} accessibilityRole="button" hitSlop={6}
      style={({ pressed }) => ({ width: 32, height: 32, borderRadius: radius.pill, alignItems: "center", justifyContent: "center", backgroundColor: c.secondary, transform: [{ scale: pressed ? 0.95 : 1 }] })}>
      {dir < 0 ? <ChevronLeft size={16} color={c.secondaryForeground} /> : <ChevronRight size={16} color={c.secondaryForeground} />}
    </Pressable>
  );
}
