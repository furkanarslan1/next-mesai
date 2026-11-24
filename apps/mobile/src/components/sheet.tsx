import { BlurView } from "expo-blur";
import { X } from "@/components/icons";
import { useEffect, useState, useSyncExternalStore } from "react";
import {
  Animated, Easing, KeyboardAvoidingView, Modal, PanResponder, Pressable, ScrollView, StyleSheet, View,
} from "react-native";
import Reanimated, { Easing as REasing, interpolateColor, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { radius, useColors, useIsDark } from "@/theme";
import { Txt } from "./ui";

/* Açık panel sayısı: arkadaki sayfa (PageStack) buna göre geri çekilir */
let depth = 0;
const subs = new Set<() => void>();
const setDepth = (d: number) => { depth = Math.max(0, d); subs.forEach((f) => f()); };
const useDepth = () => useSyncExternalStore((f) => { subs.add(f); return () => { subs.delete(f); }; }, () => depth);

const EASE = Easing.bezier(0.2, 0.9, 0.3, 1);
const REASE = REasing.bezier(0.2, 0.9, 0.3, 1);

/** Panel sürükleme işleyicisi: içerik en üstteyken aşağı çekilirse panel izler; yeterince çekilince (ya da hızlı) kapanır. */
function sheetDrag(y: Animated.Value) {
  let top = 0;
  let close = () => {};
  const pan = PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => g.dy > 6 && Math.abs(g.dy) > Math.abs(g.dx) && top <= 0,
    onPanResponderMove: (_, g) => { if (g.dy > 0) y.setValue(g.dy); },
    onPanResponderRelease: (_, g) => {
      if (g.dy > 140 || g.vy > 0.7) close();
      else Animated.timing(y, { toValue: 0, duration: 320, easing: EASE, useNativeDriver: true }).start();
    },
  });
  return { handlers: pan.panHandlers, setTop: (v: number) => { top = v; }, setClose: (f: () => void) => { close = f; } };
}

/**
 * Sayfa sarmalayıcı: panel açıkken web'deki gibi sayfa %93'e küçülür, köşeleri yuvarlanır ve kararır,
 * arkası siyah görünür (iOS kart yığını).
 */
export function PageStack({ children }: { children: React.ReactNode }) {
  const c = useColors();
  const d = useDepth();
  // UI iş parçacığında (Reanimated): panel açılırken JS meşgul olsa da sayfa akıcı küçülür
  const v = useSharedValue(0);
  useEffect(() => { v.set(withTiming(d > 0 ? 1 : 0, { duration: 420, easing: REASE })); }, [d, v]);
  const bg = c.background;
  const outer = useAnimatedStyle(() => ({ backgroundColor: interpolateColor(v.get(), [0, 1], [bg, "#000000"]) }));
  const inner = useAnimatedStyle(() => ({
    // Web'deki gibi panel açıkken sayfa zemini saydamlaşır, arkadaki siyah görünür (yalnızca kartlar kalır)
    backgroundColor: interpolateColor(v.get(), [0, 1], [bg, "rgba(0, 0, 0, 0)"]),
    borderRadius: v.get() * 22.4,
    transform: [{ scale: 1 - v.get() * 0.07 }],
  }));
  const dim = useAnimatedStyle(() => ({ opacity: v.get() * 0.18 }));
  return (
    <Reanimated.View style={[{ flex: 1 }, outer]}>
      <Reanimated.View style={[{ flex: 1, overflow: "hidden" }, inner]}>
        {children}
        <Reanimated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: "#000" }, dim]} />
      </Reanimated.View>
    </Reanimated.View>
  );
}

/**
 * Alttan açılan panel (web'deki bottom sheet): üstte tutamak, yarı saydam bulanık zemin, 2rem üst köşeler.
 * Arka plana dokununca ya da aşağı sürükleyince kapanır; klavye açılınca yukarı kayar.
 */
export function Sheet({ open, onClose, title, description, showClose = false, gap = 16, footer, children }: {
  open: boolean; onClose: () => void; title?: string; description?: string; showClose?: boolean; gap?: number;
  /** Panelin altında sabit kalan alan (ör. Kaydet çubuğu) */
  footer?: React.ReactNode; children: React.ReactNode;
}) {
  const c = useColors();
  const dark = useIsDark();
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(open);
  const [y] = useState(() => new Animated.Value(800));
  const [fade] = useState(() => new Animated.Value(0));
  // Aşağı sürükleyince kapanma: işleyici iç kaydırma konumunu ve güncel kapatma işlevini kendi içinde tutar
  const [drag] = useState(() => sheetDrag(y));
  useEffect(() => { drag.setClose(onClose); }, [onClose, drag]);

  // Açılış/kapanış animasyonu; kapanınca Modal kaldırılır
  const [shown, setShown] = useState(open);
  if (open !== shown) {
    setShown(open);
    if (open) setVisible(true);
  }
  useEffect(() => {
    if (open) {
      setDepth(depth + 1);
      y.setValue(800);
      Animated.parallel([
        Animated.timing(y, { toValue: 0, duration: 380, easing: EASE, useNativeDriver: true }),
        Animated.timing(fade, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();
      return () => setDepth(depth - 1);
    }
    // Kapanma animasyonu yalnızca açık bir panel kapanırken; yarıda kesilirse (yeniden açıldıysa) gizlemez
    if (!visible) return;
    Animated.parallel([
      Animated.timing(y, { toValue: 800, duration: 260, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
      Animated.timing(fade, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start(({ finished }) => { if (finished) setVisible(false); });
  }, [open, y, fade]); // eslint-disable-line react-hooks/exhaustive-deps



  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
      <BlurView intensity={20} tint={dark ? "dark" : "light"} style={StyleSheet.absoluteFill} pointerEvents="none" />
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: fade }]}>
        <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.10)" }]} onPress={onClose} accessibilityLabel="Kapat" />
      </Animated.View>
      <KeyboardAvoidingView pointerEvents="box-none" style={{ flex: 1, justifyContent: "flex-end" }} behavior="padding">
        <Animated.View {...drag.handlers} style={[styles.panel, { borderColor: c.dialogBorder, transform: [{ translateY: y }] }]}>
          <BlurView intensity={100} tint={dark ? "dark" : "light"} style={[StyleSheet.absoluteFill, styles.topRound]} />
          <View style={[StyleSheet.absoluteFill, styles.topRound, { backgroundColor: c.sheetBg }]} />
          <View style={[styles.grabber, { backgroundColor: c.mutedForeground }]} />
          <ScrollView keyboardShouldPersistTaps="handled" bounces={false} scrollEventThrottle={16}
            onScroll={(e) => { drag.setTop(e.nativeEvent.contentOffset.y); }}
            contentContainerStyle={{ gap, paddingHorizontal: 20, paddingTop: 20, paddingBottom: footer ? 16 : insets.bottom + 24 }}>
            {title ? (
              <View style={{ gap: 2 }}>
                <Txt style={{ fontSize: 18, lineHeight: 28, fontWeight: "500", paddingRight: showClose ? 28 : 0 }}>{title}</Txt>
                {description ? <Txt muted style={{ fontSize: 14, lineHeight: 20 }}>{description}</Txt> : null}
              </View>
            ) : null}
            {children}
          </ScrollView>
          {footer ? (
            <View style={{ gap: 8, borderTopWidth: 1, borderTopColor: c.border, paddingHorizontal: 20, paddingTop: 12, paddingBottom: insets.bottom + 16, backgroundColor: c.popover }}>{footer}</View>
          ) : null}
          {showClose ? (
            <Pressable onPress={onClose} accessibilityLabel="Kapat" hitSlop={8}
              style={({ pressed }) => ({ position: "absolute", top: 12, right: 12, width: 28, height: 28, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: pressed ? c.muted : "transparent", zIndex: 2 })}>
              <X size={16} color={c.foreground} />
            </Pressable>
          ) : null}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  panel: { maxHeight: "92%", width: "100%", maxWidth: 512, alignSelf: "center", overflow: "hidden", borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, borderWidth: 1, borderBottomWidth: 0 },
  topRound: { borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, overflow: "hidden" },
  grabber: { position: "absolute", top: 8, alignSelf: "center", width: 36, height: 5, borderRadius: 3, opacity: 0.45, zIndex: 1 },
});
