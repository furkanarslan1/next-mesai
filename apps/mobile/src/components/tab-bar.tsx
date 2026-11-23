import { BlurView } from "expo-blur";
import type { BottomTabBarProps } from "expo-router/js-tabs";
import { BarChart3, Calculator, CalendarDays, Home, Settings, type LucideIcon } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { haptic } from "@/lib/haptics";
import { radius, useColors, useIsDark } from "@/theme";

const ICONS: Record<string, { label: string; icon: LucideIcon }> = {
  index: { label: "Ana sayfa", icon: Home },
  calendar: { label: "Takvim", icon: CalendarDays },
  finance: { label: "Hesap", icon: Calculator },
  reports: { label: "Rapor", icon: BarChart3 },
  profile: { label: "Ayarlar", icon: Settings },
};

/**
 * Web'deki alt menünün aynısı: yüzen cam çubuk (2rem köşe, 8px iç boşluk, bulanık yarı saydam zemin),
 * seçili sekme dolu hap; arkasında alttan yukarı solan "kalkan" (menü çevresine dokunma arkaya geçmez).
 */
export function TabBar({ state, emitter, navigateToTab }: BottomTabBarProps) {
  const c = useColors();
  const dark = useIsDark();
  const insets = useSafeAreaInsets();
  return (
    <>
      <View style={[styles.shield, { height: 100 + insets.bottom, experimental_backgroundImage: `linear-gradient(to top, ${c.shieldBottom} 35%, ${c.shieldTop})` }]} />
      <View pointerEvents="box-none" style={[styles.wrap, { bottom: Math.max(16, insets.bottom) }]}>
        <View style={[styles.bar, { borderColor: c.cardBorder, boxShadow: c.shadow.nav }]}>
          <View style={[StyleSheet.absoluteFill, styles.clip]}>
            <BlurView intensity={100} tint={dark ? "dark" : "light"} style={[StyleSheet.absoluteFill, styles.clip]} />
            <View style={[StyleSheet.absoluteFill, styles.clip, { backgroundColor: c.navBg }]} />
          </View>
          {state.routes.map((route, i) => {
            const meta = ICONS[route.name];
            if (!meta) return null;
            const active = state.index === i;
            const Icon = meta.icon;
            const fg = active ? c.primaryForeground : c.mutedForeground;
            return (
              <Pressable
                key={route.key}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                accessibilityLabel={meta.label}
                onPress={() => {
                  const e = emitter.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
                  if (!active && !e.defaultPrevented) { haptic(); navigateToTab(route.key); }
                }}
                style={[styles.item, active && { backgroundColor: c.primary, boxShadow: c.shadow.navActive }]}>
                <Icon size={22} strokeWidth={active ? 2.4 : 2} color={fg} />
                <Text style={[styles.label, { color: fg }]}>{meta.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  shield: { position: "absolute", left: 0, right: 0, bottom: 0 },
  wrap: { position: "absolute", left: 16, right: 16, alignItems: "center" },
  bar: { flexDirection: "row", width: "100%", maxWidth: 448, padding: 8, borderRadius: radius.xl, borderWidth: 1 },
  clip: { borderRadius: radius.xl, overflow: "hidden" },
  item: { flex: 1, alignItems: "center", justifyContent: "center", gap: 2, paddingVertical: 8, borderRadius: radius.pill },
  label: { fontSize: 11, lineHeight: 16.5, fontWeight: "500" },
});
