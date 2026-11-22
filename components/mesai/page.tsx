"use client";

import { ViewTransition, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, RotateCw } from "lucide-react";
import { mutate } from "@/lib/store";
import { haptic } from "@/lib/haptics";

/** Sayfa geçiş türleri: alt sayfaya ilerle (sağdan gelir), geri dön (soldan gelir), sekme değiştir (yumuşak geçiş). */
const SLIDE = { "nav-forward": "nav-forward", "nav-back": "nav-back", "nav-tab": "nav-tab", default: "none" };

/**
 * iOS sayfa iskeleti:
 * - Büyük başlık; aşağı kaydırınca üstte bulanık, küçük başlıklı şerit belirir (telefonda).
 * - `back` verilirse sol üstte "‹ Geri" bağlantısı (geri yönlü geçişle).
 * - Sayfa geçişleri React ViewTransition ile: ileri/geri kayar, sekmeler arası yumuşak geçer.
 * - Dokunmatik ekranda en üstteyken aşağı çekince veriler yenilenir.
 */
export function Page({ title, eyebrow, back, actions, onRefresh, children }: {
  title: React.ReactNode;
  /** Başlığın üstündeki küçük satır (ör. tarih) */
  eyebrow?: React.ReactNode;
  back?: { href: string; label: string };
  actions?: React.ReactNode;
  /** Aşağı çekip yenile; verilmezse yüklü tüm veriler yenilenir */
  onRefresh?: () => Promise<unknown>;
  children: React.ReactNode;
}) {
  const sentinel = useRef<HTMLDivElement>(null);
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setCompact(!e.isIntersecting), { rootMargin: "-56px 0px 0px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const titleText = typeof title === "string" ? title : null;

  return (
    <ViewTransition enter={SLIDE} exit={SLIDE} default="none">
      <div className="page space-y-5">
        <PullToRefresh onRefresh={onRefresh ?? mutate.refresh.everything} />

        {/* Kaydırınca beliren küçük başlık şeridi (telefon) */}
        <div aria-hidden={!compact}
          className={`compact-bar fixed inset-x-0 top-0 z-30 md:hidden ${compact ? "opacity-100" : "pointer-events-none opacity-0"}`}>
          <div className="relative flex h-11 items-center justify-center px-12">
            {back && (
              <Link href={back.href} transitionTypes={["nav-back"]} tabIndex={compact ? 0 : -1}
                className="absolute left-2 flex items-center text-[17px] text-[var(--tint)]" aria-label={`${back.label} sayfasına dön`}>
                <ChevronLeft className="size-6" strokeWidth={2.4} />
              </Link>
            )}
            <span className="truncate text-[17px] font-semibold">{titleText ?? title}</span>
          </div>
        </div>

        <header className="space-y-1">
          {back && (
            <Link href={back.href} transitionTypes={["nav-back"]} className="-ml-1.5 inline-flex h-9 items-center text-[17px] text-[var(--tint)] active:opacity-50">
              <ChevronLeft className="size-6" strokeWidth={2.4} />{back.label}
            </Link>
          )}
          {eyebrow && <div className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">{eyebrow}</div>}
          <div className="flex items-end justify-between gap-3">
            <h1 className="large-title min-w-0">{title}</h1>
            {actions && <div className="flex shrink-0 items-center gap-2 pb-1">{actions}</div>}
          </div>
          <div ref={sentinel} className="h-px" aria-hidden />
        </header>

        {children}
      </div>
    </ViewTransition>
  );
}

/** En üstteyken aşağı çekince yenileme (iOS'ta ana ekrana eklenmiş uygulamada tarayıcının kendi yenilemesi yok). */
function PullToRefresh({ onRefresh }: { onRefresh: () => Promise<unknown> }) {
  const [pull, setPull] = useState(0);
  const [busy, setBusy] = useState(false);
  const ref = useRef({ y0: 0, active: false, armed: false, busy: false });
  const run = useRef(onRefresh);
  useEffect(() => { run.current = onRefresh; }, [onRefresh]);

  useEffect(() => {
    const TH = 72;
    const s = ref.current;
    const blocked = () => window.scrollY > 0 || !!document.querySelector('[role="dialog"]') || s.busy;
    const start = (e: TouchEvent) => {
      if (e.touches.length !== 1 || blocked()) return;
      s.y0 = e.touches[0].clientY; s.active = true; s.armed = false;
    };
    const move = (e: TouchEvent) => {
      if (!s.active) return;
      const dy = e.touches[0].clientY - s.y0;
      if (dy <= 0 || window.scrollY > 0) { setPull(0); return; }
      const d = Math.min(120, dy * 0.5);
      if (d >= TH && !s.armed) { s.armed = true; haptic(); }
      if (d < TH) s.armed = false;
      setPull(d);
    };
    const end = async () => {
      if (!s.active) return;
      s.active = false;
      if (s.armed) {
        s.busy = true; setBusy(true); setPull(TH);
        try { await run.current(); } finally { s.busy = false; setBusy(false); setPull(0); }
      } else setPull(0);
    };
    window.addEventListener("touchstart", start, { passive: true });
    window.addEventListener("touchmove", move, { passive: true });
    window.addEventListener("touchend", end);
    window.addEventListener("touchcancel", end);
    return () => {
      window.removeEventListener("touchstart", start);
      window.removeEventListener("touchmove", move);
      window.removeEventListener("touchend", end);
      window.removeEventListener("touchcancel", end);
    };
  }, []);

  if (pull <= 0 && !busy) return null;
  const p = Math.min(1, pull / 72);
  return (
    <div className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+0.5rem)] z-40 flex justify-center" aria-live="polite">
      <span className="grid size-9 place-items-center rounded-full bg-card text-[var(--tint)] shadow-[var(--shadow-soft)]"
        style={{ transform: `translateY(${pull * 0.5}px) scale(${0.6 + p * 0.4})`, opacity: p }}>
        <RotateCw className={`size-4.5 ${busy ? "animate-spin" : ""}`} style={busy ? undefined : { transform: `rotate(${p * 300}deg)` }} aria-label={busy ? "Yenileniyor" : undefined} />
      </span>
    </div>
  );
}
