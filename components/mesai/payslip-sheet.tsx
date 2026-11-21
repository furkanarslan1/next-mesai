"use client";

import { useState } from "react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { toast } from "sonner";
import { mutate } from "@/lib/store";
import type { Payslip } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";

/** Bordroda yazan mesai saati ve tutarını girme/düzenleme paneli. */
export function PayslipSheet({ userId, months, item, defaultMonth, onClose }: {
  userId: string; months: Date[]; item: Payslip | null; defaultMonth: string; onClose: () => void;
}) {
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
    } catch (e) { toast.error(e instanceof Error ? e.message : "Kaydedilemedi"); setBusy(false); }
  }
  async function remove() {
    if (!item) return;
    setBusy(true);
    try { await mutate.payslip.remove(item.id); toast.success("Silindi"); onClose(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Silinemedi"); setBusy(false); }
  }

  return (
    <Sheet open onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent side="bottom" className="mx-auto max-h-[92dvh] max-w-lg gap-5 overflow-y-auto rounded-t-[2rem] p-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
        <SheetHeader className="p-0">
          <SheetTitle className="text-lg">{item ? "Bordroyu düzenle" : "Bordro ekle"}</SheetTitle>
          <SheetDescription>Bordroda mesai olarak yazan saat ve tutarı gir; uygulamanın hesabıyla karşılaştıralım.</SheetDescription>
        </SheetHeader>
        <div className="space-y-1.5">
          <Label htmlFor="ps-month">Ay</Label>
          <select id="ps-month" value={month} onChange={(e) => setMonth(e.target.value)} disabled={!!item}
            className="h-11 w-full rounded-[var(--r-md)] bg-muted px-4 text-sm font-medium capitalize outline-none">
            {months.map((d) => <option key={format(d, "yyyy-MM")} value={format(d, "yyyy-MM")}>{format(d, "LLLL yyyy", { locale: tr })}</option>)}
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
        <Button className="h-14 text-base font-semibold" disabled={!valid || busy} onClick={save}>Kaydet</Button>
        {item && <Button variant="ghost" className="h-12 text-destructive" disabled={busy} onClick={remove}>Bordroyu sil</Button>}
      </SheetContent>
    </Sheet>
  );
}
