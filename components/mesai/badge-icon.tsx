import type { BadgeKey } from "@/lib/badges";

const COLORS: Record<BadgeKey, string> = {
  first: "#2f9e6e", streak3: "#e0603c", streak7: "#d9a514", goal: "#5b91a3", steady: "#3b9ad9", h50: "#7a6fd6", h100: "#d86a9a",
};
const W = "#ffffff";

/** Başarı rozeti: renkli daire üzerinde beyaz çizim glif. Kazanılmadıysa soluk ve gri. */
export function BadgeIcon({ badge, earned, className = "size-14" }: { badge: BadgeKey; earned: boolean; className?: string }) {
  const c = earned ? COLORS[badge] : "#9aa8b3";
  const glyph: Record<BadgeKey, React.ReactNode> = {
    first: <path d="M12 6.2l1.7 3.6 3.9.5-2.9 2.7.8 3.9L12 15l-3.5 1.9.8-3.9-2.9-2.7 3.9-.5z" fill={W} />,
    streak3: <path d="M12.2 5c.5 2.3-1.1 3.5-2.4 5-1.1 1.3-2 2.6-2 4.3a4.2 4.2 0 0 0 8.4 0c0-1.6-.6-2.8-1.6-3.8-.2 1.1-.7 1.7-1.4 2 .4-2.7-.3-5.4-1-7.5z" fill={W} />,
    streak7: <path d="M13.2 4.5 7.6 12.6h3.9l-.7 6.9 5.6-8.4h-3.8z" fill={W} />,
    goal: (
      <g fill="none" stroke={W} strokeWidth="1.6" strokeLinecap="round">
        <circle cx="12" cy="12" r="6.4" /><circle cx="12" cy="12" r="3.2" /><circle cx="12" cy="12" r="0.6" fill={W} />
      </g>
    ),
    steady: <path d="M7.4 12.4l3 3 6.2-6.6" fill="none" stroke={W} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />,
    h50: <text x="12" y="15.4" textAnchor="middle" fontSize="8.6" fontWeight="800" fill={W} fontFamily="system-ui, sans-serif">50</text>,
    h100: <text x="12" y="15.2" textAnchor="middle" fontSize="7.4" fontWeight="800" fill={W} fontFamily="system-ui, sans-serif">100</text>,
  };
  return (
    <svg viewBox="0 0 24 24" className={`${className} ${earned ? "" : "opacity-60"}`} aria-hidden>
      <circle cx="12" cy="12" r="11" fill={c} />
      <circle cx="12" cy="12" r="9.2" fill="none" stroke={W} strokeOpacity="0.35" strokeWidth="0.8" />
      {glyph[badge]}
    </svg>
  );
}
