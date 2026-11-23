import { CATEGORY_META, categoryKey, type CategoryKey } from "@mesai/core/finance";

const W = "#ffffff";

/** Gelir/gider kategorileri için düz renkli, çizim ikonlar (arka plansız). */
export function CategoryIcon({ category, className = "size-8" }: { category: string | CategoryKey; className?: string }) {
  const key: CategoryKey = category in CATEGORY_META ? (category as CategoryKey) : categoryKey(category);
  const c = CATEGORY_META[key].color;
  const glyph: Record<CategoryKey, React.ReactNode> = {
    kira: <path d="M12 2.8 1.8 11.4h2.9V21h5.2v-6.2h4.2V21h5.2v-9.6h2.9z" fill={c} strokeLinejoin="round" stroke={c} strokeWidth="0.6" />,
    market: (
      <g>
        <path d="M8 9.5 11 4M16 9.5 13 4" stroke={c} strokeWidth="1.9" strokeLinecap="round" />
        <path d="M3 9h18l-1.8 10.2a2 2 0 0 1-2 1.8H6.8a2 2 0 0 1-2-1.8z" fill={c} />
        <path d="M9 12.6v5M12 12.6v5M15 12.6v5" stroke={W} strokeOpacity="0.75" strokeWidth="1.3" strokeLinecap="round" />
      </g>
    ),
    yakit: (
      <g>
        <rect x="4" y="3" width="10.4" height="18" rx="2.4" fill={c} />
        <rect x="6.4" y="5.6" width="5.6" height="4.6" rx="1" fill={W} fillOpacity="0.85" />
        <path d="M14.4 9.2h1.9a1.8 1.8 0 0 1 1.8 1.8v5.2a1.3 1.3 0 0 0 2.6 0V8.6L18.2 6" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <path d="M2.6 21.2h13.6" stroke={c} strokeWidth="1.6" strokeLinecap="round" />
      </g>
    ),
    elektrik: <path d="M13.6 1.8 4.8 13.4h6.1L9.8 22.2l9.4-12.4h-6.3z" fill={c} strokeLinejoin="round" stroke={c} strokeWidth="0.8" />,
    su: (
      <g>
        <path d="M12 2.5C8.6 7 5.5 10.2 5.5 14.2a6.5 6.5 0 0 0 13 0C18.5 10.2 15.4 7 12 2.5z" fill={c} />
        <path d="M8.8 14.6a3.4 3.4 0 0 0 2.4 3.1" stroke={W} strokeOpacity="0.7" strokeWidth="1.2" strokeLinecap="round" fill="none" />
      </g>
    ),
    dogalgaz: (
      <g>
        <path d="M12.2 1.8c.7 3.3-1.6 5-3.4 7.1C7.2 10.8 6 12.7 6 15.1a6 6 0 0 0 12 0c0-2.3-.9-4-2.3-5.4-.3 1.5-1 2.4-2 2.8.5-3.8-.5-7.7-1.5-10.7z" fill={c} />
        <path d="M12 21a2.9 2.9 0 0 1-2.9-2.9c0-1.5 1-2.4 2-3.4.4 1 1.1 1.3 1.7 1.8.6.6 1.1 1.2 1.1 1.6A2.9 2.9 0 0 1 12 21z" fill={W} fillOpacity="0.75" />
      </g>
    ),
    internet: (
      <g fill="none" stroke={c} strokeWidth="2.1" strokeLinecap="round">
        <path d="M2.5 9a14 14 0 0 1 19 0" /><path d="M5.6 12.4a9.6 9.6 0 0 1 12.8 0" /><path d="M8.9 15.7a5 5 0 0 1 6.2 0" />
        <circle cx="12" cy="19.2" r="1.5" fill={c} stroke="none" />
      </g>
    ),
    telefon: (
      <g>
        <rect x="6.6" y="2.4" width="10.8" height="19.2" rx="3" fill={c} />
        <rect x="8.8" y="5" width="6.4" height="11" rx="1" fill={W} fillOpacity="0.85" />
        <circle cx="12" cy="18.9" r="0.9" fill={W} />
      </g>
    ),
    kredi: (
      <g>
        <rect x="2.4" y="4.8" width="19.2" height="14.4" rx="3.2" fill={c} />
        <rect x="2.4" y="8.8" width="19.2" height="2.8" fill={W} fillOpacity="0.85" />
        <rect x="5.4" y="14.4" width="5.2" height="1.9" rx="0.95" fill={W} fillOpacity="0.85" />
      </g>
    ),
    diger: (
      <g fill={c}><circle cx="5.5" cy="12" r="2.3" /><circle cx="12" cy="12" r="2.3" /><circle cx="18.5" cy="12" r="2.3" /></g>
    ),
    ekgelir: (
      <g>
        <circle cx="12" cy="12" r="9.6" fill={c} />
        <path d="M12 17V8M8 11.8 12 8l4 3.8" stroke={W} strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </g>
    ),
    prim: <path d="M12 2.8l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 16.8l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" fill={c} strokeLinejoin="round" stroke={c} strokeWidth="1" />,
    harclik: (
      <g>
        <rect x="2.4" y="6" width="19.2" height="13.6" rx="3.4" fill={c} />
        <path d="M2.6 10.2h18.8" stroke={W} strokeOpacity="0.6" strokeWidth="1.2" />
        <circle cx="16.8" cy="14.2" r="1.7" fill={W} />
      </g>
    ),
  };
  return <svg viewBox="0 0 24 24" className={className} aria-hidden>{glyph[key]}</svg>;
}
