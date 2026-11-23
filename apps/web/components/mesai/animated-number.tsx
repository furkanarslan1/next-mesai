"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Değer değişince sayaç gibi akarak güncellenen sayı (ör. kazanç, saat).
 * İlk çizimde animasyon yapmaz (sayfa açılışında titremesin); "hareketi azalt" açıksa hiç oynamaz.
 */
export function AnimatedNumber({ value, format, duration = 650, className }: {
  value: number; format: (n: number) => string; duration?: number; className?: string;
}) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  const raf = useRef(0);

  useEffect(() => {
    const start = from.current;
    if (start === value) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
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
  }, [value, duration]);

  return <span className={`tabular-nums ${className ?? ""}`}>{format(shown)}</span>;
}
