"use client";

import { errorText } from "@/lib/errors";
import { useState } from "react";
import { format, parseISO } from "date-fns";
import { tr } from "date-fns/locale";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { mutate } from "@/lib/store";
import type { Payslip } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";

/** Bordroda yazan mesai saati ve tutarını girme/düzenleme paneli. */
export function PayslipSheet({ userId, months, item, defaultMonth, existingMonths = [], startInDelete = false, onClose }: {
  userId: string; months: Date[]; item: Payslip | null; defaultMonth: string;
  /** Bordrosu zaten girilmiş aylar ("yyyy-MM"): yeni kayıtta aynı ay seçilirse üzerine yazılacağı uyarılır */
  existingMonths?: string[]; startInDelete?: boolean; onClose: () => void;
}) {
  const [view, setView] = useState<"form" | "delete">(item && startInDelete ? "delete" : "form");
  const [month, setMonth] = useState(item ? item.month.slice(0, 7) : defaultMonth);
  const [hours, setHours] = useState(item ? String(item.paid_hours) : "");
  const [amount, setAmount] = useState(item ? String(item.paid_amount) : "");
  const [busy, setBusy] = useState(false);
  const num = (v: string) => { const n = parseFloat(v.replace(",", ".")); return Number.isFinite(n) && n >= 0 ? n : NaN; };
  const valid = !Number.isNaN(num(hours)) && !Number.isNaN(num(amount)) && hours !== "";

  async function save() {
    if (!valid) return;
    setBusy(true);
    try {
      await mutate.payslip.save({ user_id: userId, month: `${month}-01`, paid_hours: num(hours), paid_amount: num(amount || "0") || 0, note: null });
      toast.success("Bordro kaydedildi");
      onClose();
    } catch (e) { toast.error(errorText(e, "Kaydedilemedi")); setBusy(false); }
  }
  async function remove() {
    if (!item) return;
    setBusy(true);
    try { await mutate.payslip.remove(item.id); toast.success("Silindi"); onClose(); }
    catch (e) { toast.error(errorText(e, "Silinemedi")); setBusy(false); }
  }

  return (
    <Sheet open onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent side="bottom" className="mx-auto max-h-[92dvh] max-w-lg gap-5 overflow-y-auto rounded-t-[2rem] p-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
        <SheetHeader className="p-0">
          <SheetTitle className="text-lg">{item ? "Bordroyu düzenle" : "Bordro ekle"}</SheetTitle>
          <SheetDescription>Bordroda mesai olarak yazan saat ve tutarı gir; uygulamanın hesabıyla karşılaştıralım.</SheetDescription>
        </SheetHeader>
        {view === "delete" && item ? (
          <div className="space-y-6 rounded-[1.75rem] bg-muted p-6">
            <div className="space-y-2">
              <p className="text-xl font-semibold leading-snug">Bordro silinsin mi?</p>
              <p className="text-base leading-relaxed text-muted-foreground">
                {format(parseISO(item.month), "LLLL yyyy", { locale: tr })} bordrosu ({item.paid_hours} sa · ₺{item.paid_amount}) silinecek.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="secondary" autoFocus disabled={busy} className="h-14 bg-background text-base font-semibold" onClick={() => (startInDelete ? onClose() : setView("form"))}>Hayır</Button>
              <Button disabled={busy} className="h-14 bg-destructive text-base font-semibold text-white hover:bg-destructive/90" onClick={remove}>Evet, sil</Button>
            </div>
          </div>
        ) : (<>
        <div className="space-y-1.5">
          <Label htmlFor="ps-month">Ay</Label>
          <select id="ps-month" value={month} onChange={(e) => setMonth(e.target.value)} disabled={!!item}
            className="h-11 w-full rounded-[var(--r-md)] bg-muted px-4 text-sm font-medium capitalize outline-none">
            {/* Düzenlenen bordronun ayı son 12 ay dışındaysa da seçenek olarak bulunur */}
            {(item && !months.some((d) => format(d, "yyyy-MM") === month) ? [parseISO(item.month), ...months] : months).map((d) => <option key={format(d, "yyyy-MM")} value={format(d, "yyyy-MM")}>{format(d, "LLLL yyyy", { locale: tr })}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="ps-hours">Bordroda mesai (saat)</Label>
            <Input id="ps-hours" inputMode="decimal" placeholder="Örn. 52" value={hours} onChange={(e) => setHours(e.target.value.replace(/[^0-9.,]/g, ""))} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ps-amount">Bordroda mesai tutarı (₺)</Label>
            <Input id="ps-amount" inputMode="decimal" placeholder="Örn. 14300" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.,]/g, ""))} />
          </div>
        </div>
        {!item && existingMonths.includes(month) && (
          <p className="r-md bg-muted px-4 py-3 text-sm text-muted-foreground">Bu ay için zaten bir bordro var. Kaydedersen üzerine yazılır.</p>
        )}
        <Button className="h-14 text-base font-semibold" disabled={!valid || busy} onClick={save}>Kaydet</Button>
        {!valid && (hours !== "" || amount !== "") && <p className="-mt-2 text-xs text-muted-foreground">Saat alanı boş bırakılamaz. Kaydı kaldırmak için aşağıdaki &quot;Bordroyu sil&quot; düğmesini kullan.</p>}
        {item && <Button className="h-12 bg-destructive text-base font-semibold text-white hover:bg-destructive/90" disabled={busy} onClick={() => setView("delete")}><Trash2 className="size-4" />Bordroyu sil</Button>}
        </>)}
      </SheetContent>
    </Sheet>
  );
}
