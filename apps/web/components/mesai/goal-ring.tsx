"use client";

import { useId } from "react";

const R = 50;
const C = 2 * Math.PI * R;

/**
 * Apple Fitness tarzı hedef halkası: nane → teal geçişli yay, arkasında yumuşak parıltı ve
 * ucunda parlayan nokta. Açılışta sıfırdan dolar, değer değişince yay ve uç birlikte kayar.
 */
export function GoalRing({ percent, size = 168, stroke = 14, children }: {
  percent: number; size?: number; stroke?: number; children?: React.ReactNode;
}) {
  const id = useId().replace(/:/g, "");
  const p = Math.max(0, Math.min(100, percent)) / 100;
  const offset = C * (1 - p);
  const deg = 360 * p;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}
      role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(percent)}>
      <svg viewBox="0 0 120 120" className="size-full -rotate-90 overflow-visible">
        <defs>
          <linearGradient id={`g${id}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--ring-a)" />
            <stop offset="100%" stopColor="var(--ring-b)" />
          </linearGradient>
        </defs>
        <circle cx="60" cy="60" r={R} fill="none" stroke="var(--ring-track)" strokeWidth={stroke} />
        {p > 0 && (
          <>
            <circle className="goal-ring-arc goal-ring-glow" cx="60" cy="60" r={R} fill="none" stroke={`url(#g${id})`} strokeWidth={stroke}
              strokeLinecap="round" strokeDasharray={C} strokeDashoffset={offset} style={{ "--ring-full": `${C}px` } as React.CSSProperties} />
            <circle className="goal-ring-arc" cx="60" cy="60" r={R} fill="none" stroke={`url(#g${id})`} strokeWidth={stroke}
              strokeLinecap="round" strokeDasharray={C} strokeDashoffset={offset} style={{ "--ring-full": `${C}px` } as React.CSSProperties} />
            {/* Uç: yayla aynı sürede dönen grup, böylece yay boyunca ilerler */}
            <g className="goal-ring-rot" style={{ transform: `rotate(${deg}deg)`, "--ring-deg": `${deg}deg` } as React.CSSProperties}>
              <circle className="goal-ring-tip" cx="110" cy="60" r={stroke * 0.32} fill="var(--ring-tip)" />
            </g>
          </>
        )}
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}
