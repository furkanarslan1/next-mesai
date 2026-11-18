"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Tek dokunuşla mesai ekleyen kısayol: basınca küçük bir "+X sa" animasyonu oynar. */
export function ShortcutButton({ label, hint, hoursText, onPress }: {
  label: string; hint: string; hoursText: string; onPress: () => void;
}) {
  const [burst, setBurst] = useState(0);
  return (
    <Button
      key={`b${burst}`}
      className={`relative h-20 flex-col overflow-visible text-lg ${burst ? "shortcut-pressed" : ""}`}
      onClick={() => { setBurst((n) => n + 1); onPress(); }}
    >
      {burst > 0 && (
        <>
          <span key={`r${burst}`} className="shortcut-ring" aria-hidden />
          <span key={`f${burst}`} className="shortcut-float flex items-center gap-1 rounded-full bg-background px-2.5 py-0.5 text-base text-primary ring-1 ring-primary/60" aria-hidden>
            <Check className="size-4" />+{hoursText}
          </span>
        </>
      )}
      {label}
      <span className="text-xs font-normal opacity-80">{hint}</span>
    </Button>
  );
}
