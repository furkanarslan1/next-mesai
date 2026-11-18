"use client";

import { useState } from "react";
import { Check, Undo2 } from "lucide-react";

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
      onClick={() => { if (!active) setBurst((n) => n + 1); onPress(); }}
      className={`relative flex h-24 w-36 flex-col items-center justify-center gap-0.5 rounded-3xl border text-lg font-semibold transition active:scale-[0.96] disabled:opacity-60 md:w-40 ${
        active
          ? "border-primary/60 bg-primary/20 text-primary shadow-[0_0_28px_oklch(0.78_0.15_165/25%)]"
          : "border-white/10 bg-primary text-primary-foreground"
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
