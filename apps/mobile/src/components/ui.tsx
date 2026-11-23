import * as Haptics from "expo-haptics";
import { forwardRef } from "react";
import {
  ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput,
  type PressableProps, type TextInputInstance, type TextInputProps, type TextProps, type ViewProps, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { radius, useColors } from "@/theme";

/** Alt menünün kapladığı yükseklik: içerik menünün altında kalmasın */
export const TAB_BAR_SPACE = 112;

/** iOS büyük başlıklı sayfa iskeleti (web'deki `Page` bileşeninin karşılığı). */
export function Screen({ title, eyebrow, children, tabs = true }: { title: string; eyebrow?: string; children: React.ReactNode; tabs?: boolean }) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.background }}
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: (tabs ? TAB_BAR_SPACE : 24) + insets.bottom, paddingHorizontal: 16, gap: 20 }}
      contentInsetAdjustmentBehavior="never">
      <View style={{ gap: 4 }}>
        {eyebrow ? <Txt style={{ fontSize: 13, fontWeight: "600", letterSpacing: 0.4, textTransform: "uppercase", color: c.mutedForeground }}>{eyebrow}</Txt> : null}
        <Txt style={{ fontSize: 34, lineHeight: 41, fontWeight: "700", letterSpacing: -0.7 }}>{title}</Txt>
      </View>
      {children}
    </ScrollView>
  );
}

export function Txt({ style, muted, ...p }: TextProps & { muted?: boolean }) {
  const c = useColors();
  return <Text {...p} style={[{ color: muted ? c.mutedForeground : c.foreground, fontSize: 15 }, style]} />;
}

export function Card({ style, ...p }: ViewProps) {
  const c = useColors();
  return (
    <View {...p} style={[{
      backgroundColor: c.card, borderRadius: radius.xl, padding: 20,
      shadowColor: "#071b2b", shadowOpacity: 0.09, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 3,
    }, style]} />
  );
}

export function Button({ title, loading, variant = "primary", disabled, onPress, style, ...p }:
  PressableProps & { title: string; loading?: boolean; variant?: "primary" | "ghost" }) {
  const c = useColors();
  const primary = variant === "primary";
  return (
    <Pressable
      {...p}
      disabled={disabled || loading}
      onPress={(e) => { Haptics.selectionAsync(); onPress?.(e); }}
      style={(state) => [{
        minHeight: 50, borderRadius: radius.pill, alignItems: "center", justifyContent: "center", paddingHorizontal: 20,
        backgroundColor: primary ? c.primary : "transparent",
        opacity: disabled ? 0.5 : state.pressed ? 0.8 : 1,
        transform: [{ scale: state.pressed ? 0.98 : 1 }],
      }, typeof style === "function" ? style(state) : style]}>
      {loading
        ? <ActivityIndicator color={primary ? c.primaryForeground : c.tint} />
        : <Text style={{ fontSize: 16, fontWeight: "600", color: primary ? c.primaryForeground : c.tint }}>{title}</Text>}
    </Pressable>
  );
}

export const Field = forwardRef<TextInputInstance, TextInputProps & { label: string }>(function Field({ label, style, ...p }, ref) {
  const c = useColors();
  return (
    <View style={{ gap: 6 }}>
      <Txt style={{ fontSize: 13, fontWeight: "500" }} muted>{label}</Txt>
      <TextInput
        ref={ref}
        placeholderTextColor={c.mutedForeground}
        {...p}
        style={[{ height: 50, borderRadius: radius.md, backgroundColor: c.muted, paddingHorizontal: 16, fontSize: 16, color: c.foreground }, style]}
      />
    </View>
  );
});

/** Küçük istatistik kutusu (web'deki `r-md bg-muted` kutular) */
export function Stat({ label, value }: { label: string; value: string }) {
  const c = useColors();
  return (
    <View style={[styles.stat, { backgroundColor: c.muted }]}>
      <Txt style={{ fontSize: 18, fontWeight: "700", fontVariant: ["tabular-nums"] }}>{value}</Txt>
      <Txt muted style={{ fontSize: 11, marginTop: 4, textAlign: "center" }}>{label}</Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  stat: { flex: 1, borderRadius: radius.md, paddingVertical: 12, paddingHorizontal: 8, alignItems: "center" },
});
