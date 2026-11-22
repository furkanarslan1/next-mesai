"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import { tr } from "date-fns/locale";
import { Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { errorText } from "@/lib/errors";
import { mutate } from "@/lib/store";
import type { Payslip, Settings } from "@/lib/types";
import { FormRow, FormSection, NumberRow } from "@/components/mesai/ios-form";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";

const toNum = (v: string) => { const n = parseFloat(v.replace(",", ".")); return Number.isFinite(n) && n >= 0 ? n : NaN; };
const optional = (v: string): number | null => { if (v.trim() === "") return null; const n = toNum(v); return Number.isNaN(n) ? null : n; };
const show = (n: number | null | undefined) => (n == null ? "" : String(n));

type OtRow = { pct: string; hours: string };

/** Bordro girişi: bordrodaki gün dağılımı, oran başına ek mesai saati, tutar ve net ödenen. Alanların çoğu isteğe bağlıdır. */
export function PayslipSheet({ userId, months, item, defaultMonth, existingMonths = [], startInDelete = false, settings, onClose }: {
  userId: string; months: Date[]; item: Payslip | null; defaultMonth: string; settings: Settings;
  /** Bordrosu zaten girilmiş aylar ("yyyy-MM"): yeni kayıtta aynı ay seçilirse üzerine yazılacağı uyarılır */
  existingMonths?: string[]; startInDelete?: boolean; onClose: () => void;
}) {
  const [view, setView] = useState<"form" | "delete">(item && startInDelete ? "delete" : "form");
  const [month, setMonth] = useState(item ? item.month.slice(0, 7) : defaultMonth);
  const [ot, setOt] = useState<OtRow[]>(() => {
    const saved = item?.overtime_by_pct;
    if (saved && Object.keys(saved).length) return Object.entries(saved).map(([pct, h]) => ({ pct, hours: String(h) }));
    // Yeni bordro: ayarlardaki hafta içi ve pazar oranları hazır satır olarak gelir
    const pcts = [...new Set([settings.weekday_percent, settings.sunday_percent])];
    return pcts.map((p) => ({ pct: String(+p.toFixed(2)), hours: "" }));
  });
  const [amount, setAmount] = useState(show(item?.paid_amount || null));
  const [unpaid, setUnpaid] = useState(show(item?.unpaid_days));
  const [sickUnpaid, setSickUnpaid] = useState(show(item?.sick_unpaid_days));
  const [sickPaid, setSickPaid] = useState(show(item?.sick_paid_days));
  const [leave, setLeave] = useState(show(item?.paid_leave_days));
  const [special, setSpecial] = useState(show(item?.special_deductions));
  const [net, setNet] = useState(show(item?.net_paid));
  const [busy, setBusy] = useState(false);

  const rows = ot.map((r) => ({ pct: toNum(r.pct), hours: r.hours.trim() === "" ? 0 : toNum(r.hours) }));
  const rowsValid = rows.every((r) => !Number.isNaN(r.pct) && r.pct > 0 && !Number.isNaN(r.hours));
  const totalHours = rows.reduce((a, r) => a + (Number.isNaN(r.hours) ? 0 : r.hours), 0);
  const amountOk = amount.trim() === "" || !Number.isNaN(toNum(amount));
  const hasData = totalHours > 0 || (amount.trim() !== "" && toNum(amount) > 0) || [unpaid, sickUnpaid, sickPaid, leave, special, net].some((v) => v.trim() !== "");
  const valid = rowsValid && amountOk && hasData;
  const mark = (i: number, patch: Partial<OtRow>) => setOt(ot.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  async function save() {
    if (!valid) return;
    setBusy(true);
    try {
      const byPct: Record<string, number> = {};
      rows.forEach((r) => { if (r.hours > 0) byPct[String(+r.pct.toFixed(2))] = +((byPct[String(+r.pct.toFixed(2))] ?? 0) + r.hours).toFixed(2); });
      await mutate.payslip.save({
        user_id: userId, month: `${month}-01`, paid_hours: +totalHours.toFixed(2), paid_amount: amount.trim() === "" ? 0 : toNum(amount), note: null,
        unpaid_days: optional(unpaid), sick_unpaid_days: optional(sickUnpaid), sick_paid_days: optional(sickPaid), paid_leave_days: optional(leave),
        overtime_by_pct: Object.keys(byPct).length ? byPct : null, special_deductions: optional(special), net_paid: optional(net),
      });
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

  const monthOptions = item && !months.some((d) => format(d, "yyyy-MM") === month) ? [parseISO(item.month), ...months] : months;

  return (
    <Sheet open onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent side="bottom" className="mx-auto max-h-[94dvh] max-w-lg gap-4 overflow-y-auto rounded-t-[2rem] p-0">
        <SheetHeader className="px-5 pt-5">
          <SheetTitle className="text-lg">{view === "delete" ? "Bordroyu sil" : item ? "Bordroyu düzenle" : "Bordro ekle"}</SheetTitle>
          <SheetDescription>Bordrondaki satırları gir; uygulamanın hesabıyla karşılaştıralım. Boş bıraktığın satırlar karşılaştırılmaz.</SheetDescription>
        </SheetHeader>

        {view === "delete" && item ? (
          <div className="mx-5 mb-5 space-y-6 rounded-[1.75rem] bg-muted p-6">
            <div className="space-y-2">
              <p className="text-xl font-semibold leading-snug">Bordro silinsin mi?</p>
              <p className="text-base leading-relaxed text-muted-foreground">{format(parseISO(item.month), "LLLL yyyy", { locale: tr })} bordrosu ({item.paid_hours} sa · ₺{item.paid_amount}) silinecek.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="secondary" autoFocus disabled={busy} className="h-14 bg-background text-base font-semibold" onClick={() => (startInDelete ? onClose() : setView("form"))}>Hayır</Button>
              <Button disabled={busy} className="h-14 bg-destructive text-base font-semibold text-white hover:bg-destructive/90" onClick={remove}>Evet, sil</Button>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-5 px-5">
              <FormSection tone="muted">
                <FormRow label="Dönem">
                  <select value={month} onChange={(e) => setMonth(e.target.value)} disabled={!!item} aria-label="Dönem"
                    className="h-11 rounded-full bg-card dark:bg-background px-4 text-[16px] font-semibold capitalize outline-none">
                    {monthOptions.map((d) => <option key={format(d, "yyyy-MM")} value={format(d, "yyyy-MM")}>{format(d, "LLLL yyyy", { locale: tr })}</option>)}
                  </select>
                </FormRow>
              </FormSection>
              {!item && existingMonths.includes(month) && (
                <p className="rounded-[var(--r-md)] bg-muted px-4 py-3 text-sm text-muted-foreground">Bu ay için zaten bir bordro var. Kaydedersen üzerine yazılır.</p>
              )}

              <FormSection tone="muted" title="Ek mesai (saat)" footer={`Toplam: ${+totalHours.toFixed(2)} saat. Bordrodaki “Ek. Mes. %…” satırlarının saatlerini gir.`}>
                {ot.map((r, i) => (
                  <div key={i} className="flex min-h-[3.25rem] items-center gap-2 px-4">
                    <span className="text-muted-foreground">%</span>
                    <input inputMode="decimal" aria-label="Oran" value={r.pct} onChange={(e) => mark(i, { pct: e.target.value.replace(/[^0-9.,]/g, "") })}
                      className="h-11 w-16 rounded-full bg-card dark:bg-background px-3 text-center text-[17px] font-semibold tabular-nums outline-none" />
                    <input inputMode="decimal" aria-label={`%${r.pct} mesai saati`} placeholder="0" value={r.hours} onChange={(e) => mark(i, { hours: e.target.value.replace(/[^0-9.,]/g, "") })}
                      className="h-11 min-w-0 flex-1 bg-transparent text-right text-[17px] font-semibold tabular-nums outline-none placeholder:font-normal placeholder:text-muted-foreground/50" />
                    <span className="text-[15px] text-muted-foreground">saat</span>
                    <button type="button" aria-label="Satırı kaldır" onClick={() => setOt(ot.filter((_, j) => j !== i))} className="grid size-9 shrink-0 place-items-center rounded-full text-muted-foreground active:scale-90"><X className="size-4" /></button>
                  </div>
                ))}
                <button type="button" onClick={() => setOt([...ot, { pct: "", hours: "" }])} className="flex min-h-[3.25rem] w-full items-center gap-2 px-4 text-[15px] font-semibold text-primary active:opacity-60">
                  <Plus className="size-4" />Oran ekle
                </button>
              </FormSection>

              <FormSection tone="muted" title="Ek mesai tutarı">
                <NumberRow label="Net toplam" suffix="₺" placeholder="Örn. 9494.73" hint="Ek mesai bölümünün net toplamı" value={amount} onChange={setAmount} />
              </FormSection>

              <FormSection tone="muted" title="Günler (isteğe bağlı)" footer="Bordrodaki satırın gün sayısı. Boş bırakılan satır karşılaştırılmaz.">
                <NumberRow label="Ücretsiz izin" suffix="gün" hint="Devamsızlık dahil" value={unpaid} onChange={setUnpaid} />
                <NumberRow label="Raporlu (ücretsiz)" suffix="gün" value={sickUnpaid} onChange={setSickUnpaid} />
                <NumberRow label="Raporlu (ödenecek)" suffix="gün" value={sickPaid} onChange={setSickPaid} />
                <NumberRow label="Ücretli / yıllık izin" suffix="gün" value={leave} onChange={setLeave} />
              </FormSection>

              <FormSection tone="muted" title="Ödeme (isteğe bağlı)">
                <NumberRow label="Özel kesintiler" suffix="₺" hint="BES, avans vb." value={special} onChange={setSpecial} />
                <NumberRow label="Net ödenen" suffix="₺" placeholder="Örn. 48833.16" value={net} onChange={setNet} />
              </FormSection>
            </div>

            {/* Kaydet çubuğu panelin altında sabit kalır */}
            <div className="sticky bottom-0 space-y-2 border-t border-border/60 bg-popover px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3">
              {!rowsValid || !amountOk ? <p className="text-xs text-destructive">Oran ve saat alanlarında geçerli sayılar gir.</p> : !hasData ? <p className="text-xs text-muted-foreground">Kaydetmek için en az bir satıra değer gir.</p> : null}
              <Button className="h-14 w-full text-base font-semibold" disabled={!valid || busy} onClick={save}>Kaydet</Button>
              {item && <Button className="h-12 w-full bg-destructive text-base font-semibold text-white hover:bg-destructive/90" disabled={busy} onClick={() => setView("delete")}><Trash2 className="size-4" />Bordroyu sil</Button>}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
