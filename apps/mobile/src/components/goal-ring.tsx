import { useEffect, useId } from "react";
import { View } from "react-native";
import Animated, { Easing, useAnimatedProps, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import { useReduceMotion } from "@/lib/motion";
import Svg, { Circle, Defs, FeGaussianBlur, Filter, G, LinearGradient, Stop } from "react-native-svg";
import { useColors } from "@/theme";

const R = 50;
const C = 2 * Math.PI * R;
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedG = Animated.createAnimatedComponent(G);

/**
 * Web'deki hedef halkasının aynısı (Apple Fitness tarzı): nane → teal geçişli yay, arkasında yumuşak
 * parıltı, ucunda beyaz nokta. Açılışta sıfırdan dolar, değer değişince yay ve uç birlikte kayar.
 */
export function GoalRing({ percent, size = 156, stroke = 14, children }: {
  percent: number; size?: number; stroke?: number; children?: React.ReactNode;
}) {
  const c = useColors();
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const p = Math.max(0, Math.min(100, percent)) / 100;
  // UI iş parçacığında (Reanimated): halka dolarken JS meşgul olsa da takılmaz
  const anim = useSharedValue(0);
  useEffect(() => { anim.set(withTiming(p, { duration: 1200, easing: Easing.bezier(0.2, 0.9, 0.3, 1) })); }, [p, anim]);
  const glow = useAnimatedProps(() => ({ strokeDashoffset: C * (1 - anim.get()) }));
  const arc = useAnimatedProps(() => ({ strokeDashoffset: C * (1 - anim.get()) }));
  const tip = useAnimatedProps(() => ({ rotation: anim.get() * 360 }));
  // Uçtaki parıltı (web: goal-glow 2,2 sn): yavaşça %20 büyüyüp parlar; "Hareketi azalt" açıksa durur
  const reduce = useReduceMotion();
  const glowT = useSharedValue(0);
  useEffect(() => {
    glowT.set(0);
    if (!reduce) glowT.set(withRepeat(withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.ease) }), -1, true));
  }, [reduce, glowT]);
  const tipR = stroke * 0.32;
  const pulse = useAnimatedProps(() => ({ r: tipR * (1 + 0.2 * glowT.get()), opacity: 0.85 + 0.15 * glowT.get() }));

  return (
    <View style={{ width: size, height: size }} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(percent) }}>
      <Svg viewBox="0 0 120 120" width={size} height={size} style={{ transform: [{ rotate: "-90deg" }], overflow: "visible" }}>
        <Defs>
          <LinearGradient id={`g${id}`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor={c.ringA} />
            <Stop offset="100%" stopColor={c.ringB} />
          </LinearGradient>
          <Filter id={`b${id}`} x="-20%" y="-20%" width="140%" height="140%">
            <FeGaussianBlur stdDeviation="3" />
          </Filter>
        </Defs>
        <Circle cx="60" cy="60" r={R} fill="none" stroke={c.ringTrack} strokeWidth={stroke} />
        {p > 0 ? (
          <>
            <AnimatedCircle cx="60" cy="60" r={R} fill="none" stroke={`url(#g${id})`} strokeWidth={stroke} opacity={0.55} filter={`url(#b${id})`}
              strokeLinecap="round" strokeDasharray={`${C} ${C}`} animatedProps={glow} />
            <AnimatedCircle cx="60" cy="60" r={R} fill="none" stroke={`url(#g${id})`} strokeWidth={stroke}
              strokeLinecap="round" strokeDasharray={`${C} ${C}`} animatedProps={arc} />
            {/* Uç: yayla aynı sürede dönen grup, böylece yay boyunca ilerler */}
            <AnimatedG animatedProps={tip} origin="60, 60">
              <AnimatedCircle cx="110" cy="60" fill={c.ringTip} animatedProps={pulse} />
            </AnimatedG>
          </>
        ) : null}
      </Svg>
      <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" }}>{children}</View>
    </View>
  );
}
