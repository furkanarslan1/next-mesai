import { goalProgress, hrs, money, monthSummary } from "@/lib/calc";
import type { Entry, Settings } from "@/lib/types";

/** Aylık özet: toplam kazanç (maaş − kesinti + mesai) ve mesai saati / günü / kazancı. Hedef kartında (hedef yokken) ve hedef varken günün durum kartlarının altında kullanılır. */
export function MonthSummary({ entries, settings }: { entries: Entry[]; settings: Settings }) {
  const g = goalProgress(entries, settings);
  const sum = monthSummary(entries, settings);
  const cur = settings.currency;
  const workDays = new Set(entries.filter((e) => (e.type === "overtime" || e.type === "holiday") && Number(e.hours) > 0).map((e) => e.work_date)).size;
  return (
    <div className="space-y-5">
      <div className="text-center">
        <p className="text-sm text-muted-foreground">Bu ay toplam kazanç</p>
        <p className="mt-1 text-5xl font-bold tabular-nums tracking-tight">{money(g.income, cur)}</p>
        <p className="mt-2 text-xs text-muted-foreground tabular-nums">
          Maaş {money(settings.monthly_salary, cur)}{g.deduction > 0 && <> − kesinti {money(g.deduction, cur)}</>} + mesai {money(g.earned, cur)}
        </p>
      </div>
      <div className="grid grid-cols-3 gap-2.5">
        {[
          { label: "Mesai saati", value: hrs(sum.hours) },
          { label: "Mesai günü", value: `${workDays} gün` },
          { label: "Mesai kazancı", value: money(sum.earned, cur) },
        ].map((t) => (
          <div key={t.label} className="r-md bg-muted px-2 py-3 text-center">
            <p className="text-lg font-bold tabular-nums leading-tight">{t.value}</p>
            <p className="mt-1 text-[11px] leading-tight text-muted-foreground">{t.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
