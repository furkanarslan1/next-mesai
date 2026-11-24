import { money } from "@mesai/core/calc";
import { errorText } from "@mesai/core/errors";
import { CATEGORY_META, categoryKey, financeSummary, type CategoryKey } from "@mesai/core/finance";
import { keyOf, lastMonths } from "@mesai/core/reports";
import { DEFAULT_SETTINGS } from "@mesai/core/settings";
import type { FinanceItem } from "@mesai/core/types";
import { addMonths, format, parseISO, startOfMonth } from "date-fns";
import { tr } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus, Repeat } from "lucide-react-native";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { CategoryIcon } from "@/components/category-icon";
import { AnimatedNumber } from "@/components/animated-number";
import { BudgetSheet, FinanceSheet } from "@/components/finance-sheet";
import { SwipeRow } from "@/components/swipe-row";
import { toast } from "@/components/toast";
import { useToday } from "@/lib/now";
import { Button, Card, IconButton, LargeTitle, Screen, Stat, Txt } from "@/components/ui";
import { monthKey, mutate, useEntriesMap, useFinance, useFinanceMap, useMonthEntries, useProfile, useSettings } from "@/lib/store";
import { radius, useColors, useIsDark } from "@/theme";

type SheetState = { item: FinanceItem | null; kind: FinanceItem["kind"] } | null;
const EXPENSE_BAR = "#e0603c";
/** Kart içi başlık (web: kart yazısı 14px, h2 font-semibold) ve kart dışı bölüm başlığı (16px) */
const h2 = { fontSize: 14, lineHeight: 20, fontWeight: "600" as const };
const h2Out = { fontSize: 16, lineHeight: 24, fontWeight: "600" as const };

/** Hesap (gelir-gider): web'deki app/(app)/finance/page.tsx'in birebir aynısı. */
export default function FinanceScreen() {
  const c = useColors();
  const dark = useIsDark();
  const today = useToday();
  const todayStr = format(today, "yyyy-MM-dd");
  const [month, setMonth] = useState(startOfMonth(today));
  const [sheet, setSheet] = useState<SheetState>(null);
  const [budget, setBudget] = useState<{ cat: CategoryKey | null } | null>(null);
  const userId = useProfile()?.id ?? "";
  const key = monthKey(month);
  // Önce 6 aylık aralık istenir: bu ay da içinde olduğundan tek aylık okumalar ayrı istek atmaz
  const six = lastMonths(today, 6);
  const sixKeys = six.map(keyOf);
  const finMap = useFinanceMap(sixKeys);
  const entMap = useEntriesMap(sixKeys);
  const items = useFinance(key);
  const entries = useMonthEntries(key) ?? [];
  const settings = useSettings() ?? DEFAULT_SETTINGS;
  const cur = settings.currency;
  const defaultDate = key === monthKey(today) ? todayStr : `${key}-01`;
  const title = format(month, "MMMM yyyy", { locale: tr });
  const capTitle = title.charAt(0).toLocaleUpperCase("tr") + title.slice(1);

  const header = {
    eyebrow: "Gelir ve gider", title: <LargeTitle>{capTitle}</LargeTitle>, compactTitle: capTitle,
    actions: (
      <>
        <IconButton label="Önceki ay" onPress={() => setMonth(addMonths(month, -1))}><ChevronLeft size={16} color={c.secondaryForeground} /></IconButton>
        <IconButton label="Sonraki ay" onPress={() => setMonth(addMonths(month, 1))}><ChevronRight size={16} color={c.secondaryForeground} /></IconButton>
      </>
    ),
  };
  if (!items) return <Screen {...header}><Card style={{ minHeight: 448, opacity: 0.6 }} /></Screen>;

  async function removeItem(i: FinanceItem) {
    try { await mutate.finance.remove(key, i.id); toast.success(`${i.category} silindi`); }
    catch (e) { toast.error(errorText(e, "Silinemedi")); }
  }

  const f = financeSummary(items, entries, settings);
  const sorted = [...items].sort((a, b) => Number(b.recurring) - Number(a.recurring) || (b.spent_on ?? "").localeCompare(a.spent_on ?? "") || b.amount - a.amount);
  const maxExpense = f.breakdown[0]?.amount ?? 0;
  const spentByKey = new Map<string, number>();
  f.breakdown.forEach((b) => spentByKey.set(categoryKey(b.category), (spentByKey.get(categoryKey(b.category)) ?? 0) + b.amount));
  const limits = Object.entries(settings.budgets ?? {}).filter(([, v]) => v > 0) as [CategoryKey, number][];
  const trend = six.map((d) => {
    const k = keyOf(d);
    const has = (finMap[k]?.length ?? 0) > 0 || (entMap[k]?.length ?? 0) > 0;
    const s = financeSummary(finMap[k] ?? [], entMap[k] ?? [], settings);
    return { d, k, income: has ? s.income : 0, expense: has ? s.expense : 0 };
  });
  const trendMax = Math.max(1, ...trend.flatMap((t) => [t.income, t.expense]));
  const incomeColor = dark ? "#00d492" : "#009966";

  return (
    <Screen {...header}>
      {/* Aylık özet */}
      <Card style={{ padding: 20, gap: 20 }} accessibilityLabel="Aylık özet">
        <View style={{ alignItems: "center" }}>
          <Txt muted style={{ fontSize: 14, lineHeight: 20 }}>Ay sonu kalan</Txt>
          <AnimatedNumber value={f.left} format={(n) => money(n, cur)} numberOfLines={1} adjustsFontSizeToFit style={{ marginTop: 4, fontSize: 48, lineHeight: 48, fontWeight: "700", letterSpacing: -1.2, color: f.left < 0 ? c.destructive : c.foreground }} />
          <Txt muted style={{ marginTop: 8, fontSize: 12, lineHeight: 16, textAlign: "center", fontVariant: ["tabular-nums"] }}>
            Maaş {money(f.salary, cur)}{f.deduction > 0 ? ` (kesinti ${money(f.deduction, cur)} düşüldü)` : ""} + mesai {money(f.overtime, cur)}{f.extra > 0 ? ` + ek gelir ${money(f.extra, cur)}` : ""} − gider {money(f.expense, cur)}
          </Txt>
        </View>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Stat label="Gelir" value={money(f.income, cur)} size={16} />
          <Stat label="Gider" value={money(f.expense, cur)} size={16} />
          <Stat label="Tasarruf" value={`%${Math.round(f.savingRate)}`} size={16} />
        </View>
      </Card>

      <View style={{ flexDirection: "row", gap: 12 }}>
        <Button title="Gider ekle" size="xl" style={{ flex: 1 }} disabled={!userId} icon={<Plus size={20} color={c.primaryForeground} />} onPress={() => setSheet({ item: null, kind: "expense" })} />
        <Button title="Gelir ekle" size="xl" variant="secondary" style={{ flex: 1 }} disabled={!userId} icon={<Plus size={20} color={c.secondaryForeground} />} onPress={() => setSheet({ item: null, kind: "income" })} />
      </View>

      {/* Giderler nereye gidiyor? */}
      {f.breakdown.length > 0 ? (
        <Card style={{ paddingVertical: 16, paddingHorizontal: 16, gap: 16 }}>
          <Txt style={h2}>Giderler nereye gidiyor?</Txt>
          <View style={{ gap: 14 }}>
            {f.breakdown.map((b) => (
              <View key={b.category} style={{ gap: 6 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <CategoryIcon category={b.category} size={28} />
                  <Txt numberOfLines={1} style={{ flex: 1, fontSize: 14, fontWeight: "500" }}>{b.category}</Txt>
                  <Txt muted style={{ fontSize: 14, fontVariant: ["tabular-nums"] }}>%{Math.round((b.amount / f.expense) * 100)}</Txt>
                  <Txt style={{ width: 96, textAlign: "right", fontSize: 14, fontWeight: "600", fontVariant: ["tabular-nums"] }}>{money(b.amount, cur)}</Txt>
                </View>
                <View style={{ height: 8, borderRadius: radius.pill, backgroundColor: c.muted }}>
                  <View style={{ height: "100%", borderRadius: radius.pill, width: `${Math.max(3, (b.amount / maxExpense) * 100)}%`, backgroundColor: CATEGORY_META[categoryKey(b.category)].color }} />
                </View>
              </View>
            ))}
          </View>
        </Card>
      ) : null}

      {/* Bütçe limitleri */}
      <Card style={{ paddingVertical: 16, paddingHorizontal: 16, gap: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Txt style={h2}>Bütçe limitleri</Txt>
            <Txt muted style={{ fontSize: 12, lineHeight: 16 }}>Kategori başına aylık harcama limiti</Txt>
          </View>
          <Button title="Limit" size="sm" variant="secondary" disabled={!userId} icon={<Plus size={16} color={c.secondaryForeground} />} onPress={() => setBudget({ cat: null })} />
        </View>
        {limits.length === 0 ? (
          <View style={{ borderRadius: radius.lg, backgroundColor: c.muted, paddingHorizontal: 16, paddingVertical: 16 }}>
            <Txt muted style={{ fontSize: 14, lineHeight: 20, textAlign: "center" }}>Limit belirlemedin. Örn. market için aylık ₺5.000.</Txt>
          </View>
        ) : null}
        {limits.map(([k, limit]) => {
          const spent = spentByKey.get(k) ?? 0;
          const pct = (spent / limit) * 100;
          const over = pct > 100;
          return (
            <Pressable key={k} onPress={() => setBudget({ cat: k })}
              style={({ pressed }) => ({ borderRadius: radius.lg, backgroundColor: c.muted, paddingHorizontal: 16, paddingVertical: 12, gap: 8, transform: [{ scale: pressed ? 0.98 : 1 }] })}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <CategoryIcon category={k} size={28} />
                <Txt style={{ flex: 1, fontSize: 14, fontWeight: "600" }}>{CATEGORY_META[k].label}</Txt>
                <Txt style={{ fontSize: 14, fontVariant: ["tabular-nums"], fontWeight: over ? "600" : "400", color: over ? c.destructive : c.mutedForeground }}>{money(spent, cur)} / {money(limit, cur)}</Txt>
              </View>
              <View style={{ height: 8, borderRadius: radius.pill, backgroundColor: c.background }} accessibilityRole="progressbar">
                <View style={{ height: "100%", borderRadius: radius.pill, width: `${Math.min(100, Math.max(2, pct))}%`, backgroundColor: over ? c.destructive : pct >= 80 ? "#e08a3c" : c.teal }} />
              </View>
              {over ? <Txt style={{ fontSize: 12, lineHeight: 16, fontWeight: "500", color: c.destructive }}>Limiti {money(spent - limit, cur)} aştın</Txt>
                : pct >= 80 ? <Txt style={{ fontSize: 12, lineHeight: 16, fontWeight: "500", color: "#e17100" }}>Limitin %{Math.round(pct)}&apos;ine geldin, {money(limit - spent, cur)} kaldı</Txt> : null}
            </Pressable>
          );
        })}
      </Card>

      {/* Son 6 ay */}
      <Card style={{ paddingVertical: 16, paddingHorizontal: 16, gap: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Txt style={h2}>Son 6 ay</Txt>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}><View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c.teal }} /><Txt muted style={{ fontSize: 11 }}>Gelir</Txt></View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}><View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: EXPENSE_BAR }} /><Txt muted style={{ fontSize: 11 }}>Gider</Txt></View>
          </View>
        </View>
        <View style={{ height: 160, flexDirection: "row", alignItems: "flex-end", gap: 8 }} accessibilityLabel="Aylara göre gelir ve gider">
          {trend.map((t) => (
            <View key={t.k} style={{ flex: 1, height: "100%", alignItems: "center", justifyContent: "flex-end", gap: 6 }}>
              <View style={{ flex: 1, width: "100%", flexDirection: "row", alignItems: "flex-end", justifyContent: "center", gap: 4 }}>
                <View style={{ width: "50%", maxWidth: 16, flexShrink: 1, borderTopLeftRadius: 8, borderTopRightRadius: 8, backgroundColor: c.teal, height: `${Math.max(t.income > 0 ? 4 : 1, (t.income / trendMax) * 100)}%` }} />
                <View style={{ width: "50%", maxWidth: 16, flexShrink: 1, borderTopLeftRadius: 8, borderTopRightRadius: 8, backgroundColor: EXPENSE_BAR, height: `${Math.max(t.expense > 0 ? 4 : 1, (t.expense / trendMax) * 100)}%` }} />
              </View>
              <Txt muted style={{ fontSize: 11, lineHeight: 16.5, textTransform: "capitalize" }}>{format(t.d, "LLL", { locale: tr })}</Txt>
            </View>
          ))}
        </View>
      </Card>

      {/* Kayıtlar */}
      <View style={{ gap: 8 }} accessibilityLabel="Kayıtlar">
        <Txt style={h2Out}>Kayıtlar</Txt>
        {sorted.length === 0 ? (
          <Card size="lg" style={{ paddingHorizontal: 16, paddingVertical: 24 }}>
            <Txt muted style={{ fontSize: 14, lineHeight: 20, textAlign: "center" }}>Bu ay için kayıt yok. Maaşın ve mesain otomatik hesaplanır; gider ve ek gelirlerini yukarıdan ekle.</Txt>
          </Card>
        ) : null}
        {sorted.map((i) => (
          <SwipeRow key={i.id} label={i.recurring ? "Bitir" : "Sil"}
            style={{ borderRadius: radius.lg, boxShadow: c.shadow.card }}
            onDelete={() => (i.recurring ? setSheet({ item: i, kind: i.kind }) : removeItem(i))}
            onPress={() => setSheet({ item: i, kind: i.kind })}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 16, paddingVertical: 12 }}>
              <CategoryIcon category={i.category} size={36} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Txt numberOfLines={1} style={{ fontSize: 14, lineHeight: 20, fontWeight: "600" }}>{i.category}</Txt>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  {i.recurring ? <Repeat size={12} color={c.mutedForeground} /> : null}
                  <Txt muted style={{ fontSize: 12, lineHeight: 16 }}>
                    {i.recurring ? "Her ay" : i.spent_on ? format(parseISO(i.spent_on), "d MMMM", { locale: tr }) : "Ay geneli"}
                    {categoryKey(i.category) === "ekgelir" && /^ma[aâ]ş/i.test(i.category) ? " · maaş zaten otomatik sayılıyor" : ""}
                  </Txt>
                </View>
              </View>
              <Txt style={{ fontSize: 16, fontWeight: "700", fontVariant: ["tabular-nums"], color: i.kind === "income" ? incomeColor : c.foreground }}>
                {i.kind === "income" ? "+" : "−"}{money(i.amount, cur)}
              </Txt>
            </View>
          </SwipeRow>
        ))}
        {sorted.length > 0 ? <Txt muted style={{ paddingHorizontal: 4, textAlign: "center", fontSize: 12, lineHeight: 16 }}>Silmek için kaydı sola kaydır.</Txt> : null}
      </View>

      {budget && userId ? <BudgetSheet userId={userId} settings={settings} initial={budget.cat} onClose={() => setBudget(null)} /> : null}
      {sheet ? (
        <FinanceSheet key={sheet.item?.id ?? `new-${sheet.kind}`} item={sheet.item} defaultKind={sheet.kind}
          viewKey={key} userId={userId} today={todayStr} defaultDate={defaultDate} onClose={() => setSheet(null)} />
      ) : null}
    </Screen>
  );
}
