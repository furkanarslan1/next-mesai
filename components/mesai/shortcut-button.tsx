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
      className={`relative flex h-24 w-full flex-col items-center justify-center gap-0.5 r-lg border text-lg font-semibold transition active:scale-[0.96] disabled:opacity-100 disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none ${
        active
          ? "border-primary/50 bg-primary/10 text-primary shadow-[0_0_28px_color-mix(in_oklch,var(--primary)_28%,transparent)]"
          : "border-transparent bg-primary text-primary-foreground shadow-[0_10px_24px_color-mix(in_oklch,var(--primary)_35%,transparent)]"
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
