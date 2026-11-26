import { Trash2 } from "@/components/icons";
import { useState } from "react";
import { Animated, Easing, PanResponder, Pressable, StyleSheet, Text, View, type ViewStyle } from "react-native";
import { haptic } from "@/lib/haptics";
import { useColors } from "@/theme";

const W = 84;
const EASE = Easing.bezier(0.2, 0.9, 0.3, 1);

/** Sürükleme işleyicisi: yatay harekette satırı oynatır, dikey kaydırmayı listeye bırakır. */
function rowDrag(x: Animated.Value) {
  let base = 0;
  let open = false;
  const settle = (to: number) => {
    open = to !== 0;
    Animated.timing(x, { toValue: to, duration: 300, easing: EASE, useNativeDriver: true }).start();
  };
  const pan = PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy),
    onPanResponderGrant: () => { base = open ? -W : 0; },
    onPanResponderMove: (_, g) => {
      const next = base + g.dx;
      // Sona doğru direnç (iOS'taki lastik etkisi)
      x.setValue(next > 0 ? next * 0.2 : next < -W ? -W + (next + W) * 0.25 : next);
    },
    onPanResponderRelease: (_, g) => {
      const now = base + g.dx;
      const willOpen = now < -W / 2;
      if (willOpen && !open) haptic();
      settle(willOpen ? -W : 0);
    },
    onPanResponderTerminate: () => settle(open ? -W : 0),
  });
  return { handlers: pan.panHandlers, close: () => settle(0), isOpen: () => open };
}

/**
 * Web'deki SwipeRow'un aynısı: sola kaydırınca arkadan kırmızı "Sil" çıkar. Satır açıkken içteki dokunuş
 * (düzenleme) yerine satır kapanır.
 */
export function SwipeRow({ children, onDelete, onPress, label = "Sil", style, bg }: {
  children: React.ReactNode; onDelete: () => void; onPress?: () => void; label?: string; style?: ViewStyle;
  /** Satır zemini (varsayılan kart rengi; bordro kontrolünde muted) */
  bg?: string;
}) {
  const c = useColors();
  const [x] = useState(() => new Animated.Value(0));
  const [drag] = useState(() => rowDrag(x));
  return (
    <View style={[{ overflow: "hidden" }, style]}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: c.destructive, opacity: x.interpolate({ inputRange: [-1, 0], outputRange: [1, 0], extrapolate: "clamp" }) }]}>
        <Pressable onPress={() => { drag.close(); onDelete(); }} accessibilityLabel={label}
          style={{ position: "absolute", top: 0, bottom: 0, right: 0, width: W, alignItems: "center", justifyContent: "center", paddingRight: 4 }}>
          <Trash2 size={18} color="#fff" />
          <Text maxFontSizeMultiplier={1.2} style={{ color: "#fff", fontSize: 14, fontWeight: "600", marginTop: 2 }}>{label}</Text>
        </Pressable>
      </Animated.View>
      <Animated.View {...drag.handlers} style={{ transform: [{ translateX: x }] }}>
        <Pressable onPress={() => { if (drag.isOpen()) drag.close(); else onPress?.(); }}
          style={({ pressed }) => ({ backgroundColor: bg ?? (pressed && onPress ? c.muted : c.card), opacity: bg && pressed ? 0.9 : 1 })}>
          {children}
        </Pressable>
      </Animated.View>
    </View>
  );
}
