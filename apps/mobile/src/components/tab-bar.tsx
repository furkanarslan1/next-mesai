import * as Haptics from "expo-haptics";
import { BarChart3, Calculator, CalendarDays, Home, Settings, type LucideIcon } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BottomTabBarProps } from "expo-router/js-tabs";
import { radius, useColors } from "@/theme";

const ICONS: Record<string, { label: string; icon: LucideIcon }> = {
  index: { label: "Ana sayfa", icon: Home },
  calendar: { label: "Takvim", icon: CalendarDays },
  finance: { label: "Hesap", icon: Calculator },
  reports: { label: "Rapor", icon: BarChart3 },
  profile: { label: "Ayarlar", icon: Settings },
};

/** Web'deki yüzen alt menünün aynısı: yuvarlak kart, seçili sekme dolu hap. */
export function TabBar({ state, emitter, navigateToTab }: BottomTabBarProps) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom: Math.max(16, insets.bottom) }]}>
      <View style={[styles.bar, { backgroundColor: c.card, shadowColor: "#071b2b" }]}>
        {state.routes.map((route, i) => {
          const meta = ICONS[route.name];
          if (!meta) return null;
          const active = state.index === i;
          const Icon = meta.icon;
          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={meta.label}
              onPress={() => {
                const e = emitter.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
                if (!active && !e.defaultPrevented) { Haptics.selectionAsync(); navigateToTab(route.key); }
              }}
              style={[styles.item, active && { backgroundColor: c.primary }]}>
              <Icon size={22} strokeWidth={active ? 2.4 : 2} color={active ? c.primaryForeground : c.mutedForeground} />
              <Text style={[styles.label, { color: active ? c.primaryForeground : c.mutedForeground }]}>{meta.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", left: 16, right: 16, alignItems: "center" },
  bar: {
    flexDirection: "row", width: "100%", maxWidth: 448, padding: 8, borderRadius: radius.xl,
    shadowOpacity: 0.18, shadowRadius: 22, shadowOffset: { width: 0, height: 18 }, elevation: 12,
  },
  item: { flex: 1, alignItems: "center", justifyContent: "center", gap: 2, paddingVertical: 8, borderRadius: 16 },
  label: { fontSize: 11, fontWeight: "500" },
});
