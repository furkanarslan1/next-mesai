import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import Reanimated, { Easing, interpolate, useAnimatedStyle, useSharedValue, withSequence, withTiming, type SharedValue } from "react-native-reanimated";
import { haptic } from "@/lib/haptics";
import { useReduceMotion } from "@/lib/motion";
import { useColors } from "@/theme";

const EASE = Easing.bezier(0.2, 0.9, 0.3, 1);

function Dot({ i, t, distance, color }: { i: number; t: SharedValue<number>; distance: number; color: string }) {
  const a = (i * 30 + (i % 2) * 12) * (Math.PI / 180);
  const d = distance * (i % 3 === 0 ? 1.15 : i % 3 === 1 ? 0.85 : 1);
  const dx = Math.cos(a) * d, dy = Math.sin(a) * d;
  const size = i % 2 ? 6 : 8;
  const style = useAnimatedStyle(() => {
    const v = t.get();
    return {
      opacity: interpolate(v, [0, 0.7, 1], [1, 1, 0]),
      transform: [{ translateX: dx * v }, { translateY: dy * v }, { scale: 0.4 + 0.6 * v }],
    };
  });
  return <Reanimated.View style={[{ position: "absolute", width: size, height: size, borderRadius: size / 2, backgroundColor: color }, style]} />;
}

/**
 * Kutlama patlaması (web: components/mesai/celebrate.tsx): 12 parçacık merkezden dışa saçılıp kaybolur,
 * 0,9 sn, yalnızca kaydırma/ölçek/saydamlık (UI iş parçacığı). `burst` her arttığında yeniden oynar.
 */
export function Celebrate({ burst, distance = 64 }: { burst: number; distance?: number }) {
  const c = useColors();
  const reduce = useReduceMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    if (!burst || reduce) return;
    t.set(0);
    t.set(withTiming(1, { duration: 900, easing: EASE }));
  }, [burst, reduce, t]);
  if (!burst || reduce) return null;
  const colors = [c.ringA, c.ringB, "#f5b83d", c.tint];
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { alignItems: "center", justifyContent: "center" }]}>
      {Array.from({ length: 12 }, (_, i) => <Dot key={i} i={i} t={t} distance={distance} color={colors[i % 4]} />)}
    </View>
  );
}

/**
 * Değer aynı bağlamda (ör. aynı ay) ve veri yüklüyken YÜKSELİNCE bir kez kutlama sayacını artırır.
 * Açılış, ay değişimi ya da ilk veri yüklenmesi kutlama sayılmaz (web: useRiseBurst).
 */
export function useRiseBurst(key: string, value: number, ready: boolean) {
  const [prev, setPrev] = useState({ key, value, ready });
  const [burst, setBurst] = useState(0);
  if (prev.key !== key || prev.value !== value || prev.ready !== ready) {
    if (prev.key === key && prev.ready && ready && value > prev.value) setBurst((b) => b + 1);
    setPrev({ key, value, ready });
  }
  useEffect(() => { if (burst) haptic("success"); }, [burst]);
  return burst;
}

/** Kutlamada öğe bir kez "pop" yapar (1 → 1,08 → 1, 500 ms); web: usePop. */
export function usePop(burst: number) {
  const reduce = useReduceMotion();
  const s = useSharedValue(1);
  useEffect(() => {
    if (!burst || reduce) return;
    s.set(withSequence(withTiming(1.08, { duration: 200, easing: EASE }), withTiming(1, { duration: 300, easing: EASE })));
  }, [burst, reduce, s]);
  return useAnimatedStyle(() => ({ transform: [{ scale: s.get() }] }));
}
