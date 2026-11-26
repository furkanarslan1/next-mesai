import { BlurView } from "expo-blur";
import { CircleCheck, Info, OctagonX } from "@/components/icons";
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors, useIsDark } from "@/theme";

/**
 * Web'deki bildirim balonunun aynısı (sonner, üstte ortada): yarı saydam bulanık zemin, 1.4rem köşe,
 * solda küçük ikon, kalın metin; aynı anda tek bildirim, 1,6 sn (geri al düğmeli olanlar daha uzun).
 */
type Kind = "success" | "error" | "info";
interface Item { id: number; kind: Kind; text: string; action?: { label: string; onPress: () => void }; duration: number }
interface Opts { action?: Item["action"]; duration?: number }

let push: ((i: Omit<Item, "id">) => void) | null = null;
const show = (kind: Kind) => (text: string, o: Opts = {}) => push?.({ kind, text, action: o.action, duration: o.duration ?? 1600 });
export const toast = { success: show("success"), error: show("error"), info: show("info") };

export function Toaster() {
  const [item, setItem] = useState<Item | null>(null);
  const [v] = useState(() => new Animated.Value(0));
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const insets = useSafeAreaInsets();
  const c = useColors();
  const dark = useIsDark();

  useEffect(() => {
    let n = 0;
    const hide = () => Animated.timing(v, { toValue: 0, duration: 200, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(() => setItem(null));
    push = (i) => {
      if (timer.current) clearTimeout(timer.current);
      setItem({ ...i, id: ++n });
      v.setValue(0);
      Animated.timing(v, { toValue: 1, duration: 400, easing: Easing.bezier(0.21, 1.02, 0.73, 1), useNativeDriver: true }).start();
      timer.current = setTimeout(hide, i.duration);
    };
    return () => { push = null; if (timer.current) clearTimeout(timer.current); };
  }, [v]);

  if (!item) return null;
  const Icon = item.kind === "error" ? OctagonX : item.kind === "success" ? CircleCheck : Info;
  const close = () => {
    if (timer.current) clearTimeout(timer.current);
    Animated.timing(v, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => setItem(null));
  };
  return (
    <Animated.View pointerEvents="box-none" style={[styles.wrap, {
      top: Math.max(12, insets.top),
      opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [-24, 0] }) }],
    }]}>
      <View style={[styles.toast, { boxShadow: c.shadow.toast }]}>
        <BlurView intensity={100} tint={dark ? "dark" : "light"} style={[StyleSheet.absoluteFill, { borderRadius: 22.4, overflow: "hidden" }]} />
        <View style={[StyleSheet.absoluteFill, { borderRadius: 22.4, backgroundColor: c.toastBg }]} />
        <Icon size={16} color={c.foreground} />
        <Text maxFontSizeMultiplier={1.35} style={[styles.text, { color: c.foreground }]} numberOfLines={3}>{item.text}</Text>
        {item.action ? (
          <Pressable onPress={() => { item.action?.onPress(); close(); }} hitSlop={8}
            style={{ height: 24, paddingHorizontal: 8, borderRadius: 6, justifyContent: "center", backgroundColor: c.foreground }}>
            <Text maxFontSizeMultiplier={1.35} style={{ color: c.popover, fontWeight: "500", fontSize: 12 }}>{item.action.label}</Text>
          </Pressable>
        ) : null}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", left: 16, right: 16, alignItems: "center", zIndex: 1000 },
  toast: {
    flexDirection: "row", alignItems: "center", gap: 6, width: "100%", maxWidth: 356, overflow: "hidden",
    paddingVertical: 12.8, paddingHorizontal: 17.6, borderRadius: 22.4,
  },
  text: { flex: 1, fontSize: 13, fontWeight: "600", lineHeight: 19.5 },
});
