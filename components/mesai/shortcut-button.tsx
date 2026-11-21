"use client";

import { useState } from "react";
import { Check, Undo2 } from "lucide-react";
import { realTap } from "@/lib/tap";

/**
 * Tek dokunuşla mesai ekleyen kısayol. Eklenince dolu görünür (tik + "Geri al");
 * tekrar dokununca kayıt geri alınır. Ekleme anında küçük bir "+X sa" animasyonu oynar.
 */
export function ShortcutButton({ label, hint, hoursText, active, disabled, onPress }: {
  label: string; hint: string; hoursText: string; active: boolean; disabled?: boolean; onPress: () => void;
}) {
  const [burst, setBurst] = useState(0);
  return (
    <button
      key={`b${burst}`} type="button" disabled={disabled} aria-pressed={active}
      {...realTap(() => { if (!active) setBurst((n) => n + 1); onPress(); })}
      className={`relative flex h-24 w-full flex-col items-center justify-center gap-0.5 leaf border text-lg font-semibold transition active:scale-[0.96] disabled:opacity-60 ${
        active
          ? "border-primary/50 bg-primary/10 text-primary shadow-[0_0_28px_oklch(0.5_0.2_262/25%)]"
          : "border-white/20 bg-gradient-to-br from-[oklch(0.42_0.15_264)] to-[oklch(0.3_0.11_264)] text-primary-foreground shadow-[0_10px_24px_oklch(0.3_0.12_264/30%)]"
      } ${burst ? "shortcut-pressed" : ""}`}
    >
      {burst > 0 && active && (
        <>
          <span key={`r${burst}`} className="shortcut-ring" aria-hidden />
          <span key={`f${burst}`} className="shortcut-float flex items-center gap-1 rounded-full bg-background px-2.5 py-0.5 text-base text-primary ring-1 ring-primary/60" aria-hidden>
            <Check className="size-4" />+{hoursText}
          </span>
        </>
      )}
      <span className="flex items-center gap-1.5">{active && <Check className="size-5" />}{label}</span>
      <span className="flex items-center gap-1 text-xs font-normal opacity-80">
        {active ? <><Undo2 className="size-3" />Geri al</> : hint}
      </span>
    </button>
  );
}
