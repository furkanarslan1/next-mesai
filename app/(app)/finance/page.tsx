"use client";

import { useState } from "react";
import { addMonths, format, parseISO, startOfMonth } from "date-fns";
import { tr } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus, Repeat } from "lucide-react";
import { useMesai } from "@/lib/use-data";
import { useToday } from "@/lib/now";
import { monthKey, useEntriesMap, useFinance, useFinanceMap, useProfile } from "@/lib/store";
import { money } from "@/lib/calc";
import { categoryKey, CATEGORY_META, financeSummary, type CategoryKey } from "@/lib/finance";
import { keyOf, lastMonths } from "@/lib/reports";
import type { FinanceItem } from "@/lib/types";
import { CategoryIcon } from "@/components/mesai/category-icon";
import { BudgetSheet } from "@/components/mesai/budget-sheet";
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
  const [budget, setBudget] = useState<{ cat: CategoryKey | null } | null>(null);
  const userId = useProfile()?.id ?? "";
  const key = monthKey(month);
  const items = useFinance(key);
  const { entries, settings } = useMesai(month);
  const cur = settings.currency;
  const todayStr = format(today, "yyyy-MM-dd");
  // Son 6 ay gelir/gider grafiği için aylar (kayıtlar önbellekten gelir)
  const six = lastMonths(today, 6);
  const sixKeys = six.map(keyOf);
  const finMap = useFinanceMap(sixKeys);
  const entMap = useEntriesMap(sixKeys);
  const defaultDate = key === monthKey(today) ? todayStr : `${key}-01`;

  if (!items) return <div className="glass min-h-[28rem] w-full animate-pulse" aria-busy />;

  const f = financeSummary(items, entries, settings);
  const sorted = [...items].sort((a, b) => Number(b.recurring) - Number(a.recurring) || (b.spent_on ?? "").localeCompare(a.spent_on ?? "") || b.amount - a.amount);
  const maxExpense = f.breakdown[0]?.amount ?? 0;
  const spentByKey = new Map<string, number>();
  f.breakdown.forEach((b) => spentByKey.set(categoryKey(b.category), (spentByKey.get(categoryKey(b.category)) ?? 0) + b.amount));
  const limits = Object.entries(settings.budgets ?? {}).filter(([, v]) => v > 0) as [CategoryKey, number][];
  const trend = six.map((d) => {
    const k = keyOf(d);
    const s = financeSummary(finMap[k] ?? [], entMap[k] ?? [], settings);
    return { d, k, income: s.income, expense: s.expense };
  });
  const trendMax = Math.max(1, ...trend.flatMap((t) => [t.income, t.expense]));

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

      <Card><CardContent className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">Bütçe limitleri</h2>
            <p className="text-xs text-muted-foreground">Kategori başına aylık harcama limiti</p>
          </div>
          <Button size="sm" variant="secondary" disabled={!userId} onClick={() => setBudget({ cat: null })}><Plus className="size-4" />Limit</Button>
        </div>
        {limits.length === 0 && <p className="r-lg bg-muted px-4 py-4 text-center text-sm text-muted-foreground">Limit belirlemedin. Örn. market için aylık ₺5.000.</p>}
        {limits.map(([k, limit]) => {
          const spent = spentByKey.get(k) ?? 0;
          const pct = (spent / limit) * 100;
          const over = pct > 100;
          return (
            <button key={k} type="button" onClick={() => setBudget({ cat: k })} className="r-lg w-full space-y-2 bg-muted px-4 py-3 text-left transition active:scale-[0.98]">
              <div className="flex items-center gap-3 text-sm">
                <CategoryIcon category={k} className="size-7 shrink-0" />
                <span className="flex-1 font-semibold">{CATEGORY_META[k].label}</span>
                <span className={`tabular-nums ${over ? "font-semibold text-destructive" : "text-muted-foreground"}`}>{money(spent, cur)} / {money(limit, cur)}</span>
              </div>
              <div className="h-2 rounded-full bg-background" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100, Math.round(pct))}>
                <div className="h-full rounded-full" style={{ width: `${Math.min(100, Math.max(2, pct))}%`, background: over ? "var(--destructive)" : pct >= 80 ? "#e08a3c" : "var(--teal)" }} />
              </div>
              {over ? <p className="text-xs font-medium text-destructive">Limiti {money(spent - limit, cur)} aştın</p>
                : pct >= 80 ? <p className="text-xs font-medium text-amber-600">Limitin %{Math.round(pct)}&apos;ine geldin, {money(limit - spent, cur)} kaldı</p> : null}
            </button>
          );
        })}
      </CardContent></Card>

      <Card><CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Son 6 ay</h2>
          <span className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1"><span className="size-2 rounded-full" style={{ background: "var(--teal)" }} />Gelir</span>
            <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-[#e0603c]" />Gider</span>
          </span>
        </div>
        <div className="flex h-40 items-end gap-2" role="img" aria-label="Aylara göre gelir ve gider">
          {trend.map((t) => (
            <div key={t.k} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
              <div className="flex h-full w-full items-end justify-center gap-1">
                <div className="w-1/2 max-w-4 rounded-t-lg" style={{ height: `${Math.max(t.income > 0 ? 4 : 1, (t.income / trendMax) * 100)}%`, background: "var(--teal)" }} />
                <div className="w-1/2 max-w-4 rounded-t-lg bg-[#e0603c]" style={{ height: `${Math.max(t.expense > 0 ? 4 : 1, (t.expense / trendMax) * 100)}%` }} />
              </div>
              <span className="text-[11px] capitalize text-muted-foreground">{format(t.d, "LLL", { locale: tr })}</span>
            </div>
          ))}
        </div>
      </CardContent></Card>

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

      {budget && userId && <BudgetSheet userId={userId} settings={settings} initial={budget.cat} onClose={() => setBudget(null)} />}
      {sheet && (
        <FinanceSheet
          key={sheet.item?.id ?? `new-${sheet.kind}`} item={sheet.item} defaultKind={sheet.kind}
          viewKey={key} userId={userId} today={todayStr} defaultDate={defaultDate} onClose={() => setSheet(null)}
        />
      )}
    </div>
  );
}
