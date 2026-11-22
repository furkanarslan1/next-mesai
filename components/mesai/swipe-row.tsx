"use client";

import { useEffect, useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import { haptic } from "@/lib/haptics";

const W = 84;

/**
 * iOS listesi gibi sola kaydırınca arkadan kırmızı "Sil" çıkan satır. Fare ile de sürüklenebilir.
 * Dikey kaydırma tarayıcıda kalır (touch-action: pan-y); yalnızca yatay hareket satırı oynatır.
 * Satır açıkken ya da sürüklendikten hemen sonra içteki dokunuş (düzenleme) tetiklenmez.
 */
export function SwipeRow({ children, onDelete, label = "Sil", className = "" }: {
  children: React.ReactNode; onDelete: () => void; label?: string; className?: string;
}) {
  const [x, setX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const s = useRef({ x0: 0, y0: 0, base: 0, dir: "" as "" | "h" | "v", moved: false, id: -1 });
  const rowRef = useRef<HTMLDivElement>(null);

  // Başka yere dokununca açık satır kapanır
  useEffect(() => {
    if (x === 0) return;
    const close = (e: PointerEvent) => { if (!rowRef.current?.contains(e.target as Node)) setX(0); };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [x]);

  function down(e: React.PointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return;
    s.current = { x0: e.clientX, y0: e.clientY, base: x, dir: "", moved: false, id: e.pointerId };
  }
  function move(e: React.PointerEvent<HTMLDivElement>) {
    const st = s.current;
    if (st.id !== e.pointerId) return;
    const dx = e.clientX - st.x0, dy = e.clientY - st.y0;
    if (!st.dir) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      st.dir = Math.abs(dx) > Math.abs(dy) ? "h" : "v";
      if (st.dir === "h") { try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* yakalama desteklenmiyor */ } setDragging(true); }
    }
    if (st.dir !== "h") return;
    st.moved = true;
    const next = st.base + dx;
    // Sona doğru direnç (iOS'taki lastik etkisi)
    setX(next > 0 ? next * 0.2 : next < -W ? -W + (next + W) * 0.25 : next);
  }
  function up(e: React.PointerEvent<HTMLDivElement>) {
    const st = s.current;
    if (st.id !== e.pointerId) return;
    st.id = -1;
    setDragging(false);
    if (st.dir !== "h") return;
    const open = x < -W / 2;
    if (open && st.base === 0) haptic();
    setX(open ? -W : 0);
  }

  return (
    <div ref={rowRef} className={`swipe-row ${className}`} data-dragging={dragging ? "" : undefined}>
      <button type="button" aria-label={label} tabIndex={x < 0 ? 0 : -1}
        onClick={() => { setX(0); onDelete(); }}
        className="absolute inset-y-0 right-0 flex items-center justify-end bg-destructive pr-5 text-sm font-semibold text-white"
        style={{ width: Math.max(W, -x) + 24, opacity: x < 0 ? 1 : 0 }}>
        <span className="flex flex-col items-center gap-0.5"><Trash2 className="size-4.5" />{label}</span>
      </button>
      <div className="swipe-content" style={{ transform: `translateX(${x}px)` }}
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
        onClickCapture={(e) => {
          if (s.current.moved || x !== 0) { e.preventDefault(); e.stopPropagation(); s.current.moved = false; if (x !== 0) setX(0); }
        }}>
        {children}
      </div>
    </div>
  );
}
