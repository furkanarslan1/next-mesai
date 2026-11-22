"use client";

import { errorText } from "@/lib/errors";
import { useState } from "react";
import { format, parseISO, subMonths } from "date-fns";
import { tr } from "date-fns/locale";
import { CalendarDays, ChevronLeft, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { mutate } from "@/lib/store";
import { CATEGORY_META, EXPENSE_CATEGORIES, INCOME_CATEGORIES, categoryKey, type CategoryKey } from "@/lib/finance";
import type { FinanceItem } from "@/lib/types";
import { CalendarGrid } from "@/components/mesai/calendar-grid";
import { CategoryIcon } from "@/components/mesai/category-icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";

type View = "form" | "date" | "delete";
const firstOf = (d: string) => `${d.slice(0, 7)}-01`;

/** Gelir/gider ekleme ve düzenleme paneli. `item` doluysa düzenleme, boşsa yeni kayıt. */
export function FinanceSheet({ item, viewKey, userId, today, defaultDate, defaultKind = "expense", onClose }: {
  item: FinanceItem | null; viewKey: string; userId: string; today: string; defaultDate: string;
  defaultKind?: FinanceItem["kind"]; onClose: () => void;
}) {
  const initialKey = item ? categoryKey(item.category) : "diger";
  const [kind, setKind] = useState<FinanceItem["kind"]>(item?.kind ?? defaultKind);
  const [amount, setAmount] = useState(item ? String(item.amount) : "");
  const [cat, setCat] = useState<CategoryKey | null>(item ? initialKey : null);
  const [custom, setCustom] = useState(item && initialKey === "diger" && item.category !== "Diğer" ? item.category : "");
  const [date, setDate] = useState(item?.spent_on ?? (item ? `${item.month.slice(0, 7)}-01` : defaultDate));
  const [recurring, setRecurring] = useState(item?.recurring ?? false);
  const [view, setView] = useState<View>("form");
  const [calMonth, setCalMonth] = useState(() => parseISO(date));
  const [busy, setBusy] = useState(false);

  const value = parseFloat(amount.replace(",", "."));
  const valid = value > 0 && cat !== null;
  const cats = kind === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
  const categoryName = cat === null ? "" : cat === "diger" ? custom.trim() || "Diğer" : CATEGORY_META[cat].label;

  async function run(fn: () => Promise<void>, ok: string) {
    setBusy(true);
    try { await fn(); toast.success(ok); onClose(); }
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
    <Sheet open onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent side="bottom" className="mx-auto max-h-[92dvh] max-w-lg gap-5 overflow-y-auto rounded-t-[2rem] p-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
        <SheetHeader className="p-0">
          <SheetTitle className="text-lg">{item ? "Kaydı düzenle" : "Yeni kayıt"}</SheetTitle>
          <SheetDescription className="sr-only">Gelir veya gider kalemi</SheetDescription>
        </SheetHeader>

        {view === "date" && (
          <div className="space-y-4">
            <Button variant="ghost" size="sm" className="-ml-2 w-fit" onClick={() => setView("form")}><ChevronLeft className="size-4" />Geri</Button>
            <CalendarGrid month={calMonth} onMonthChange={setCalMonth} value={date} today={today} onSelect={(d) => { setDate(d); setView("form"); }} />
          </div>
        )}

        {view === "delete" && item && (
          <div className="space-y-6 rounded-[1.75rem] bg-muted p-6">
            <div className="space-y-2">
              <p className="text-xl font-semibold leading-snug">Kayıt silinsin mi?</p>
              <p className="text-base leading-relaxed text-muted-foreground">
                {item.recurring ? `"${item.category}" her ay tekrarlıyor. Silersen tüm aylardan kalkar; yalnızca bu aydan itibaren bitirebilirsin.` : `"${item.category}" kaydı silinecek.`}
              </p>
            </div>
            {item.recurring && <Button variant="outline" disabled={busy} className="h-14 w-full text-base font-semibold" onClick={endHere}>Bu aydan itibaren bitir</Button>}
            <div className="grid grid-cols-2 gap-3">
              <Button variant="secondary" autoFocus disabled={busy} className="h-14 bg-background text-base font-semibold" onClick={() => setView("form")}>Hayır</Button>
              <Button disabled={busy} className="h-14 text-base font-semibold" onClick={remove}>Evet, sil</Button>
            </div>
          </div>
        )}

        {view === "form" && (
          <>
            <div className="grid grid-cols-2 gap-2 rounded-full bg-muted p-1" role="radiogroup" aria-label="Tür">
              {(["expense", "income"] as const).map((k) => (
                <button key={k} type="button" role="radio" aria-checked={kind === k}
                  onClick={() => { if (kind !== k) { setKind(k); setCat(null); setCustom(""); } }}
                  className={`h-11 rounded-full text-sm font-semibold transition ${kind === k ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground"}`}>
                  {k === "expense" ? "Gider" : "Gelir"}
                </button>
              ))}
            </div>

            <div className="flex items-baseline justify-center gap-2 py-1">
              <span className="text-3xl font-semibold text-muted-foreground">₺</span>
              <input
                inputMode="decimal" autoFocus={!item} placeholder="0" aria-label="Tutar" value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^0-9.,]/g, ""))}
                style={{ width: `${Math.max(amount.length, 1) + 0.6}ch` }}
                className="min-w-[2ch] max-w-full bg-transparent text-center text-5xl font-bold tabular-nums tracking-tight outline-none placeholder:text-muted-foreground/40"
              />
            </div>

            <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label="Kategori">
              {cats.map((k) => (
                <button key={k} type="button" role="radio" aria-checked={cat === k} onClick={() => setCat(k)}
                  className={`r-md flex flex-col items-center gap-1.5 px-1 py-2.5 text-xs font-medium transition active:scale-95 ${cat === k ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                  <CategoryIcon category={k} className="size-8" />
                  {CATEGORY_META[k].label}
                </button>
              ))}
            </div>
            {cat === "diger" && <Input placeholder="Kategori adı (isteğe bağlı)" value={custom} onChange={(e) => setCustom(e.target.value)} maxLength={30} />}

            <button type="button" onClick={() => { setCalMonth(parseISO(date)); setView("date"); }}
              className="r-lg flex h-14 items-center justify-between bg-muted px-4 text-left text-sm font-medium">
              <span className="flex items-center gap-2.5"><CalendarDays className="size-5 text-muted-foreground" />{recurring ? "Başlangıç" : "Tarih"}</span>
              <span className="tabular-nums">{format(parseISO(date), date === today ? "'Bugün' · d MMMM" : "d MMMM yyyy", { locale: tr })}</span>
            </button>

            <label className="r-lg flex min-h-14 items-center justify-between gap-3 bg-muted px-4 py-2.5 text-sm font-medium">
              <span>
                Her ay tekrarla
                <span className="block text-xs font-normal text-muted-foreground">{kind === "expense" ? "Kira, internet gibi sabit giderler" : "Her ay gelen sabit gelirler"}</span>
              </span>
              <Switch checked={recurring} onCheckedChange={setRecurring} />
            </label>
            {item?.recurring && <p className="-mt-2 text-xs text-muted-foreground">Bu kalem tekrarlıyor: tutarı değiştirirsen tüm aylarda değişir.</p>}

            <Button className="h-14 text-base font-semibold" disabled={!valid || busy} onClick={save}>{item ? "Kaydet" : kind === "expense" ? "Gideri ekle" : "Geliri ekle"}</Button>
            {item && <Button variant="ghost" className="h-12 text-destructive" onClick={() => setView("delete")}><Trash2 className="size-4" />Sil</Button>}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
