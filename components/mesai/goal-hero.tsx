"use client";

import { useOptimistic, useState, useTransition } from "react";
import { toast } from "sonner";
import { Pencil, Target } from "lucide-react";
import { mutate } from "@/lib/store";
import { goalProgress, hrs, money } from "@/lib/calc";
import { projection } from "@/lib/reports";
import { MonthSummary } from "@/components/mesai/month-summary";
import type { Entry, Settings } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// Kıvılcımlar: [yatay uçuş px, dikey uçuş px, başlama gecikmesi sn]
const SPARKS: [number, number, number][] = [
  [34, -30, 0], [52, 6, 0.2], [28, 26, 0.4], [60, -10, 0.6], [40, -42, 0.8], [46, 22, 1.0],
];

export function GoalHero({ userId, settings, entries, monthLabel, today }: {
  userId: string; settings: Settings; entries: Entry[]; monthLabel: string;
  /** Verilirse (içinde bulunulan ay) ay sonu tahmini ve günlük gereken mesai gösterilir */
  today?: Date;
}) {
  const [opt, patchOpt] = useOptimistic(settings, (s, patch: Partial<Settings>) => ({ ...s, ...patch }));
  const [, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Settings["goal_mode"]>(settings.goal_mode);
  const [value, setValue] = useState("");

  const g = goalProgress(entries, opt);
  const pr = today ? projection(entries, opt, today) : null;
  const cur = opt.currency;

  function openEditor() {
    setMode(opt.goal_mode);
    const v = opt.goal_mode === "hours" ? opt.monthly_goal_hours : opt.monthly_goal_amount;
    setValue(v > 0 ? String(v) : "");
    setOpen(true);
  }

  function save() {
    const n = Math.max(0, parseFloat(value) || 0);
    const patch: Partial<Settings> = mode === "hours"
      ? { goal_mode: mode, monthly_goal_hours: n }
      : { goal_mode: mode, monthly_goal_amount: n };
    setOpen(false);
    startTransition(async () => {
      patchOpt(patch);
      try { await mutate.saveSettings(userId, patch); toast.success("Hedef güncellendi"); }
      catch (e) { toast.error(e instanceof Error ? e.message : "Kaydedilemedi"); }
    });
  }

  return (
    <section className="glass min-h-[15.5rem] w-full space-y-5 p-5 sm:p-6" aria-label="Aylık hedef">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">{monthLabel} {g.set ? "hedefi" : "özeti"}</p>
          {g.set && (
            <p className="mt-1 text-lg font-semibold">{g.mode === "hours" ? `${hrs(g.goal)} mesai` : money(g.goal, cur)}</p>
          )}
        </div>
        <Button size="sm" variant="secondary" onClick={openEditor}>
          {g.set ? <Pencil className="size-4" /> : <Target className="size-4" />}
          {g.set ? "Düzenle" : "Hedef belirle"}
        </Button>
      </div>

      {!g.set && (
        <div className="space-y-5">
          <MonthSummary entries={entries} settings={opt} />
          <p className="text-center text-xs text-muted-foreground">Hedef belirlersen burada ilerleme çubuğu görünür.</p>
        </div>
      )}

      {g.set && <div className="space-y-2.5">
        <div className="flex items-baseline justify-between">
          <span className="text-4xl font-bold tabular-nums tracking-tight">%{g.percent.toFixed(0)}</span>
          <span className="text-sm text-muted-foreground tabular-nums">
            {g.mode === "hours" ? `${hrs(g.done)} / ${hrs(g.goal)}` : `${money(g.done, cur)} / ${money(g.goal, cur)}`}
          </span>
        </div>
        <div
          className="goal-track"
          role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(g.percent)}
        >
          {g.percent > 0 && (
            <div className="goal-fill" style={{ width: `${Math.max(g.percent, 2)}%` }}>
              {SPARKS.map(([dx, dy, d], i) => (
                <span key={i} className="goal-spark" style={{ "--dx": `${dx}px`, "--dy": `${dy}px`, "--d": `${d}s` } as React.CSSProperties} aria-hidden />
              ))}
            </div>
          )}
        </div>
      </div>}

      {g.set && (
        <p className="text-sm">
          {g.mode === "hours" ? (
            <>Toplam kazanç: <b className="tabular-nums">{money(g.income, cur)}</b>
              <span className="text-muted-foreground"> · maaş {money(opt.monthly_salary, cur)}{g.deduction > 0 && <> − kesinti {money(g.deduction, cur)}</>} + mesai {money(g.earned, cur)}</span></>
          ) : (
            <>Hedef için toplam mesai: <b className="tabular-nums">{hrs(Math.round(g.hoursNeeded * 10) / 10)}</b>
              <span className="text-muted-foreground"> · maaş {money(opt.monthly_salary, cur)}{g.deduction > 0 && <> − kesinti {money(g.deduction, cur)}</>} + mesai {money(g.earned, cur)}</span></>
          )}
        </p>
      )}

      {g.set && pr && (
        <div className="grid grid-cols-2 gap-2.5">
          <div className="r-md bg-muted px-3 py-3 text-center">
            <p className="text-[11px] text-muted-foreground">Bu tempoyla ay sonu</p>
            <p className="text-lg font-bold tabular-nums leading-tight">{pr.mode === "hours" ? hrs(Math.round(pr.projectedHours * 10) / 10) : money(pr.projectedIncome, cur)}</p>
            <p className={`mt-0.5 text-[11px] font-medium ${pr.onTrack ? "text-emerald-600" : "text-muted-foreground"}`}>{pr.onTrack ? "Hedefin üstünde" : "Hedefin altında"}</p>
          </div>
          <div className="r-md bg-muted px-3 py-3 text-center">
            <p className="text-[11px] text-muted-foreground">Hedef için günlük</p>
            {pr.reached ? (
              <p className="text-lg font-bold leading-tight text-emerald-600">Tamamlandı</p>
            ) : pr.remaining > 0 ? (
              <>
                <p className="text-lg font-bold tabular-nums leading-tight">{hrs(Math.round(pr.perDay * 10) / 10)}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">kalan {pr.remaining} gün</p>
              </>
            ) : (
              <p className="text-lg font-bold leading-tight text-muted-foreground">Ay bitti</p>
            )}
          </div>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Aylık hedef</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant={mode === "amount" ? "default" : "secondary"} onClick={() => { setMode("amount"); setValue(opt.monthly_goal_amount > 0 ? String(opt.monthly_goal_amount) : ""); }}>Hedef maaş</Button>
            <Button type="button" variant={mode === "hours" ? "default" : "secondary"} onClick={() => { setMode("hours"); setValue(opt.monthly_goal_hours > 0 ? String(opt.monthly_goal_hours) : ""); }}>Mesai saati</Button>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="goal-v">{mode === "hours" ? "Bu ay kaç saat mesai yapmak istiyorsun?" : "Bu ay toplam ne kadar kazanmak istiyorsun? (maaş + mesai)"}</Label>
            <Input id="goal-v" type="number" inputMode="decimal" min="0" step={mode === "hours" ? "0.5" : "100"} value={value} onChange={(e) => setValue(e.target.value)} placeholder={mode === "hours" ? "Örn. 40" : "Örn. 40000"} />
          </div>
          <Button onClick={save}>Kaydet</Button>
        </DialogContent>
      </Dialog>
    </section>
  );
}
