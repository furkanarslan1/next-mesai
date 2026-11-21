"use client";

import { useState } from "react";
import { addMonths, format, parseISO, startOfMonth } from "date-fns";
import { tr } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus, Repeat } from "lucide-react";
import { useMesai } from "@/lib/use-data";
import { useToday } from "@/lib/now";
import { monthKey, useFinance, useProfile } from "@/lib/store";
import { money } from "@/lib/calc";
import { categoryKey, CATEGORY_META, financeSummary } from "@/lib/finance";
import type { FinanceItem } from "@/lib/types";
import { CategoryIcon } from "@/components/mesai/category-icon";
import { FinanceSheet } from "@/components/mesai/finance-sheet";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type SheetState = { item: FinanceItem | null; kind: FinanceItem["kind"] } | null;

export default function FinancePage() {
  const today = useToday();
  if (!today) return <div className="glass min-h-[28rem] w-full animate-pulse" aria-busy />;
  return <FinanceView today={today} />;
}

function FinanceView({ today }: { today: Date }) {
  const [month, setMonth] = useState(startOfMonth(today));
  const [sheet, setSheet] = useState<SheetState>(null);
  const userId = useProfile()?.id ?? "";
  const key = monthKey(month);
  const items = useFinance(key);
  const { entries, settings } = useMesai(month);
  const cur = settings.currency;
  const todayStr = format(today, "yyyy-MM-dd");
  const defaultDate = key === monthKey(today) ? todayStr : `${key}-01`;

  if (!items) return <div className="glass min-h-[28rem] w-full animate-pulse" aria-busy />;

  const f = financeSummary(items, entries, settings);
  const sorted = [...items].sort((a, b) => Number(b.recurring) - Number(a.recurring) || (b.spent_on ?? "").localeCompare(a.spent_on ?? "") || b.amount - a.amount);
  const maxExpense = f.breakdown[0]?.amount ?? 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <Button size="icon" variant="secondary" aria-label="Önceki ay" onClick={() => setMonth(addMonths(month, -1))}><ChevronLeft /></Button>
        <h1 className="text-xl font-bold capitalize">{format(month, "MMMM yyyy", { locale: tr })}</h1>
        <Button size="icon" variant="secondary" aria-label="Sonraki ay" onClick={() => setMonth(addMonths(month, 1))}><ChevronRight /></Button>
      </div>

      <section className="glass space-y-5 p-5 sm:p-6" aria-label="Aylık özet">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Ay sonu kalan</p>
          <p className={`mt-1 text-5xl font-bold tabular-nums tracking-tight ${f.left < 0 ? "text-destructive" : ""}`}>{money(f.left, cur)}</p>
          <p className="mt-2 text-xs text-muted-foreground tabular-nums">
            Maaş {money(f.salary, cur)}{f.deduction > 0 && <> (kesinti {money(f.deduction, cur)} düşüldü)</>} + mesai {money(f.overtime, cur)}{f.extra > 0 && <> + ek gelir {money(f.extra, cur)}</>} − gider {money(f.expense, cur)}
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2.5">
          {[
            { label: "Gelir", value: money(f.income, cur) },
            { label: "Gider", value: money(f.expense, cur) },
            { label: "Tasarruf", value: `%${Math.round(f.savingRate)}` },
          ].map((t) => (
            <div key={t.label} className="r-md bg-muted px-2 py-3 text-center">
              <p className="text-base font-bold tabular-nums leading-tight sm:text-lg">{t.value}</p>
              <p className="mt-1 text-[11px] leading-tight text-muted-foreground">{t.label}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3">
        <Button className="h-14 text-base font-semibold" disabled={!userId} onClick={() => setSheet({ item: null, kind: "expense" })}><Plus className="size-5" />Gider ekle</Button>
        <Button variant="secondary" className="h-14 text-base font-semibold" disabled={!userId} onClick={() => setSheet({ item: null, kind: "income" })}><Plus className="size-5" />Gelir ekle</Button>
      </div>

      {f.breakdown.length > 0 && (
        <Card><CardContent className="space-y-4">
          <h2 className="font-semibold">Giderler nereye gidiyor?</h2>
          <div className="space-y-3.5">
            {f.breakdown.map((b) => (
              <div key={b.category} className="space-y-1.5">
                <div className="flex items-center gap-3 text-sm">
                  <CategoryIcon category={b.category} className="size-7 shrink-0" />
                  <span className="flex-1 font-medium">{b.category}</span>
                  <span className="tabular-nums text-muted-foreground">%{Math.round((b.amount / f.expense) * 100)}</span>
                  <span className="w-24 text-right font-semibold tabular-nums">{money(b.amount, cur)}</span>
                </div>
                <div className="h-2 rounded-full bg-muted" role="presentation">
                  <div className="h-full rounded-full" style={{ width: `${Math.max(3, (b.amount / maxExpense) * 100)}%`, background: CATEGORY_META[categoryKey(b.category)].color }} />
                </div>
              </div>
            ))}
          </div>
        </CardContent></Card>
      )}

      <section className="space-y-2" aria-label="Kayıtlar">
        <h2 className="font-semibold">Kayıtlar</h2>
        {sorted.length === 0 && (
          <p className="glass r-lg px-4 py-6 text-center text-sm text-muted-foreground">Bu ay için kayıt yok. Maaşın ve mesain otomatik hesaplanır; gider ve ek gelirlerini yukarıdan ekle.</p>
        )}
        {sorted.map((i) => (
          <button key={i.id} type="button" onClick={() => setSheet({ item: i, kind: i.kind })}
            className="glass r-lg flex w-full items-center gap-3.5 px-4 py-3 text-left transition active:scale-[0.98]">
            <CategoryIcon category={i.category} className="size-9 shrink-0" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">{i.category}</span>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                {i.recurring ? <><Repeat className="size-3" />Her ay</> : i.spent_on ? format(parseISO(i.spent_on), "d MMMM", { locale: tr }) : "Ay geneli"}
                {categoryKey(i.category) === "ekgelir" && /^ma[aâ]ş/i.test(i.category) && " · maaş zaten otomatik sayılıyor"}
              </span>
            </span>
            <b className={`tabular-nums ${i.kind === "income" ? "text-emerald-600" : ""}`}>{i.kind === "income" ? "+" : "−"}{money(i.amount, cur)}</b>
          </button>
        ))}
      </section>

      {sheet && (
        <FinanceSheet
          key={sheet.item?.id ?? `new-${sheet.kind}`} item={sheet.item} defaultKind={sheet.kind}
          viewKey={key} userId={userId} today={todayStr} defaultDate={defaultDate} onClose={() => setSheet(null)}
        />
      )}
    </div>
  );
}
