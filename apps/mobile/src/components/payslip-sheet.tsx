import { hrs, money } from "@mesai/core/calc";
import { errorText } from "@mesai/core/errors";
import { parseNum } from "@mesai/core/num";
import type { Payslip, Settings } from "@mesai/core/types";
import { format } from "date-fns/format";
import { parseISO } from "date-fns/parseISO";
import { tr } from "date-fns/locale/tr";
import { Check, ChevronLeft, Plus, Trash2, X } from "@/components/icons";
import { useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { haptic } from "@/lib/haptics";
import { mutate } from "@/lib/store";
import { alpha, radius, useColors, useIsDark } from "@/theme";
import { FormRow, FormSection, NumberRow } from "./form";
import { Sheet } from "./sheet";
import { toast } from "./toast";
import { Button, Txt } from "./ui";

const toNum = (v: string) => { const n = parseNum(v); return Number.isFinite(n) && n >= 0 ? n : NaN; };
const optional = (v: string): number | null => { if (v.trim() === "") return null; const n = toNum(v); return Number.isNaN(n) ? null : n; };
const show = (n: number | null | undefined) => (n == null ? "" : String(n));
type OtRow = { pct: string; hours: string };

/** Bordro girişi (web'deki PayslipSheet): gün dağılımı, oran başına ek mesai saati, tutar ve net ödenen. */
export function PayslipSheet({ userId, months, item, defaultMonth, existingMonths = [], startInDelete = false, settings, onClose }: {
  userId: string; months: Date[]; item: Payslip | null; defaultMonth: string; settings: Settings;
  existingMonths?: string[]; startInDelete?: boolean; onClose: () => void;
}) {
  const c = useColors();
  const dark = useIsDark();
  const [view, setView] = useState<"form" | "delete" | "month">(item && startInDelete ? "delete" : "form");
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
      haptic("success");
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
  const monthLabel = (k: string) => format(parseISO(`${k}-01`), "LLLL yyyy", { locale: tr });
  const inputBg = dark ? c.background : c.card;

  const footer = view === "form" ? (
    <>
      {!rowsValid || !amountOk ? <Txt style={{ fontSize: 12, lineHeight: 16, color: c.destructive }}>Oran ve saat alanlarında geçerli sayılar gir.</Txt>
        : !hasData ? <Txt muted style={{ fontSize: 12, lineHeight: 16 }}>Kaydetmek için en az bir satıra değer gir.</Txt> : null}
      <Button title="Kaydet" size="xl" disabled={!valid || busy} onPress={save} />
      {item ? (
        <Button title="Bordroyu sil" size="lg" variant="destructive" disabled={busy} icon={<Trash2 size={16} color="#fff" />}
          onPress={() => setView("delete")} />
      ) : null}
    </>
  ) : undefined;

  return (
    <Sheet open onClose={onClose} showClose gap={20} footer={footer}
      title={view === "delete" ? "Bordroyu sil" : item ? "Bordroyu düzenle" : "Bordro ekle"}
      description="Bordrondaki satırları gir; uygulamanın hesabıyla karşılaştıralım. Boş bıraktığın satırlar karşılaştırılmaz.">
      {view === "delete" && item ? (
        <View style={{ gap: 24, borderRadius: 28, backgroundColor: c.muted, padding: 24 }}>
          <View style={{ gap: 8 }}>
            <Txt style={{ fontSize: 20, lineHeight: 27.5, fontWeight: "600" }}>Bordro silinsin mi?</Txt>
            <Txt muted style={{ fontSize: 16, lineHeight: 26 }}>{format(parseISO(item.month), "LLLL yyyy", { locale: tr })} bordrosu ({hrs(item.paid_hours)} · {money(item.paid_amount, settings.currency)}) silinecek.</Txt>
          </View>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <Button title="Hayır" variant="secondary" size="xl" disabled={busy} style={{ flex: 1, backgroundColor: c.background }} onPress={() => (startInDelete ? onClose() : setView("form"))} />
            <Button title="Evet, sil" size="xl" variant="destructive" disabled={busy} style={{ flex: 1 }} onPress={remove} />
          </View>
        </View>
      ) : view === "month" ? (
        <View style={{ gap: 8 }}>
          <Pressable onPress={() => setView("form")} style={{ flexDirection: "row", alignItems: "center", gap: 4, height: 28, alignSelf: "flex-start", marginLeft: -8, paddingHorizontal: 8 }}>
            <ChevronLeft size={16} color={c.foreground} /><Txt style={{ fontSize: 12.8, fontWeight: "500" }}>Geri</Txt>
          </Pressable>
          <FormSection tone="muted">
            {monthOptions.map((d) => {
              const k = format(d, "yyyy-MM");
              return (
                <FormRow key={k} label={monthLabel(k).replace(/^./, (x) => x.toLocaleUpperCase("tr"))} onPress={() => { haptic(); setMonth(k); setView("form"); }}>
                  {k === month ? <Check size={18} color={c.tint} /> : null}
                </FormRow>
              );
            })}
          </FormSection>
        </View>
      ) : (
        <>
          <FormSection tone="muted">
            <FormRow label="Dönem" onPress={item ? undefined : () => setView("month")}>
              <View style={{ height: 44, paddingHorizontal: 16, borderRadius: radius.pill, justifyContent: "center", backgroundColor: inputBg, opacity: item ? 0.6 : 1 }}>
                <Txt style={{ fontSize: 16, fontWeight: "600", textTransform: "capitalize" }}>{monthLabel(month)}</Txt>
              </View>
            </FormRow>
          </FormSection>
          {!item && existingMonths.includes(month) ? (
            <View style={{ borderRadius: radius.md, backgroundColor: c.muted, paddingHorizontal: 16, paddingVertical: 12 }}>
              <Txt muted style={{ fontSize: 14, lineHeight: 20 }}>Bu ay için zaten bir bordro var. Kaydedersen üzerine yazılır.</Txt>
            </View>
          ) : null}

          <FormSection tone="muted" title="Ek mesai (saat)" footer={`Toplam: ${hrs(totalHours)}. Bordrodaki “Ek. Mes. %…” satırlarının saatlerini gir.`}>
            {ot.map((r, i) => (
              <View key={i} style={{ minHeight: 52, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16 }}>
                <Txt muted>%</Txt>
                <TextInput value={r.pct} onChangeText={(t) => mark(i, { pct: t.replace(/[^0-9.,]/g, "") })} keyboardType="decimal-pad" accessibilityLabel="Oran"
                  style={{ height: 44, width: 64, borderRadius: radius.pill, backgroundColor: inputBg, paddingHorizontal: 12, textAlign: "center", fontSize: 17, fontWeight: "600", color: c.foreground }} />
                <TextInput value={r.hours} onChangeText={(t) => mark(i, { hours: t.replace(/[^0-9.,]/g, "") })} keyboardType="decimal-pad" placeholder="0"
                  placeholderTextColor={alpha(c.mutedForeground, 0.5)} accessibilityLabel={`%${r.pct} mesai saati`}
                  style={{ flex: 1, minWidth: 0, height: 44, textAlign: "right", fontSize: 17, fontWeight: r.hours ? "600" : "400", color: c.foreground }} />
                <Txt muted style={{ fontSize: 15 }}>saat</Txt>
                <Pressable onPress={() => setOt(ot.filter((_, j) => j !== i))} accessibilityLabel="Satırı kaldır" style={{ width: 36, height: 36, alignItems: "center", justifyContent: "center" }}>
                  <X size={16} color={c.mutedForeground} />
                </Pressable>
              </View>
            ))}
            <Pressable onPress={() => setOt([...ot, { pct: "", hours: "" }])} style={({ pressed }) => ({ minHeight: 52, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, opacity: pressed ? 0.6 : 1 })}>
              <Plus size={16} color={c.primary} /><Txt style={{ fontSize: 15, fontWeight: "600", color: c.primary }}>Oran ekle</Txt>
            </Pressable>
          </FormSection>

          <FormSection tone="muted" title="Ek mesai tutarı">
            <NumberRow label="Net toplam" suffix="₺" placeholder="Örn. 9.494,73" hint="Ek mesai bölümünün net toplamı" value={amount} onChange={setAmount} />
          </FormSection>

          <FormSection tone="muted" title="Günler (isteğe bağlı)" footer="Bordrodaki satırın gün sayısı. Boş bırakılan satır karşılaştırılmaz.">
            <NumberRow label="Ücretsiz izin" suffix="gün" hint="Devamsızlık dahil" value={unpaid} onChange={setUnpaid} />
            <NumberRow label="Raporlu (ücretsiz)" suffix="gün" value={sickUnpaid} onChange={setSickUnpaid} />
            <NumberRow label="Raporlu (ödenecek)" suffix="gün" value={sickPaid} onChange={setSickPaid} />
            <NumberRow label="Ücretli / yıllık izin" suffix="gün" value={leave} onChange={setLeave} />
          </FormSection>

          <FormSection tone="muted" title="Ödeme (isteğe bağlı)">
            <NumberRow label="Özel kesintiler" suffix="₺" hint="BES, avans vb." value={special} onChange={setSpecial} />
            <NumberRow label="Net ödenen" suffix="₺" placeholder="Örn. 48.833,16" value={net} onChange={setNet} />
          </FormSection>
        </>
      )}
    </Sheet>
  );
}
