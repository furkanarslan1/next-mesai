import { useId } from "react";
import type { EntryType } from "@/lib/types";

/** "Bugün işe gitmedin mi?" kartlarının ikonları: renk geçişli, çizim glifler. */
const TONES: Record<string, { from: string; to: string }> = {
  paid_leave: { from: "#7dd3fc", to: "#0369a1" },
  unpaid_leave: { from: "#fdba74", to: "#c2410c" },
  sick: { from: "#f9a8d4", to: "#be185d" },
  absent: { from: "#fda4af", to: "#be123c" },
  holiday: { from: "#fde68a", to: "#b45309" },
};

const SHINE = "rgba(255,255,255,0.6)";

export function StatusIcon({ type, className = "size-9" }: { type: EntryType; className?: string }) {
  const gid = useId().replace(/:/g, "");
  const tone = TONES[type] ?? TONES.paid_leave;
  const fill = `url(#${gid})`;

  const glyph: Record<string, React.ReactNode> = {
    // Ücretli izin: plaj şemsiyesi
    paid_leave: (
      <g>
        <path d="M12 2.8C6.6 2.8 2.9 6.8 2.6 12h18.8c-.3-5.2-4-9.2-9.4-9.2z" fill={fill} />
        <path d="M2.6 12c1.2-1.3 2.6-1.3 3.8 0 1.2-1.3 2.6-1.3 3.8 0 1.2-1.3 2.6-1.3 3.8 0 1.2-1.3 2.6-1.3 3.8 0 .4-.5.9-.8 1.4-.9" stroke="rgba(255,255,255,0.35)" strokeWidth="1" fill="none" strokeLinecap="round" />
        <path d="M12 12.2v6.6a2.3 2.3 0 0 0 4.6 0" stroke={tone.to} strokeWidth="1.9" strokeLinecap="round" fill="none" />
        <path d="M5.4 8.4A7.4 7.4 0 0 1 9.6 5" stroke={SHINE} strokeWidth="1.1" strokeLinecap="round" fill="none" />
      </g>
    ),
    // Ücretsiz izin: takvim + eksi
    unpaid_leave: (
      <g>
        <rect x="3" y="4.5" width="18" height="16.5" rx="4.2" fill={fill} />
        <rect x="7.4" y="2.4" width="2.2" height="4.4" rx="1.1" fill={tone.to} />
        <rect x="14.4" y="2.4" width="2.2" height="4.4" rx="1.1" fill={tone.to} />
        <path d="M3.6 9.6h16.8" stroke="rgba(255,255,255,0.4)" strokeWidth="1.1" />
        <path d="M8.6 15.4h6.8" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
      </g>
    ),
    // Raporlu: tıbbi artı
    sick: (
      <g>
        <path d="M9.5 3h5A1.5 1.5 0 0 1 16 4.5V8h3.5A1.5 1.5 0 0 1 21 9.5v5a1.5 1.5 0 0 1-1.5 1.5H16v3.5a1.5 1.5 0 0 1-1.5 1.5h-5A1.5 1.5 0 0 1 8 19.5V16H4.5A1.5 1.5 0 0 1 3 14.5v-5A1.5 1.5 0 0 1 4.5 8H8V4.5A1.5 1.5 0 0 1 9.5 3z" fill={fill} />
        <path d="M10.2 5.2h3.6" stroke={SHINE} strokeWidth="1.2" strokeLinecap="round" />
        <path d="M5.2 12h2.6l1.2-2.2 2 4.4 1.3-2.2h3.1" stroke="rgba(255,255,255,0.85)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </g>
    ),
    // Gelmedi: kişi + çarpı rozeti
    absent: (
      <g>
        <circle cx="10" cy="7.6" r="3.7" fill={fill} />
        <path d="M2.8 20.6c0-4.1 3.1-6.6 7.2-6.6s7.2 2.5 7.2 6.6z" fill={fill} />
        <circle cx="18" cy="17" r="4.6" fill={tone.to} stroke="#fff" strokeWidth="1.2" />
        <path d="M16.2 15.2l3.6 3.6M19.8 15.2l-3.6 3.6" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
      </g>
    ),
    // Resmi tatil: bayrak
    holiday: (
      <g>
        <path d="M5 21.5V3" stroke={tone.to} strokeWidth="2" strokeLinecap="round" />
        <path d="M6 4.6c3-1.8 5.4 1.8 8.5 0 1.7-1 3.2-.9 4.5-.2v9c-1.3-.7-2.8-.8-4.5.2-3.1 1.8-5.5-1.8-8.5 0z" fill={fill} />
        <path d="M7.6 6.4c1.2-.4 2.2 0 3.2.5" stroke={SHINE} strokeWidth="1.1" strokeLinecap="round" fill="none" />
      </g>
    ),
  };

  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <defs>
        <linearGradient id={gid} x1="0.15" y1="0" x2="0.85" y2="1">
          <stop offset="0" stopColor={tone.from} />
          <stop offset="1" stopColor={tone.to} />
        </linearGradient>
      </defs>
      {glyph[type]}
    </svg>
  );
}
