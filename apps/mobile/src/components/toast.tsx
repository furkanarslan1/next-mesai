import { useEffect, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { radius, useColors } from "@/theme";

/**
 * Üstten inen bildirim balonu (web'deki sonner bildirimlerinin karşılığı).
 * `toast.success("Kaydedildi")`, `toast.error(...)`, `toast.info(...)`; isteğe bağlı "Geri al" gibi bir düğme.
 */
type Kind = "success" | "error" | "info";
interface Item { id: number; kind: Kind; text: string; action?: { label: string; onPress: () => void }; duration: number }
interface Opts { action?: Item["action"]; duration?: number }

let push: ((i: Omit<Item, "id">) => void) | null = null;
const show = (kind: Kind) => (text: string, o: Opts = {}) => push?.({ kind, text, action: o.action, duration: o.duration ?? 2600 });
export const toast = { success: show("success"), error: show("error"), info: show("info") };

export function Toaster() {
  const [item, setItem] = useState<Item | null>(null);
  const [y] = useState(() => new Animated.Value(-120));
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const insets = useSafeAreaInsets();
  const c = useColors();

  useEffect(() => {
    let n = 0;
    const hide = () => Animated.timing(y, { toValue: -120, duration: 200, useNativeDriver: true }).start(() => setItem(null));
    push = (i) => {
      if (timer.current) clearTimeout(timer.current);
      setItem({ ...i, id: ++n });
      y.setValue(-120);
      Animated.spring(y, { toValue: 0, useNativeDriver: true, damping: 18, stiffness: 220 }).start();
      timer.current = setTimeout(hide, i.duration);
    };
    return () => { push = null; if (timer.current) clearTimeout(timer.current); };
  }, [y]);

  if (!item) return null;
  const dot = item.kind === "error" ? c.destructive : item.kind === "success" ? c.ring : c.mutedForeground;
  const close = () => {
    if (timer.current) clearTimeout(timer.current);
    Animated.timing(y, { toValue: -120, duration: 180, useNativeDriver: true }).start(() => setItem(null));
  };
  return (
    <Animated.View pointerEvents="box-none" style={[styles.wrap, { top: insets.top + 8, transform: [{ translateY: y }] }]}>
      <View style={[styles.toast, { backgroundColor: c.card, shadowColor: "#000" }]}>
        <View style={[styles.dot, { backgroundColor: dot }]} />
        <Text style={[styles.text, { color: c.foreground }]} numberOfLines={3}>{item.text}</Text>
        {item.action ? (
          <Pressable onPress={() => { item.action?.onPress(); close(); }} hitSlop={8}>
            <Text style={{ color: c.tint, fontWeight: "700", fontSize: 15 }}>{item.action.label}</Text>
          </Pressable>
        ) : null}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", left: 16, right: 16, alignItems: "center", zIndex: 1000 },
  toast: {
    flexDirection: "row", alignItems: "center", gap: 10, maxWidth: 480, width: "100%",
    paddingVertical: 13, paddingHorizontal: 18, borderRadius: radius.lg,
    shadowOpacity: 0.18, shadowRadius: 20, shadowOffset: { width: 0, height: 10 }, elevation: 10,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  text: { flex: 1, fontSize: 15, fontWeight: "600" },
});
