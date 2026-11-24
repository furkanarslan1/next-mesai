import { useEffect, useRef, useState } from "react";
import type { TextProps } from "react-native";
import { useReduceMotion } from "@/lib/motion";
import { Txt } from "./ui";

/**
 * Değer değişince sayaç gibi akarak güncellenen sayı (web: AnimatedNumber): 650 ms, yavaşlayarak biter.
 * İlk çizimde animasyon yapmaz (ekran açılışında titremesin); "Hareketi azalt" açıksa hiç oynamaz.
 */
export function AnimatedNumber({ value, format, duration = 650, style, ...p }: TextProps & {
  value: number; format: (n: number) => string; duration?: number;
}) {
  const reduce = useReduceMotion();
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  const raf = useRef(0);

  useEffect(() => {
    const start = from.current;
    if (start === value) return;
    if (reduce) { from.current = value; setShown(value); return; }
    const t0 = performance.now();
    const ease = (t: number) => 1 - Math.pow(1 - t, 3);
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / duration);
      const v = start + (value - start) * ease(t);
      from.current = v;
      setShown(v);
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [value, duration, reduce]);

  return <Txt {...p} style={[{ fontVariant: ["tabular-nums"] }, style]}>{format(shown)}</Txt>;
}
