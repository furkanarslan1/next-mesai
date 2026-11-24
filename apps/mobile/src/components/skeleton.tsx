import { useEffect, useState } from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";
import Reanimated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import { useReduceMotion } from "@/lib/motion";
import { radius, useColors, useIsDark } from "@/theme";

/**
 * Yükleme iskeleti (web: `.animate-pulse[aria-busy]`): kart zemini üzerinde soldan sağa geçen ışıltı,
 * 1,4 sn, doğrusal, sürekli. Yalnızca yüklenirken ekranda kalır; UI iş parçacığında kaydırma.
 * `bare`: kart değil, bir liste satırı yerine (köşesiz, çerçevesiz).
 */
export function Skeleton({ style, size = "xl", bare = false }: { style?: ViewStyle; size?: "xl" | "lg"; bare?: boolean }) {
  const c = useColors();
  const dark = useIsDark();
  const reduce = useReduceMotion();
  const [w, setW] = useState(0);
  const t = useSharedValue(0);
  useEffect(() => {
    t.set(0);
    if (!reduce && w > 0) t.set(withRepeat(withTiming(1, { duration: 1400, easing: Easing.linear }), -1, false));
  }, [reduce, w, t]);
  // Web: 200% genişlikte katman, background-position 150% → -50% ⇒ katman -1,5W'dan +0,5W'ya kayar
  const band = useAnimatedStyle(() => ({ transform: [{ translateX: -1.5 * w + 2 * w * t.get() }] }));
  const shine = dark ? "rgba(207, 234, 224, 0.07)" : "rgba(241, 249, 246, 0.7)";
  return (
    <View aria-busy onLayout={(e) => setW(e.nativeEvent.layout.width)}
      style={[{ overflow: "hidden", backgroundColor: c.card },
        bare ? null : { borderRadius: size === "xl" ? radius.xl : radius.lg, borderWidth: 1, borderColor: c.cardBorder, boxShadow: c.shadow.card },
        style]}>
      {w > 0 ? (
        <Reanimated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { width: 2 * w, right: undefined,
          experimental_backgroundImage: `linear-gradient(100deg, transparent 30%, ${shine} 50%, transparent 70%)` }, band]} />
      ) : null}
    </View>
  );
}
