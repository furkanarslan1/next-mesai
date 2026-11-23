/** Seviye rozetleri: her seviyenin kendi renk geçişli, çizim bir ikonu var (emoji yerine). */
const TIERS: { from: string; to: string }[] = [
  { from: "#6ee7b7", to: "#059669" }, // Çaylak - filiz
  { from: "#7dd3fc", to: "#0ea5e9" }, // Gayretli - şimşek
  { from: "#fdba74", to: "#ef4444" }, // Çalışkan - alev
  { from: "#e2e8f0", to: "#64748b" }, // Usta - dişli
  { from: "#a5f3fc", to: "#8b5cf6" }, // Uzman - elmas
  { from: "#fde68a", to: "#d97706" }, // Efsane - taç
];

// 8 dişli çark: dış/iç yarıçap arasında gidip gelen çokgen, ortası delik
function gearPath() {
  const pts: string[] = [];
  const teeth = 8, ro = 10, ri = 7.6, half = Math.PI / teeth;
  for (let i = 0; i < teeth; i++) {
    const a = (i * 2 * Math.PI) / teeth - Math.PI / 2;
    const seq: [number, number][] = [[a - half * 0.95, ri], [a - half * 0.5, ro], [a + half * 0.5, ro], [a + half * 0.95, ri]];
    seq.forEach(([ang, r]) => pts.push(`${(12 + r * Math.cos(ang)).toFixed(2)} ${(12 + r * Math.sin(ang)).toFixed(2)}`));
  }
  return `M${pts.join("L")}Z`;
}
const GEAR = gearPath();

export function LevelIcon({ level, className = "size-12" }: { level: number; className?: string }) {
  const idx = Math.min(Math.max(level, 1), TIERS.length) - 1;
  const { from, to } = TIERS[idx];
  const fill = to;
  const shine = "rgba(255,255,255,0.55)";

  const glyphs = [
    // Çaylak: filiz
    <g key="1">
      <path d="M12 21.5V12.5" stroke={to} strokeWidth="2" strokeLinecap="round" />
      <path d="M12 13.5C12 9.2 8.8 6.3 3.8 6.3c0 4.4 2.8 7.2 8.2 7.2z" fill={fill} />
      <path d="M12 11.5c0-3.8 2.7-6.6 8.2-6.6 0 4.2-3 6.6-8.2 6.6z" fill={fill} />
      <path d="M12 13.5c-1.5-2-3.4-3.5-6.2-4.4" stroke={shine} strokeWidth="0.9" strokeLinecap="round" fill="none" />
    </g>,
    // Gayretli: şimşek
    <g key="2">
      <path d="M13.6 1.8 4.8 13.4h6.1L9.8 22.2l9.4-12.4h-6.3z" fill={fill} strokeLinejoin="round" stroke={fill} strokeWidth="0.8" />
      <path d="M13 4.5 8 11.2" stroke={shine} strokeWidth="1" strokeLinecap="round" />
    </g>,
    // Çalışkan: alev
    <g key="3">
      <path d="M12.2 1.8c.7 3.3-1.6 5-3.4 7.1C7.2 10.8 6 12.7 6 15.1a6 6 0 0 0 12 0c0-2.3-.9-4-2.3-5.4-.3 1.5-1 2.4-2 2.8.5-3.8-.5-7.7-1.5-10.7z" fill={fill} />
      <path d="M12 21a2.9 2.9 0 0 1-2.9-2.9c0-1.5 1-2.4 2-3.4.4 1 1.1 1.3 1.7 1.8.6.6 1.1 1.2 1.1 1.6A2.9 2.9 0 0 1 12 21z" fill="rgba(255,255,255,0.7)" />
    </g>,
    // Usta: dişli çark
    <g key="4">
      <path d={`${GEAR}M12 8.2a3.8 3.8 0 1 0 0 7.6 3.8 3.8 0 0 0 0-7.6z`} fill={fill} fillRule="evenodd" />
      <path d="M6.2 7.4A7.4 7.4 0 0 1 12 4.6" stroke={shine} strokeWidth="1" strokeLinecap="round" fill="none" />
    </g>,
    // Uzman: elmas
    <g key="5">
      <path d="M6.2 3h11.6L22 9.2 12 21.5 2 9.2z" fill={fill} strokeLinejoin="round" stroke={fill} strokeWidth="0.6" />
      <path d="M2 9.2h20M9.2 3 7.6 9.2 12 21.5M14.8 3l1.6 6.2L12 21.5" stroke="rgba(255,255,255,0.5)" strokeWidth="0.9" strokeLinejoin="round" fill="none" />
      <path d="M7.4 5.2 6 8" stroke="rgba(255,255,255,0.8)" strokeWidth="1" strokeLinecap="round" />
    </g>,
    // Efsane: taç
    <g key="6">
      <path d="M2.8 7.6 7.6 12 12 4.6l4.4 7.4 4.8-4.4-1.9 11.4H4.7z" fill={fill} strokeLinejoin="round" stroke={fill} strokeWidth="0.8" />
      <path d="M5.2 17.4h13.6" stroke="rgba(0,0,0,0.25)" strokeWidth="1.1" strokeLinecap="round" />
      <circle cx="12" cy="4.2" r="1.3" fill={fill} />
      <circle cx="2.6" cy="7.2" r="1.1" fill={fill} />
      <circle cx="21.4" cy="7.2" r="1.1" fill={fill} />
      <path d="M12 7.4v5" stroke={shine} strokeWidth="1" strokeLinecap="round" />
    </g>,
  ];

  return (
    <span
      className={`relative inline-grid shrink-0 place-items-center r-md ${className}`}
      style={{
        background: `${from}2e`,
        boxShadow: `inset 0 0 0 1px ${from}55`,
      }}
      aria-hidden
    >
      <svg viewBox="0 0 24 24" className="size-[62%]">
        {glyphs[idx]}
      </svg>
    </span>
  );
}
