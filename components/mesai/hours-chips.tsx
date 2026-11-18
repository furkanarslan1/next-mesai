"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const fmtHours = (h: number) => `${Number.isInteger(h) ? h : +h.toFixed(2)} saat`;

/** Sık yapılan mesai saatlerini (2.5, 6.5 gibi) ekleyip çıkarmak için küçük düzenleyici. */
export function HoursChips({ items, onAdd, onRemove, max = 8, loading = false }: {
  items: { key: string; hours: number }[];
  onAdd: (hours: number) => void | Promise<void>;
  onRemove: (key: string) => void | Promise<void>;
  max?: number;
  loading?: boolean;
}) {
  const [v, setV] = useState("");
  const h = parseFloat(v.replace(",", "."));
  const valid = h > 0 && h <= 24 && !items.some((i) => i.hours === h) && items.length < max;

  function add() {
    if (!valid) return;
    onAdd(h);
    setV("");
  }

  return (
    <div className="space-y-3">
      <div className="snap-row !mx-0 !px-0 !pb-1 md:!flex-nowrap md:!overflow-x-auto">
        {loading && <div className="glass h-8 w-32 animate-pulse" aria-busy />}
        {!loading && items.length === 0 && <p className="text-sm text-muted-foreground">Henüz kısayol yok.</p>}
        {items.map((i) => (
          <span key={i.key} className="glass inline-flex items-center gap-1 whitespace-nowrap py-1 pr-1 pl-3 text-sm font-medium">
            {fmtHours(i.hours)}
            <button type="button" aria-label={`${fmtHours(i.hours)} kısayolunu sil`} onClick={() => onRemove(i.key)}
              className="grid size-6 place-items-center rounded-full text-muted-foreground hover:text-destructive">
              <X className="size-3.5" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          type="number" inputMode="decimal" min="0.25" max="24" step="0.25" placeholder="Örn. 2.5"
          value={v} onChange={(e) => setV(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
        />
        <Button type="button" variant="secondary" onClick={add} disabled={!valid} aria-label="Kısayol ekle">
          <Plus className="size-4" />Ekle
        </Button>
      </div>
      {items.length >= max && <p className="text-xs text-muted-foreground">En fazla {max} kısayol ekleyebilirsin.</p>}
    </div>
  );
}
