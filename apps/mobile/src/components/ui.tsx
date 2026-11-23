import { BlurView } from "expo-blur";
import { forwardRef, useEffect, useState } from "react";
import {
  ActivityIndicator, Animated, Pressable, ScrollView, Text, TextInput,
  type PressableProps, type StyleProp, type TextInputInstance, type TextInputProps, type TextProps, type ViewProps, type ViewStyle, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { haptic } from "@/lib/haptics";
import { radius, space, useColors, useIsDark } from "@/theme";

/** Alt menünün kapladığı alan (web: pb-[calc(7rem+safe-area)]) */
export const TAB_BAR_SPACE = 112;

/** Metin: web'deki gövde metni (16px) ve renkleri. `muted` ikincil metin rengi. */
export function Txt({ style, muted, ...p }: TextProps & { muted?: boolean }) {
  const c = useColors();
  return <Text {...p} style={[{ color: muted ? c.mutedForeground : c.foreground, fontSize: 16 }, style]} />;
}

/** Büyük başlığın üstündeki küçük satır (web: 13px, kalın, büyük harf) */
export function Eyebrow({ children, style }: { children: React.ReactNode; style?: TextProps["style"] }) {
  return <Txt muted style={[{ fontSize: 13, lineHeight: 19.5, fontWeight: "600", letterSpacing: 0.325, textTransform: "uppercase" }, style]}>{children}</Txt>;
}

/**
 * Kart (web: .glass / [data-slot=card]). `size="xl"` büyük kartlar (2rem köşe), `"lg"` ikincil kartlar (1.5rem).
 * Koyu temada ince teal çerçeve, açık temada yumuşak gölge — web ile aynı.
 */
export function Card({ style, size = "xl", ...p }: ViewProps & { size?: "xl" | "lg" }) {
  const c = useColors();
  return (
    <View {...p} style={[{
      backgroundColor: c.card, borderRadius: size === "xl" ? radius.xl : radius.lg,
      borderWidth: 1, borderColor: c.cardBorder, boxShadow: c.shadow.card,
    }, style]} />
  );
}

type BtnVariant = "primary" | "secondary" | "navy";
type BtnSize = "default" | "sm" | "lg" | "xl";
const SIZES: Record<BtnSize, { h: number; fs: number; fw: "500" | "600"; px: number }> = {
  sm: { h: 28, fs: 12.8, fw: "500", px: 10 },
  default: { h: 36, fs: 14, fw: "500", px: 12 },
  lg: { h: 48, fs: 16, fw: "500", px: 16 },
  xl: { h: 56, fs: 16, fw: "600", px: 10 },
};

/** Hap düğme (web: shadcn Button + [data-slot=button] { border-radius: 9999px }). */
export function Button({ title, icon, loading, variant = "primary", size = "default", disabled, onPress, style, ...p }:
  Omit<PressableProps, "style"> & { title: string; icon?: React.ReactNode; loading?: boolean; variant?: BtnVariant; size?: BtnSize; style?: StyleProp<ViewStyle> }) {
  const c = useColors();
  const s = SIZES[size];
  const bg = variant === "secondary" ? c.secondary : c.primary;
  const fg = variant === "secondary" ? c.secondaryForeground : c.primaryForeground;
  return (
    <Pressable
      {...p}
      disabled={disabled || loading}
      onPress={(e) => { haptic(); onPress?.(e); }}
      style={({ pressed }) => [{
        height: s.h, borderRadius: radius.pill, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
        paddingHorizontal: s.px, backgroundColor: bg, opacity: disabled ? 0.5 : 1,
        boxShadow: variant === "navy" ? c.shadow.navy : undefined,
        transform: [{ scale: pressed ? 0.97 : 1 }],
      }, style]}>
      {loading ? <ActivityIndicator color={fg} /> : (
        <>
          {icon}
          <Text style={{ fontSize: s.fs, fontWeight: s.fw, color: fg }}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

export const Field = forwardRef<TextInputInstance, TextInputProps & { label: string }>(function Field({ label, style, ...p }, ref) {
  const c = useColors();
  return (
    <View style={{ gap: 6 }}>
      <Txt style={{ fontSize: 14, fontWeight: "500" }}>{label}</Txt>
      <TextInput
        ref={ref}
        placeholderTextColor={c.mutedForeground}
        {...p}
        style={[{ height: 44, borderRadius: radius.md, backgroundColor: c.muted, paddingHorizontal: 16, fontSize: 16, color: c.foreground }, style]}
      />
    </View>
  );
});

/** Küçük istatistik kutusu (web: r-md bg-muted px-2 py-3, değer 18px kalın, etiket 11px). */
export function Stat({ label, value }: { label: string; value: string }) {
  const c = useColors();
  return (
    <View style={{ flex: 1, borderRadius: radius.md, paddingVertical: 12, paddingHorizontal: 8, alignItems: "center", backgroundColor: c.muted }}>
      <Txt numberOfLines={1} adjustsFontSizeToFit style={{ fontSize: 18, lineHeight: 22.5, fontWeight: "700", fontVariant: ["tabular-nums"] }}>{value}</Txt>
      <Txt muted style={{ fontSize: 11, lineHeight: 13.75, marginTop: 4, textAlign: "center" }}>{label}</Txt>
    </View>
  );
}

/** iOS büyük başlıklı sayfa iskeleti (web: Page bileşeni). */
export function Screen({ title, eyebrow, accessory, children, tabs = true, refreshControl }: {
  title: string; eyebrow?: React.ReactNode; accessory?: React.ReactNode; children: React.ReactNode; tabs?: boolean;
  refreshControl?: React.ComponentProps<typeof ScrollView>["refreshControl"];
}) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.background }}
      refreshControl={refreshControl}
      contentContainerStyle={{ paddingTop: insets.top + space.top, paddingBottom: (tabs ? TAB_BAR_SPACE : 24) + insets.bottom, paddingHorizontal: space.page, gap: space.section }}>
      <View style={{ gap: 4, paddingBottom: 5 }}>
        {eyebrow || accessory ? (
          <View style={{ minHeight: 32, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <Eyebrow>{eyebrow}</Eyebrow>
            {accessory}
          </View>
        ) : null}
        <Txt numberOfLines={1} adjustsFontSizeToFit style={{ fontSize: 34, lineHeight: 40.8, fontWeight: "700", letterSpacing: -0.748 }}>{title}</Txt>
      </View>
      {children}
    </ScrollView>
  );
}

/** Büyük başlığın altı ekranın üstünden bu kadar yukarı çıkınca küçük başlık şeridi belirir (web: rootMargin -56px) */
export const COMPACT_AT = space.top + 36 + 4 + 41 + 5 - 56;

/**
 * Kaydırınca üstte beliren küçük başlık şeridi (web: .compact-bar): bulanık yarı saydam zemin,
 * alt kenarda ince çizgi, ortada 17px başlık; 180 ms'de solarak açılır/kapanır.
 */
export function CompactBar({ title, visible }: { title: string; visible: boolean }) {
  const c = useColors();
  const dark = useIsDark();
  const insets = useSafeAreaInsets();
  const [o] = useState(() => new Animated.Value(0));
  useEffect(() => { Animated.timing(o, { toValue: visible ? 1 : 0, duration: 180, useNativeDriver: true }).start(); }, [visible, o]);
  return (
    <Animated.View pointerEvents={visible ? "auto" : "none"} accessibilityElementsHidden={!visible}
      style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 30, opacity: o, paddingTop: insets.top, borderBottomWidth: 0.5, borderBottomColor: c.hairline, overflow: "hidden" }}>
      <BlurView intensity={100} tint={dark ? "dark" : "light"} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} />
      <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: c.barBg }} />
      <View style={{ height: 44, alignItems: "center", justifyContent: "center", paddingHorizontal: 48 }}>
        <Text numberOfLines={1} style={{ fontSize: 17, fontWeight: "600", color: c.foreground }}>{title}</Text>
      </View>
    </Animated.View>
  );
}
