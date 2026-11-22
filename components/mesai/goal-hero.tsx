"use client";

import { parseNum } from "@/lib/num";
import { errorText } from "@/lib/errors";
import { useOptimistic, useState, useTransition } from "react";
import { toast } from "sonner";
import { Pencil, Target } from "lucide-react";
import { mutate } from "@/lib/store";
import { goalProgress, hrs, money } from "@/lib/calc";
import { projection } from "@/lib/reports";
import { MonthSummary } from "@/components/mesai/month-summary";
import { GoalRing } from "@/components/mesai/goal-ring";
import { AnimatedNumber } from "@/components/mesai/animated-number";
import { Segmented } from "@/components/mesai/ios-form";
import { haptic } from "@/lib/haptics";
import type { Entry, Settings } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";


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
    const n = Math.max(0, parseNum(value) || 0);
    const patch: Partial<Settings> = mode === "hours"
      ? { goal_mode: mode, monthly_goal_hours: n }
      : { goal_mode: mode, monthly_goal_amount: n };
    setOpen(false);
    startTransition(async () => {
      patchOpt(patch);
      try { await mutate.saveSettings(userId, patch); haptic("success"); toast.success("Hedef güncellendi"); }
      catch (e) { toast.error(errorText(e, "Kaydedilemedi")); }
    });
  }

  const remainingMoney = Math.max(0, g.goal - g.income);
  const remainingHours = Math.max(0, g.goal - g.done);
  const fmtMoney = (n: number) => money(n, cur);
  const fmtHrs = (n: number) => hrs(Math.round(n * 10) / 10);

  return (
    <section className="glass min-h-[15.5rem] w-full space-y-5 p-5 sm:p-6" aria-label="Aylık hedef">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">{monthLabel} {g.set ? "hedefi" : "özeti"}</p>
          {g.set && <p className="mt-0.5 text-[17px] font-semibold">{g.mode === "hours" ? `${hrs(g.goal)} mesai` : money(g.goal, cur)}</p>}
        </div>
        <Button size="sm" variant="secondary" onClick={openEditor}>
          {g.set ? <Pencil className="size-4" /> : <Target className="size-4" />}
          {g.set ? "Düzenle" : "Hedef belirle"}
        </Button>
      </div>

      {!g.set && (
        <div className="space-y-5">
          <MonthSummary entries={entries} settings={opt} />
          <p className="text-center text-xs text-muted-foreground">Hedef belirlersen burada ilerleme halkası görünür.</p>
        </div>
      )}

      {g.set && (
        <div className="flex items-center gap-5 sm:gap-7">
          <GoalRing percent={g.percent} size={156}>
            <div>
              <AnimatedNumber value={g.percent} format={(n) => `%${Math.round(n)}`} className="block text-[2.1rem] font-bold leading-none tracking-tight" />
              <span className="mt-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{g.percent >= 100 ? "Tamam" : "Hedef"}</span>
            </div>
          </GoalRing>
          <dl className="min-w-0 flex-1 space-y-3">
            {g.mode === "hours" ? (
              <>
                <Stat label="Yapılan mesai"><AnimatedNumber value={g.done} format={fmtHrs} /></Stat>
                <Stat label="Kalan">{remainingHours > 0 ? <AnimatedNumber value={remainingHours} format={fmtHrs} /> : <span className="text-[var(--tint)]">Tamamlandı</span>}</Stat>
                <Stat label="Toplam kazanç" small><AnimatedNumber value={g.income} format={fmtMoney} /></Stat>
              </>
            ) : (
              <>
                <Stat label="Bu ay kazanç"><AnimatedNumber value={g.income} format={fmtMoney} /></Stat>
                <Stat label="Kalan">{remainingMoney > 0 ? <AnimatedNumber value={remainingMoney} format={fmtMoney} /> : <span className="text-[var(--tint)]">Tamamlandı</span>}</Stat>
                <Stat label="Gereken toplam mesai" small><AnimatedNumber value={g.hoursNeeded} format={fmtHrs} /></Stat>
              </>
            )}
          </dl>
        </div>
      )}

      {g.set && (
        <p className="text-xs text-muted-foreground tabular-nums">
          Maaş {money(opt.monthly_salary, cur)}{g.deduction > 0 && <> − kesinti {money(g.deduction, cur)}</>} + mesai {money(g.earned, cur)}
        </p>
      )}

      {g.set && pr && (
        <div className="grid grid-cols-2 gap-2.5">
          <div className="r-md bg-muted px-3 py-3 text-center">
            <p className="text-[11px] text-muted-foreground">Bu tempoyla ay sonu</p>
            <p className="text-lg font-bold tabular-nums leading-tight">{pr.mode === "hours" ? hrs(Math.round(pr.projectedHours * 10) / 10) : money(pr.projectedIncome, cur)}</p>
            <p className={`mt-0.5 text-[11px] font-medium ${pr.onTrack ? "text-[var(--tint)]" : "text-muted-foreground"}`}>{pr.onTrack ? "Hedefin üstünde" : "Hedefin altında"}</p>
          </div>
          <div className="r-md bg-muted px-3 py-3 text-center">
            <p className="text-[11px] text-muted-foreground">Hedef için günlük</p>
            {pr.reached ? (
              <p className="text-lg font-bold leading-tight text-[var(--tint)]">Tamamlandı</p>
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
          <Segmented label="Hedef türü" value={mode}
            onChange={(m) => { setMode(m); const v = m === "hours" ? opt.monthly_goal_hours : opt.monthly_goal_amount; setValue(v > 0 ? String(v) : ""); }}
            options={[{ value: "amount", label: "Hedef maaş" }, { value: "hours", label: "Mesai saati" }]} />
          <div className="space-y-1.5">
            <Label htmlFor="goal-v">{mode === "hours" ? "Bu ay kaç saat mesai yapmak istiyorsun?" : "Bu ay toplam ne kadar kazanmak istiyorsun? (maaş + mesai)"}</Label>
            <Input id="goal-v" inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value.replace(/[^0-9.,]/g, ""))} placeholder={mode === "hours" ? "Örn. 40" : "Örn. 40000"} />
          </div>
          <Button className="h-12 text-base font-semibold" onClick={save}>Kaydet</Button>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function Stat({ label, small, children }: { label: string; small?: boolean; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[12px] text-muted-foreground">{label}</dt>
      <dd className={`truncate font-bold tabular-nums leading-tight ${small ? "text-[15px]" : "text-[20px] tracking-tight"}`}>{children}</dd>
    </div>
  );
}
