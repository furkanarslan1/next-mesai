"use client";

import { errorText } from "@/lib/errors";
import { useState } from "react";
import { toast } from "sonner";
import { mutate } from "@/lib/store";
import { CATEGORY_META, EXPENSE_CATEGORIES, type CategoryKey } from "@/lib/finance";
import type { Settings } from "@/lib/types";
import { CategoryIcon } from "@/components/mesai/category-icon";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";

/** Kategori başına aylık gider limiti belirleme/kaldırma paneli. */
export function BudgetSheet({ userId, settings, initial, onClose }: {
  userId: string; settings: Settings; initial: CategoryKey | null; onClose: () => void;
}) {
  const [cat, setCat] = useState<CategoryKey | null>(initial);
  const [amount, setAmount] = useState(initial && settings.budgets[initial] ? String(settings.budgets[initial]) : "");
  const [busy, setBusy] = useState(false);
  const value = parseFloat(amount.replace(",", "."));
  const valid = cat !== null && value > 0;

  async function write(next: Record<string, number>, ok: string) {
    setBusy(true);
    try { await mutate.saveSettings(userId, { budgets: next }); toast.success(ok); onClose(); }
    catch (e) { toast.error(errorText(e, "Kaydedilemedi")); setBusy(false); }
  }
  const save = () => cat && valid && write({ ...settings.budgets, [cat]: value }, "Limit kaydedildi");
  const remove = () => { if (!cat) return; const { [cat]: _drop, ...rest } = settings.budgets; void _drop; return write(rest, "Limit kaldırıldı"); };

  return (
    <Sheet open onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent side="bottom" className="mx-auto max-h-[92dvh] max-w-lg gap-5 overflow-y-auto rounded-t-[2rem] p-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
        <SheetHeader className="p-0">
          <SheetTitle className="text-lg">Aylık limit</SheetTitle>
          <SheetDescription>Bir kategori için aylık harcama limiti belirle; yaklaşınca uyarılırsın.</SheetDescription>
        </SheetHeader>
        <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label="Kategori">
          {EXPENSE_CATEGORIES.filter((k) => k !== "diger").map((k) => (
            <button key={k} type="button" role="radio" aria-checked={cat === k}
              onClick={() => { setCat(k); setAmount(settings.budgets[k] ? String(settings.budgets[k]) : ""); }}
              className={`r-md flex flex-col items-center gap-1.5 px-1 py-2.5 text-xs font-medium transition active:scale-95 ${cat === k ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
              <CategoryIcon category={k} className="size-8" />{CATEGORY_META[k].label}
            </button>
          ))}
        </div>
        <div className="flex items-baseline justify-center gap-2 py-1">
          <span className="text-3xl font-semibold text-muted-foreground">₺</span>
          <input inputMode="decimal" placeholder="0" aria-label="Aylık limit" value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^0-9.,]/g, ""))}
            style={{ width: `${Math.max(amount.length, 1) + 0.6}ch` }}
            className="min-w-[2ch] max-w-full bg-transparent text-center text-5xl font-bold tabular-nums tracking-tight outline-none placeholder:text-muted-foreground/40" />
        </div>
        <Button className="h-14 text-base font-semibold" disabled={!valid || busy} onClick={save}>Limiti kaydet</Button>
        {cat && settings.budgets[cat] > 0 && <Button variant="ghost" className="h-12 text-destructive" disabled={busy} onClick={remove}>Limiti kaldır</Button>}
      </SheetContent>
    </Sheet>
  );
}
