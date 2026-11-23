import { holidayName } from "@mesai/core/holidays";
import { addMonths, eachDayOfInterval, endOfMonth, format, getDay, startOfMonth } from "date-fns";
import { tr } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
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
    <View style={{ gap: 14 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <NavBtn dir={-1} month={month} onMonthChange={onMonthChange} />
        <Txt style={{ fontSize: 18, fontWeight: "700", textTransform: "capitalize" }}>{format(month, "MMMM yyyy", { locale: tr })}</Txt>
        <NavBtn dir={1} month={month} onMonthChange={onMonthChange} />
      </View>
      <View style={{ flexDirection: "row" }}>
        {DAYS.map((d) => <Txt key={d} muted style={{ flex: 1, textAlign: "center", fontSize: 12 }}>{d}</Txt>)}
      </View>
      {rows.map((row, ri) => (
        <View key={ri} style={{ flexDirection: "row", gap: 6 }}>
          {row.map((d, ci) => {
            if (!d) return <View key={ci} style={{ flex: 1, aspectRatio: 1 }} />;
            const key = format(d, "yyyy-MM-dd");
            const selected = key === value;
            const isMarked = marked?.has(key);
            const isToday = key === today;
            const hol = !!holidayName(key);
            return (
              <Pressable key={key} onPress={() => { haptic(); onSelect(key); }} accessibilityLabel={format(d, "d MMMM EEEE", { locale: tr })}
                accessibilityState={{ selected }}
                style={({ pressed }) => ({
                  flex: 1, aspectRatio: 1, borderRadius: radius.md - 4, alignItems: "center", justifyContent: "center",
                  backgroundColor: selected ? c.ring : isMarked ? c.fill : c.muted,
                  borderWidth: (isToday || hol) && !selected ? 2 : 0, borderColor: hol ? "#fbbf24" : c.ring,
                  transform: [{ scale: pressed ? 0.94 : 1 }],
                })}>
                <Txt style={{ fontSize: 14, fontWeight: "600", color: selected ? "#071b2b" : isMarked ? "#ffffff" : c.foreground }}>{format(d, "d")}</Txt>
                {isMarked && selected ? <View style={{ position: "absolute", bottom: 5, width: 5, height: 5, borderRadius: 3, backgroundColor: "#071b2b" }} /> : null}
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

function NavBtn({ dir, month, onMonthChange }: { dir: -1 | 1; month: Date; onMonthChange: (m: Date) => void }) {
  const c = useColors();
  return (
    <Pressable onPress={() => { haptic(); onMonthChange(addMonths(month, dir)); }} accessibilityLabel={dir < 0 ? "Önceki ay" : "Sonraki ay"}
      style={({ pressed }) => ({ width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: c.muted, opacity: pressed ? 0.7 : 1 })}>
      {dir < 0 ? <ChevronLeft size={20} color={c.foreground} /> : <ChevronRight size={20} color={c.foreground} />}
    </Pressable>
  );
}
