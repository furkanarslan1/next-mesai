import { BlurView } from "expo-blur";
import { useEffect, useState, useSyncExternalStore } from "react";
import {
  Animated, Easing, KeyboardAvoidingView, Modal, PanResponder, Platform, Pressable, ScrollView, StyleSheet, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { radius, useColors, useIsDark } from "@/theme";
import { Txt } from "./ui";

/* Açık panel sayısı: arkadaki sayfa (PageStack) buna göre geri çekilir */
let depth = 0;
const subs = new Set<() => void>();
const setDepth = (d: number) => { depth = Math.max(0, d); subs.forEach((f) => f()); };
const useDepth = () => useSyncExternalStore((f) => { subs.add(f); return () => { subs.delete(f); }; }, () => depth);

const EASE = Easing.bezier(0.2, 0.9, 0.3, 1);

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
  const [v] = useState(() => new Animated.Value(0));
  useEffect(() => { Animated.timing(v, { toValue: d > 0 ? 1 : 0, duration: 420, easing: EASE, useNativeDriver: false }).start(); }, [d, v]);
  return (
    <Animated.View style={{ flex: 1, backgroundColor: v.interpolate({ inputRange: [0, 1], outputRange: [c.background, "#000000"] }) }}>
      <Animated.View style={{
        // Web'deki gibi panel açıkken sayfa zemini saydamlaşır, arkadaki siyah görünür (yalnızca kartlar kalır)
        flex: 1, overflow: "hidden", backgroundColor: v.interpolate({ inputRange: [0, 1], outputRange: [c.background, "rgba(0, 0, 0, 0)"] }),
        borderRadius: v.interpolate({ inputRange: [0, 1], outputRange: [0, 22.4] }),
        transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 0.93] }) }],
      }}>
        {children}
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: "#000", opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0, 0.18] }) }]} />
      </Animated.View>
    </Animated.View>
  );
}

/**
 * Alttan açılan panel (web'deki bottom sheet): üstte tutamak, yarı saydam bulanık zemin, 2rem üst köşeler.
 * Arka plana dokununca ya da aşağı sürükleyince kapanır; klavye açılınca yukarı kayar.
 */
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title?: string; children: React.ReactNode }) {
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
    Animated.parallel([
      Animated.timing(y, { toValue: 800, duration: 260, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
      Animated.timing(fade, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start(() => setVisible(false));
  }, [open, y, fade]);



  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
      <BlurView intensity={20} tint={dark ? "dark" : "light"} style={StyleSheet.absoluteFill} pointerEvents="none" />
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: fade }]}>
        <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.10)" }]} onPress={onClose} accessibilityLabel="Kapat" />
      </Animated.View>
      <KeyboardAvoidingView pointerEvents="box-none" style={{ flex: 1, justifyContent: "flex-end" }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <Animated.View {...drag.handlers} style={[styles.panel, { borderColor: c.dialogBorder, transform: [{ translateY: y }] }]}>
          <BlurView intensity={100} tint={dark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: c.sheetBg }]} />
          <View style={[styles.grabber, { backgroundColor: c.mutedForeground }]} />
          <ScrollView keyboardShouldPersistTaps="handled" bounces={false} scrollEventThrottle={16}
            onScroll={(e) => { drag.setTop(e.nativeEvent.contentOffset.y); }}
            contentContainerStyle={{ gap: 20, paddingHorizontal: 20, paddingTop: 20, paddingBottom: insets.bottom + 24 }}>
            {title ? <Txt style={{ fontSize: 18, lineHeight: 24, fontWeight: "600" }}>{title}</Txt> : null}
            {children}
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  panel: { maxHeight: "92%", width: "100%", maxWidth: 512, alignSelf: "center", overflow: "hidden", borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, borderWidth: 1, borderBottomWidth: 0 },
  grabber: { position: "absolute", top: 8, alignSelf: "center", width: 36, height: 5, borderRadius: 3, opacity: 0.45, zIndex: 1 },
});
