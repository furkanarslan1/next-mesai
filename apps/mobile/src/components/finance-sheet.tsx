import { errorText } from "@mesai/core/errors";
import { CATEGORY_META, EXPENSE_CATEGORIES, INCOME_CATEGORIES, categoryKey, type CategoryKey } from "@mesai/core/finance";
import { parseNum } from "@mesai/core/num";
import type { FinanceItem, Settings } from "@mesai/core/types";
import { format } from "date-fns/format";
import { parseISO } from "date-fns/parseISO";
import { subMonths } from "date-fns/subMonths";
import { tr } from "date-fns/locale/tr";
import { CalendarDays, ChevronLeft, Trash2 } from "@/components/icons";
import { useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { haptic } from "@/lib/haptics";
import { mutate } from "@/lib/store";
import { alpha, radius, useColors } from "@/theme";
import { CalendarGrid } from "./calendar-grid";
import { CategoryIcon } from "./category-icon";
import { Switch } from "./form";
import { Sheet } from "./sheet";
import { toast } from "./toast";
import { Button, Txt } from "./ui";

type View_ = "form" | "date" | "delete";
const firstOf = (d: string) => `${d.slice(0, 7)}-01`;

/** Ortada büyük tutar girişi: solda gri ₺, 48px kalın rakamlar (web'deki tutar alanı). */
export function AmountInput({ value, onChange, autoFocus, label }: { value: string; onChange: (v: string) => void; autoFocus?: boolean; label: string }) {
  const c = useColors();
  return (
    <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "center", gap: 8, paddingVertical: 4 }}>
      <Txt muted style={{ fontSize: 30, lineHeight: 36, fontWeight: "600" }}>₺</Txt>
      <TextInput maxFontSizeMultiplier={1.35} value={value} onChangeText={(t) => onChange(t.replace(/[^0-9.,]/g, ""))} placeholder="0" autoFocus={autoFocus}
        keyboardType="decimal-pad" accessibilityLabel={label} placeholderTextColor={alpha(c.mutedForeground, 0.4)}
        style={{ minWidth: 40, width: Math.max(value.length, 1) * 29 + 18, maxWidth: "100%", textAlign: "center", fontSize: 48, lineHeight: 56, fontWeight: "700", letterSpacing: -1.2, fontVariant: ["tabular-nums"], color: c.foreground, padding: 0 }} />
    </View>
  );
}

/** Kategori ızgarası (4 sütun): seçili olan ana renkte. */
export function CategoryGrid({ cats, value, onChange }: { cats: CategoryKey[]; value: CategoryKey | null; onChange: (k: CategoryKey) => void }) {
  const c = useColors();
  const rows = Array.from({ length: Math.ceil(cats.length / 4) }, (_, i) => cats.slice(i * 4, i * 4 + 4));
  return (
    <View style={{ gap: 8 }} accessibilityRole="radiogroup">
      {rows.map((r, i) => (
        <View key={i} style={{ flexDirection: "row", gap: 8 }}>
          {r.map((k) => {
            const on = value === k;
            return (
              <View key={k} style={{ flex: 1 }}>
                <Pressable accessibilityRole="radio" accessibilityState={{ selected: on }} onPress={() => { haptic(); onChange(k); }}
                  style={({ pressed }) => ({ alignItems: "center", gap: 6, paddingHorizontal: 4, paddingVertical: 10, borderRadius: radius.md, backgroundColor: on ? c.primary : c.muted, transform: [{ scale: pressed ? 0.95 : 1 }] })}>
                  <CategoryIcon category={k} size={32} />
                  <Txt numberOfLines={1} style={{ fontSize: 12, lineHeight: 16, fontWeight: "500", color: on ? c.primaryForeground : c.foreground }}>{CATEGORY_META[k].label}</Txt>
                </Pressable>
              </View>
            );
          })}
          {Array.from({ length: 4 - r.length }).map((_, j) => <View key={`e${j}`} style={{ flex: 1 }} />)}
        </View>
      ))}
    </View>
  );
}

/** Gelir/gider ekleme ve düzenleme paneli (web'deki FinanceSheet). `item` doluysa düzenleme, boşsa yeni kayıt. */
export function FinanceSheet({ item, viewKey, userId, today, defaultDate, defaultKind = "expense", onClose }: {
  item: FinanceItem | null; viewKey: string; userId: string; today: string; defaultDate: string;
  defaultKind?: FinanceItem["kind"]; onClose: () => void;
}) {
  const c = useColors();
  const initialKey = item ? categoryKey(item.category) : "diger";
  const [kind, setKind] = useState<FinanceItem["kind"]>(item?.kind ?? defaultKind);
  const [amount, setAmount] = useState(item ? String(item.amount) : "");
  const [cat, setCat] = useState<CategoryKey | null>(item ? initialKey : null);
  const [custom, setCustom] = useState(item && initialKey === "diger" && item.category !== "Diğer" ? item.category : "");
  const [date, setDate] = useState(item?.spent_on ?? (item ? `${item.month.slice(0, 7)}-01` : defaultDate));
  const [recurring, setRecurring] = useState(item?.recurring ?? false);
  const [view, setView] = useState<View_>("form");
  const [calMonth, setCalMonth] = useState(() => parseISO(date));
  const [busy, setBusy] = useState(false);

  const value = parseNum(amount);
  const valid = value > 0 && cat !== null;
  const cats = kind === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
  const categoryName = cat === null ? "" : cat === "diger" ? custom.trim() || "Diğer" : CATEGORY_META[cat].label;

  async function run(fn: () => Promise<void>, ok: string) {
    setBusy(true);
    try { await fn(); haptic("success"); toast.success(ok); onClose(); }
    catch (e) { toast.error(errorText(e, "İşlem başarısız")); setBusy(false); }
  }
  const save = () => {
    if (!valid) return;
    const body = { kind, category: categoryName, amount: value, spent_on: date, month: firstOf(date), recurring, ends_month: null as string | null };
    return run(() => (item ? mutate.finance.update(viewKey, item.id, body) : mutate.finance.add(viewKey, { user_id: userId, ...body })), item ? "Güncellendi" : "Eklendi");
  };
  const remove = () => item && run(() => mutate.finance.remove(viewKey, item.id), "Silindi");
  // Tekrarlayan kalemi görüntülenen aydan itibaren bitirir (önceki aylar korunur)
  const endHere = () => {
    if (!item) return;
    const viewFirst = `${viewKey}-01`;
    if (item.month >= viewFirst) return remove();
    return run(() => mutate.finance.update(viewKey, item.id, { ends_month: format(subMonths(parseISO(viewFirst), 1), "yyyy-MM-01") }), "Bu aydan itibaren bitirildi");
  };

  return (
    <Sheet open onClose={onClose} title={item ? "Kaydı düzenle" : "Yeni kayıt"} showClose gap={20}>
      {view === "date" ? (
        <View style={{ gap: 16 }}>
          <Pressable onPress={() => setView("form")} style={{ flexDirection: "row", alignItems: "center", gap: 4, height: 28, alignSelf: "flex-start", marginLeft: -8, paddingHorizontal: 8 }}>
            <ChevronLeft size={16} color={c.foreground} /><Txt style={{ fontSize: 12.8, fontWeight: "500" }}>Geri</Txt>
          </Pressable>
          <CalendarGrid month={calMonth} onMonthChange={setCalMonth} value={date} today={today} onSelect={(d) => { setDate(d); setView("form"); }} />
        </View>
      ) : null}

      {view === "delete" && item ? (
        <View style={{ gap: 24, borderRadius: 28, backgroundColor: c.muted, padding: 24 }}>
          <View style={{ gap: 8 }}>
            <Txt style={{ fontSize: 20, lineHeight: 27.5, fontWeight: "600" }}>Kayıt silinsin mi?</Txt>
            <Txt muted style={{ fontSize: 16, lineHeight: 26 }}>
              {item.recurring ? `"${item.category}" her ay tekrarlıyor. Silersen tüm aylardan kalkar; yalnızca bu aydan itibaren bitirebilirsin.` : `"${item.category}" kaydı silinecek.`}
            </Txt>
          </View>
          {item.recurring ? (
            <Pressable disabled={busy} onPress={endHere}
              style={({ pressed }) => ({ height: 56, borderRadius: radius.pill, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: c.border, backgroundColor: c.background, transform: [{ scale: pressed ? 0.97 : 1 }] })}>
              <Txt style={{ fontSize: 16, fontWeight: "600" }}>Bu aydan itibaren bitir</Txt>
            </Pressable>
          ) : null}
          <View style={{ flexDirection: "row", gap: 12 }}>
            <Button title="Hayır" variant="secondary" size="xl" disabled={busy} style={{ flex: 1, backgroundColor: c.background }} onPress={() => setView("form")} />
            <Button title="Evet, sil" size="xl" disabled={busy} style={{ flex: 1 }} onPress={remove} />
          </View>
        </View>
      ) : null}

      {view === "form" ? (
        <>
          <View accessibilityRole="radiogroup" style={{ flexDirection: "row", gap: 8, borderRadius: radius.pill, backgroundColor: c.muted, padding: 4 }}>
            {(["expense", "income"] as const).map((k) => (
              <Pressable key={k} accessibilityRole="radio" accessibilityState={{ selected: kind === k }}
                onPress={() => { if (kind !== k) { haptic(); setKind(k); setCat(null); setCustom(""); } }}
                style={{ flex: 1, height: 44, borderRadius: radius.pill, alignItems: "center", justifyContent: "center", backgroundColor: kind === k ? c.primary : "transparent",
                  boxShadow: kind === k ? "0px 1px 3px rgba(0,0,0,0.1), 0px 1px 2px -1px rgba(0,0,0,0.1)" : undefined }}>
                <Txt style={{ fontSize: 14, fontWeight: "600", color: kind === k ? c.primaryForeground : c.mutedForeground }}>{k === "expense" ? "Gider" : "Gelir"}</Txt>
              </Pressable>
            ))}
          </View>

          <AmountInput value={amount} onChange={setAmount} autoFocus={!item} label="Tutar" />

          <CategoryGrid cats={cats} value={cat} onChange={setCat} />
          {cat === "diger" ? (
            <TextInput maxFontSizeMultiplier={1.35} placeholder="Kategori adı (isteğe bağlı)" value={custom} onChangeText={setCustom} maxLength={30} placeholderTextColor={c.mutedForeground}
              style={{ height: 44, borderRadius: radius.md, backgroundColor: c.muted, paddingHorizontal: 16, fontSize: 16, color: c.foreground }} />
          ) : null}

          <Pressable onPress={() => { setCalMonth(parseISO(date)); setView("date"); }}
            style={{ height: 56, borderRadius: radius.lg, backgroundColor: c.muted, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <CalendarDays size={20} color={c.mutedForeground} />
              <Txt style={{ fontSize: 14, fontWeight: "500" }}>{recurring ? "Başlangıç" : "Tarih"}</Txt>
            </View>
            <Txt style={{ fontSize: 14, fontWeight: "500", fontVariant: ["tabular-nums"] }}>
              {format(parseISO(date), date === today ? "'Bugün' · d MMMM" : "d MMMM yyyy", { locale: tr })}
            </Txt>
          </Pressable>

          <Pressable onPress={() => setRecurring(!recurring)}
            style={{ minHeight: 56, borderRadius: radius.lg, backgroundColor: c.muted, paddingHorizontal: 16, paddingVertical: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Txt style={{ fontSize: 14, lineHeight: 20, fontWeight: "500" }}>Her ay tekrarla</Txt>
              <Txt muted style={{ fontSize: 12, lineHeight: 16 }}>{kind === "expense" ? "Kira, internet gibi sabit giderler" : "Her ay gelen sabit gelirler"}</Txt>
            </View>
            <Switch value={recurring} onChange={setRecurring} label="Her ay tekrarla" />
          </Pressable>
          {item?.recurring ? <Txt muted style={{ marginTop: -8, fontSize: 12, lineHeight: 16 }}>Bu kalem tekrarlıyor: tutarı değiştirirsen tüm aylarda değişir.</Txt> : null}

          <Button title={item ? "Kaydet" : kind === "expense" ? "Gideri ekle" : "Geliri ekle"} size="xl" disabled={!valid || busy} onPress={save} />
          {item ? (
            <Pressable onPress={() => setView("delete")} style={({ pressed }) => ({ height: 48, borderRadius: radius.pill, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: pressed ? c.muted : "transparent" })}>
              <Trash2 size={16} color={c.destructive} /><Txt style={{ fontSize: 16, fontWeight: "500", color: c.destructive }}>Sil</Txt>
            </Pressable>
          ) : null}
        </>
      ) : null}
    </Sheet>
  );
}

/** Kategori başına aylık gider limiti belirleme/kaldırma paneli (web'deki BudgetSheet). */
export function BudgetSheet({ userId, settings, initial, onClose }: {
  userId: string; settings: Settings; initial: CategoryKey | null; onClose: () => void;
}) {
  const c = useColors();
  const [cat, setCat] = useState<CategoryKey | null>(initial);
  const [amount, setAmount] = useState(initial && settings.budgets[initial] ? String(settings.budgets[initial]) : "");
  const [busy, setBusy] = useState(false);
  const value = parseNum(amount);
  const valid = cat !== null && value > 0;

  async function write(next: Record<string, number>, ok: string) {
    setBusy(true);
    try { await mutate.saveSettings(userId, { budgets: next }); haptic("success"); toast.success(ok); onClose(); }
    catch (e) { toast.error(errorText(e, "Kaydedilemedi")); setBusy(false); }
  }
  const save = () => cat && valid && write({ ...settings.budgets, [cat]: value }, "Limit kaydedildi");
  const remove = () => { if (!cat) return; const rest = { ...settings.budgets }; delete rest[cat]; return write(rest, "Limit kaldırıldı"); };

  return (
    <Sheet open onClose={onClose} title="Aylık limit" description="Bir kategori için aylık harcama limiti belirle; yaklaşınca uyarılırsın." showClose gap={20}>
      <CategoryGrid cats={EXPENSE_CATEGORIES.filter((k) => k !== "diger")} value={cat}
        onChange={(k) => { setCat(k); setAmount(settings.budgets[k] ? String(settings.budgets[k]) : ""); }} />
      <AmountInput value={amount} onChange={setAmount} label="Aylık limit" />
      <Button title="Limiti kaydet" size="xl" disabled={!valid || busy} onPress={save} />
      {cat && settings.budgets[cat] > 0 ? (
        <Pressable disabled={busy} onPress={remove} style={({ pressed }) => ({ height: 48, borderRadius: radius.pill, alignItems: "center", justifyContent: "center", backgroundColor: pressed ? c.muted : "transparent" })}>
          <Txt style={{ fontSize: 16, fontWeight: "500", color: c.destructive }}>Limiti kaldır</Txt>
        </Pressable>
      ) : null}
    </Sheet>
  );
}
