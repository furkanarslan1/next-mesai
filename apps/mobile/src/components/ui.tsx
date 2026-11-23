import { BlurView } from "expo-blur";
import { forwardRef, useEffect, useState } from "react";
import {
  ActivityIndicator, Animated, Pressable, ScrollView, Text, TextInput,
  type PressableProps, type StyleProp, type TextInputInstance, type TextInputProps, type TextProps, type ViewProps, type ViewStyle, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChevronLeft } from "lucide-react-native";
import { haptic } from "@/lib/haptics";
import { PageStack } from "./sheet";
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
  default: { h: 32, fs: 14, fw: "500", px: 10 },
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
export function Stat({ label, value, size = 18 }: { label: string; value: string; size?: number }) {
  const c = useColors();
  return (
    <View style={{ flex: 1, borderRadius: radius.md, paddingVertical: 12, paddingHorizontal: 8, alignItems: "center", backgroundColor: c.muted }}>
      <Txt numberOfLines={1} adjustsFontSizeToFit style={{ fontSize: size, lineHeight: size * 1.25, fontWeight: "700", fontVariant: ["tabular-nums"] }}>{value}</Txt>
      <Txt muted style={{ fontSize: 11, lineHeight: 13.75, marginTop: 4, textAlign: "center" }}>{label}</Txt>
    </View>
  );
}

/**
 * iOS büyük başlıklı sayfa iskeleti (web: components/mesai/page.tsx): üstte küçük satır (eyebrow) ve sağında
 * öğe, büyük başlık ve sağında düğmeler; kaydırınca küçük başlık şeridi; alttan panel açılınca sayfa geri çekilir.
 */
export function Screen({ title, compactTitle, eyebrow, accessory, actions, back, children, tabs = true, refreshControl }: {
  title: React.ReactNode; compactTitle?: string; eyebrow?: React.ReactNode; accessory?: React.ReactNode; actions?: React.ReactNode;
  /** Sol üstte "‹ Raporlar" gibi geri bağlantısı (web: back) */
  back?: { label: string; onPress: () => void };
  children: React.ReactNode; tabs?: boolean;
  refreshControl?: React.ComponentProps<typeof ScrollView>["refreshControl"];
}) {
  const insets = useSafeAreaInsets();
  const [compact, setCompact] = useState(false);
  return (
    <PageStack>
      <ScrollView
        style={{ flex: 1 }}
        scrollEventThrottle={16}
        onScroll={(e) => setCompact(e.nativeEvent.contentOffset.y > COMPACT_AT)}
        refreshControl={refreshControl}
        contentContainerStyle={{ paddingTop: insets.top + space.top, paddingBottom: (tabs ? TAB_BAR_SPACE : 24) + insets.bottom, paddingHorizontal: space.page, gap: space.section }}>
        <View style={{ gap: 4, paddingBottom: 5 }}>
          {back ? <BackLink {...back} /> : null}
          {eyebrow || accessory ? (
            <View style={{ minHeight: 32, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <Eyebrow>{eyebrow}</Eyebrow>
              {accessory}
            </View>
          ) : null}
          <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 12 }}>
            {typeof title === "string" ? (
              <Txt numberOfLines={1} adjustsFontSizeToFit style={{ flexShrink: 1, fontSize: 34, lineHeight: 40.8, fontWeight: "700", letterSpacing: -0.748 }}>{title}</Txt>
            ) : <View style={{ flexShrink: 1 }}>{title}</View>}
            {actions ? <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingBottom: 4 }}>{actions}</View> : null}
          </View>
        </View>
        {children}
      </ScrollView>
      <CompactBar title={compactTitle ?? (typeof title === "string" ? title : "")} visible={compact} onBack={back?.onPress} />
    </PageStack>
  );
}

/** Büyük başlık metni (Screen'e özel başlık verilirken aynı biçim için) */
export function LargeTitle({ children }: { children: React.ReactNode }) {
  return <Txt numberOfLines={1} adjustsFontSizeToFit style={{ fontSize: 34, lineHeight: 40.8, fontWeight: "700", letterSpacing: -0.748 }}>{children}</Txt>;
}

/** Yuvarlak ikon düğme (web: Button size="icon" variant="secondary", 32px) */
export function IconButton({ onPress, label, children }: { onPress: () => void; label: string; children: React.ReactNode }) {
  const c = useColors();
  return (
    <Pressable onPress={() => { haptic(); onPress(); }} accessibilityLabel={label} accessibilityRole="button"
      style={({ pressed }) => ({ width: 32, height: 32, borderRadius: radius.pill, alignItems: "center", justifyContent: "center", backgroundColor: c.secondary, transform: [{ scale: pressed ? 0.95 : 1 }] })}>
      {children}
    </Pressable>
  );
}

/** Büyük başlığın altı ekranın üstünden bu kadar yukarı çıkınca küçük başlık şeridi belirir (web: rootMargin -56px) */
export const COMPACT_AT = space.top + 36 + 4 + 41 + 5 - 56;

/**
 * Kaydırınca üstte beliren küçük başlık şeridi (web: .compact-bar): bulanık yarı saydam zemin,
 * alt kenarda ince çizgi, ortada 17px başlık; 180 ms'de solarak açılır/kapanır.
 */
export function CompactBar({ title, visible, onBack }: { title: string; visible: boolean; onBack?: () => void }) {
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
        {onBack ? (
          <Pressable onPress={onBack} accessibilityLabel="Geri" hitSlop={8} style={{ position: "absolute", left: 8, top: 0, bottom: 0, justifyContent: "center" }}>
            <ChevronLeft size={24} strokeWidth={2.4} color={c.tint} />
          </Pressable>
        ) : null}
      </View>
    </Animated.View>
  );
}

/** "‹ Raporlar" geri bağlantısı (web: 17px tint renkli, 24px ok) */
export function BackLink({ label, onPress }: { label: string; onPress: () => void }) {
  const c = useColors();
  return (
    <Pressable onPress={onPress} accessibilityRole="link" accessibilityLabel={`${label} sayfasına dön`}
      style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", height: 36, marginLeft: -6, alignSelf: "flex-start", opacity: pressed ? 0.5 : 1 })}>
      <ChevronLeft size={24} strokeWidth={2.4} color={c.tint} />
      <Text style={{ fontSize: 17, color: c.tint }}>{label}</Text>
    </Pressable>
  );
}
