"use client";

import { useEffect, useRef, useState } from "react";
import { haptic } from "@/lib/haptics";

/**
 * Kutlama patlaması: 12 parçacık merkezden dışa saçılıp kaybolur (0,9 sn, yalnızca transform/opacity).
 * `burst` her arttığında yeniden oynar (0 iken çizilmez). Hedef %100 ve seviye atlama için.
 * Mobildeki karşılığı: apps/mobile/src/components/celebrate.tsx (aynı açılar, mesafe ve süre).
 */
const COLORS = ["var(--ring-a)", "var(--ring-b)", "#f5b83d", "var(--tint)"];
export function Celebrate({ burst, distance = 64 }: { burst: number; distance?: number }) {
  if (!burst) return null;
  return (
    <span key={burst} className="pointer-events-none absolute inset-0 grid place-items-center" aria-hidden>
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i * 30 + (i % 2) * 12) * (Math.PI / 180);
        const d = distance * (i % 3 === 0 ? 1.15 : i % 3 === 1 ? 0.85 : 1);
        return (
          <span key={i} className="celebrate-dot absolute rounded-full"
            style={{ width: i % 2 ? 6 : 8, height: i % 2 ? 6 : 8, background: COLORS[i % 4],
              "--dx": `${Math.cos(a) * d}px`, "--dy": `${Math.sin(a) * d}px` } as React.CSSProperties} />
        );
      })}
    </span>
  );
}

/**
 * Değer aynı bağlamda (ör. aynı ay) ve veri yüklüyken YÜKSELİNCE bir kez kutlama sayacını artırır.
 * Sayfa açılışı, ay değişimi ya da ilk veri yüklenmesi kutlama sayılmaz. Hedef: 0 → 1; seviye: 2 → 3.
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

/** Kutlamada öğeyi yeniden oluşturmadan bir kez "pop" (büyüyüp geri döner) oynatır. */
export function usePop<T extends HTMLElement>(burst: number) {
  const ref = useRef<T>(null);
  useEffect(() => {
    if (!burst || !ref.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    ref.current.animate([{ scale: 1 }, { scale: 1.08, offset: 0.4 }, { scale: 1 }], { duration: 500, easing: "cubic-bezier(0.2, 0.9, 0.3, 1)" });
  }, [burst]);
  return ref;
}
