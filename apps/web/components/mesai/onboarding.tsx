"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import { haptic } from "@/lib/haptics";
import { Button } from "@/components/ui/button";

const KEY = "mesai.onboarded";
const listeners = new Set<() => void>();
const read = () => { try { return window.localStorage.getItem(KEY) === "1"; } catch { return true; } };
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
function finish() {
  try { window.localStorage.setItem(KEY, "1"); } catch { /* yok say */ }
  listeners.forEach((l) => l());
}

/* ---------- İllüstrasyonlar (uygulama paletinde, ikon değil sahne) ---------- */
function RingArt() {
  const r = 62, c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 240 200" className="h-full w-full" aria-hidden>
      <defs><linearGradient id="ob1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="var(--mint)" /><stop offset="1" stopColor="var(--teal)" /></linearGradient></defs>
      <circle cx="120" cy="100" r="92" fill="var(--teal)" opacity="0.08" />
      <circle cx="120" cy="100" r={r} fill="none" stroke="var(--teal)" strokeOpacity="0.2" strokeWidth="18" />
      <circle cx="120" cy="100" r={r} fill="none" stroke="url(#ob1)" strokeWidth="18" strokeLinecap="round" strokeDasharray={`${c * 0.7} ${c}`} transform="rotate(-90 120 100)" className="ob-draw" style={{ "--len": `${c * 0.7}` } as React.CSSProperties} />
      <text x="120" y="108" textAnchor="middle" fontSize="30" fontWeight="700" fill="currentColor">%70</text>
      <g className="ob-float"><rect x="176" y="22" width="56" height="26" rx="13" fill="var(--card)" /><text x="204" y="40" textAnchor="middle" fontSize="12" fontWeight="700" fill="var(--teal)">+₺850</text></g>
    </svg>
  );
}
function TapArt() {
  return (
    <svg viewBox="0 0 240 200" className="h-full w-full" aria-hidden>
      <circle cx="120" cy="100" r="92" fill="var(--teal)" opacity="0.08" />
      {[0, 1, 2, 3, 4, 5, 6].map((i) => [0, 1, 2, 3].map((j) => (
        <rect key={`${i}${j}`} x={42 + i * 23} y={46 + j * 23} width="18" height="18" rx="5"
          fill="var(--teal)" opacity={[3, 9, 10, 16, 17, 22].includes(i + j * 7) ? 0.9 : 0.16} />
      )))}
      <g className="ob-float">
        <rect x="70" y="146" width="100" height="40" rx="20" fill="var(--navy)" />
        <text x="120" y="171" textAnchor="middle" fontSize="15" fontWeight="700" fill="#fff">+2,5 sa</text>
      </g>
    </svg>
  );
}
function ReportArt() {
  const bars = [38, 56, 44, 72, 60, 90];
  return (
    <svg viewBox="0 0 240 200" className="h-full w-full" aria-hidden>
      <circle cx="120" cy="100" r="92" fill="var(--teal)" opacity="0.08" />
      {bars.map((h, i) => (
        <rect key={i} x={48 + i * 25} y={150 - h} width="16" height={h} rx="6" fill="var(--teal)" opacity={i === 5 ? 1 : 0.35} className="ob-bar" style={{ animationDelay: `${i * 70}ms` }} />
      ))}
      <g className="ob-float">
        <rect x="140" y="24" width="88" height="30" rx="15" fill="var(--card)" />
        <circle cx="157" cy="39" r="8" fill="var(--teal)" />
        <path d="M153 39 l3 3 l5 -6" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" />
        <text x="194" y="44" textAnchor="middle" fontSize="12" fontWeight="700" fill="currentColor">Uyumlu</text>
      </g>
    </svg>
  );
}

const SLIDES = [
  { art: RingArt, title: "Hedefini koy", text: "Aylık hedef maaşını ya da mesai saatini gir. Halka doldukça ne kadar kaldığını, günde kaç saat gerektiğini gör." },
  { art: TapArt, title: "Tek dokunuşla mesai", text: "Sık yaptığın mesaileri kısayol yap. Resmi tatilde tatil oranıyla, pazar günü pazar oranıyla otomatik hesaplanır." },
  { art: ReportArt, title: "Bordronu kontrol et", text: "Bordrodaki mesaiyi uygulamanın hesabıyla karşılaştır, aylık çizelgeni Excel ya da PDF olarak İK'ya ver." },
];

/** İlk açılışta bir kez gösterilen 3 sayfalık tanıtım. Kaydırarak ya da düğmeyle ilerlenir. */
export function Onboarding() {
  const done = useSyncExternalStore(subscribe, read, () => true);
  const [i, setI] = useState(0);
  const track = useRef<HTMLDivElement>(null);
  if (done) return null;

  const go = (n: number) => {
    haptic();
    const el = track.current;
    if (el) el.scrollTo({ left: el.clientWidth * n, behavior: "smooth" });
    setI(n);
  };
  const last = i === SLIDES.length - 1;

  return (
    <div role="dialog" aria-modal aria-label="Mesai'ye hoş geldin"
      className="fixed inset-0 z-[60] !m-0 flex flex-col !rounded-none !border-0 bg-background pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-[calc(1rem+env(safe-area-inset-top))]">
      <div className="flex justify-end px-5">
        <button type="button" onClick={finish} className="h-10 px-2 text-[17px] text-[var(--tint)]">Geç</button>
      </div>
      <div ref={track} className="flex flex-1 snap-x snap-mandatory overflow-x-auto [scrollbar-width:none]"
        onScroll={(e) => { const el = e.currentTarget; const n = Math.round(el.scrollLeft / el.clientWidth); if (n !== i) setI(n); }}>
        {SLIDES.map(({ art: Art, title, text }, n) => (
          <section key={title} className="flex w-full shrink-0 snap-center flex-col items-center justify-center gap-8 px-8 text-center" aria-hidden={n !== i}>
            <div className="h-56 w-full max-w-xs text-foreground">{n === i && <Art />}</div>
            <div className="max-w-sm space-y-3">
              <h2 className="large-title">{title}</h2>
              <p className="text-[17px] leading-relaxed text-muted-foreground">{text}</p>
            </div>
          </section>
        ))}
      </div>
      <div className="mx-auto w-full max-w-sm space-y-6 px-6">
        <div className="flex justify-center gap-2" aria-hidden>
          {SLIDES.map((_, n) => <span key={n} className={`h-2 rounded-full transition-all duration-300 ${n === i ? "w-6 bg-[var(--tint)]" : "w-2 bg-muted-foreground/30"}`} />)}
        </div>
        <Button className="h-14 w-full text-[17px] font-semibold" onClick={() => (last ? (haptic("success"), finish()) : go(i + 1))}>
          {last ? "Başlayalım" : "Devam"}
        </Button>
      </div>
    </div>
  );
}
