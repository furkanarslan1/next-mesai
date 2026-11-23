import { hrs, num } from "@mesai/core/calc";
import { errorText } from "@mesai/core/errors";
import { buildTimesheet, type Timesheet } from "@mesai/core/timesheet";
import { buildTimesheetSheet } from "@mesai/core/timesheet-sheet";
import type { Settings } from "@mesai/core/types";
import { addMonths, format, startOfMonth } from "date-fns";
import { tr } from "date-fns/locale";
import { router } from "expo-router";
import { ChevronLeft, ChevronRight, FileSpreadsheet, FileText } from "lucide-react-native";
import { useState } from "react";
import { ScrollView, View } from "react-native";
import { FormSection, SwitchRow } from "@/components/form";
import { toast } from "@/components/toast";
import { Button, Card, IconButton, Screen, Txt } from "@/components/ui";
import { esc, sharePdf, shareXlsx } from "@/lib/export";
import { monthKey, useMonthEntries, useProfile, useSettings } from "@/lib/store";
import { alpha, radius, useColors } from "@/theme";

const HEAD = ["Tarih", "Gün", "Giriş", "Çıkış", "Norm.", "Mesai", "Oran", "Ü.izin", "Üc.siz", "Rapor", "Gelm.", "Tatil"];
/** Sütun genişlikleri: web tablosunda ölçülen değerler (toplam 689px, son sütun "Durum / Not" 112px) */
const W = [71, 63, 40, 40, 48, 46, 42, 45, 49, 49, 45, 41];

/** Yazdırılabilir çizelge (web'deki yazdırma görünümü: A4 yatay, küçük punto) */
function timesheetHtml(ts: Timesheet, monthName: string, who: string, s: Settings) {
  const td = (v: string | number, bold = false) => `<td${bold ? ' style="font-weight:700"' : ""}>${esc(v)}</td>`;
  return `<html><head><meta charset="utf-8"><style>
    @page{size:A4 landscape;margin:10mm} body{font-family:-apple-system,system-ui,sans-serif;color:#111;font-size:8.5px}
    h1{font-size:14px;margin:0 0 2px;text-transform:capitalize} p{margin:0 0 8px;color:#444;font-size:10px}
    table{border-collapse:collapse;width:100%} th,td{border-top:1px solid #c9d0d7;padding:1.5px 3px;text-align:center} th{background:#eef1f4;text-transform:uppercase;color:#444}
    tr.off td{background:#f4f6f8;color:#666} td.l{text-align:left} tfoot td{font-weight:700;background:#eef1f4;border-top:2px solid #999}
    dl{display:grid;grid-template-columns:repeat(4,1fr);gap:4px 16px;font-size:10px;margin-top:10px} dt{color:#555} dd{margin:0;font-weight:600}
    .sig{display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:28px;font-size:10px;color:#555;text-align:center} .sig div{border-top:1px solid #999;padding-top:3px}
  </style></head><body>
    <h1>Aylık Çalışma Çizelgesi · ${esc(monthName)}</h1>
    <p>${who ? `Çalışan: <b>${esc(who)}</b> · ` : ""}Normal çalışma: ${s.work_start && s.work_end ? `${s.work_start.slice(0, 5)}–${s.work_end.slice(0, 5)}` : "-"} (${esc(hrs(s.daily_hours))}/gün)</p>
    <table><thead><tr>${HEAD.map((h) => `<th>${h}</th>`).join("")}<th style="text-align:left">Durum / Not</th></tr></thead><tbody>
    ${ts.rows.map((r) => `<tr${r.weekend || r.holiday ? ' class="off"' : ""}>${td(r.label)}<td class="l">${esc(r.dayName)}</td>${td(r.start || "-")}${td(r.end || "-")}${td(r.normalHours || 0)}${td(num(r.overtimeHours), r.overtimeHours > 0)}${td(r.percent ? `%${r.percent}` : "-")}${td(r.paidLeave)}${td(r.unpaidLeave)}${td(r.sick)}${td(r.absent)}${td(r.holiday)}<td class="l">${esc([r.status, r.note].filter(Boolean).join(" · "))}</td></tr>`).join("")}
    </tbody><tfoot><tr><td colspan="4">TOPLAM</td>${td(num(ts.totals.normalHours))}${td(num(ts.totals.overtimeHours))}<td>-</td>${td(ts.totals.paidLeave)}${td(ts.totals.unpaidLeave)}${td(ts.totals.sick)}${td(ts.totals.absent)}${td(ts.totals.holiday)}<td></td></tr></tfoot></table>
    <dl><div><dt>Normal çalışma günü</dt><dd>${ts.totals.normalDays}</dd></div><div><dt>Toplam mesai</dt><dd>${esc(hrs(ts.totals.overtimeHours))}</dd></div>
    ${ts.totals.sickDeductedHours > 0 ? `<div><dt>Rapor düşümü</dt><dd>−${esc(hrs(ts.totals.sickDeductedHours))}</dd></div>` : ""}
    <div><dt>Maaşa dahil mesai</dt><dd>${esc(hrs(ts.totals.includedHours))}</dd></div><div><dt>Ücretli mesai</dt><dd>${esc(hrs(ts.totals.paidOvertimeHours))}</dd></div>
    ${Object.entries(ts.totals.overtimeByPercent).sort((a, b) => Number(a[0]) - Number(b[0])).map(([p, h]) => `<div><dt>Ek mesai %${p}</dt><dd>${esc(hrs(h))}</dd></div>`).join("")}</dl>
    <div class="sig"><div>Çalışan imzası</div><div>Onay (İK / Yönetici)</div></div>
  </body></html>`;
}

/** Aylık çalışma çizelgesi: web'deki /reports/timesheet sayfasının aynısı (Excel ve PDF telefonda paylaşılır). */
export default function TimesheetScreen() {
  const c = useColors();
  const [month, setMonth] = useState(startOfMonth(new Date()));
  const [assume, setAssume] = useState(true);
  const [busy, setBusy] = useState(false);
  const profile = useProfile();
  const settings = useSettings();
  const entries = useMonthEntries(monthKey(month));
  const back = { label: "Raporlar", onPress: () => router.back() };
  if (!entries || !settings) return <Screen title="Çalışma çizelgesi" back={back}><Card style={{ minHeight: 448, opacity: 0.6 }} /></Screen>;

  const ts = buildTimesheet(month, entries, settings, { assumeWorkdays: assume });
  const monthName = format(month, "LLLL yyyy", { locale: tr });
  const who = profile?.full_name ?? "";
  const noSchedule = !settings.work_start || !settings.work_end;

  async function xlsx() {
    setBusy(true);
    try { const { data, options, fileName } = buildTimesheetSheet(ts, month, who); await shareXlsx(fileName, data, options); }
    catch (e) { toast.error(errorText(e, "Excel dosyası oluşturulamadı")); }
    finally { setBusy(false); }
  }
  async function pdf() {
    setBusy(true);
    try { await sharePdf(`calisma-cizelgesi-${format(month, "yyyy-MM")}.pdf`, timesheetHtml(ts, monthName, who, settings!), true); }
    catch (e) { toast.error(errorText(e, "PDF oluşturulamadı")); }
    finally { setBusy(false); }
  }
  const cell = (v: string | number, i: number, extra?: object) => (
    <Txt key={i} numberOfLines={1} style={[{ width: W[i], paddingHorizontal: 4, paddingVertical: 6, fontSize: 11, lineHeight: 16.5, textAlign: "center", fontVariant: ["tabular-nums"] }, extra]}>{v}</Txt>
  );

  return (
    <Screen title="Çalışma çizelgesi" back={back}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <IconButton label="Önceki ay" onPress={() => setMonth(addMonths(month, -1))}><ChevronLeft size={16} color={c.secondaryForeground} /></IconButton>
        <Txt style={{ fontSize: 18, lineHeight: 28, fontWeight: "700", textTransform: "capitalize" }}>{monthName}</Txt>
        <IconButton label="Sonraki ay" onPress={() => setMonth(addMonths(month, 1))}><ChevronRight size={16} color={c.secondaryForeground} /></IconButton>
      </View>

      <View style={{ gap: 16 }}>
        <FormSection footer="Uygulama her günün giriş/çıkışını ayrıca tutmaz: normal günlerde giriş/çıkış çalışma saatinden, mesai olan günlerde çıkış mesai kadar uzatılarak yazılır.">
          <SwitchRow label="Kayıtsız hafta içi günler normal çalışma sayılsın"
            hint={settings.saturday_off ?? true ? "Cumartesi, pazar ve resmi tatiller boş kalır" : "Pazar ve resmi tatiller boş kalır (cumartesi iş günü)"}
            value={assume} onChange={setAssume} />
        </FormSection>
        {noSchedule ? (
          <View style={{ borderRadius: radius.md, backgroundColor: c.muted, paddingHorizontal: 16, paddingVertical: 12 }}>
            <Txt muted style={{ fontSize: 14, lineHeight: 20 }}>Giriş/çıkış saatleri boş görünüyor. Profil sayfasında çalışma saatini kaydedersen çizelgede dolu çıkar.</Txt>
          </View>
        ) : null}
        <View style={{ flexDirection: "row", gap: 12 }}>
          <Button title="Excel (.xlsx)" size="xl" style={{ flex: 1 }} disabled={busy} icon={<FileSpreadsheet size={20} color={c.primaryForeground} />} onPress={xlsx} />
          <Button title="PDF" size="xl" variant="secondary" style={{ flex: 1 }} disabled={busy} icon={<FileText size={20} color={c.secondaryForeground} />} onPress={pdf} />
        </View>
        <Txt muted style={{ fontSize: 12, lineHeight: 16, textAlign: "center" }}>Dosya hazırlanınca paylaş menüsü açılır: Dosyalar&apos;a kaydedebilir ya da gönderebilirsin.</Txt>
      </View>

      <View style={{ borderRadius: radius.lg, backgroundColor: c.card, padding: 12 }} accessibilityLabel="Çalışma çizelgesi">
        <View style={{ marginBottom: 12, gap: 2 }}>
          <Txt style={{ fontSize: 18, lineHeight: 28, fontWeight: "700", textTransform: "capitalize" }}>Aylık Çalışma Çizelgesi · {monthName}</Txt>
          <Txt muted style={{ fontSize: 14, lineHeight: 20 }}>
            {who ? <>Çalışan: <Txt style={{ fontSize: 14, fontWeight: "700" }}>{who}</Txt> · </> : null}
            Normal çalışma: {settings.work_start && settings.work_end ? `${settings.work_start.slice(0, 5)}–${settings.work_end.slice(0, 5)}` : "-"} ({hrs(settings.daily_hours)}/gün)
          </Txt>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ minWidth: 689 }}>
            <View style={{ flexDirection: "row", backgroundColor: c.muted }}>
              {HEAD.map((h, i) => cell(h, i, { fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.3, color: c.mutedForeground }))}
              <Txt style={{ minWidth: 112, paddingHorizontal: 6, paddingVertical: 6, fontSize: 11, lineHeight: 16.5, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.3, color: c.mutedForeground }}>Durum / Not</Txt>
            </View>
            {ts.rows.map((r) => {
              const off = r.weekend || r.holiday;
              const tone = off ? { color: c.mutedForeground } : undefined;
              return (
                <View key={r.date} style={{ flexDirection: "row", borderTopWidth: 1, borderTopColor: alpha(c.border, 0.6), backgroundColor: off ? alpha(c.muted, 0.6) : "transparent" }}>
                  {cell(r.label, 0, tone)}
                  <Txt numberOfLines={1} style={[{ width: W[1], paddingHorizontal: 4, paddingVertical: 6, fontSize: 11, lineHeight: 16.5 }, tone]}>{r.dayName}</Txt>
                  {cell(r.start || "-", 2, tone)}{cell(r.end || "-", 3, tone)}{cell(r.normalHours || 0, 4, tone)}
                  {cell(num(r.overtimeHours), 5, r.overtimeHours > 0 ? { fontWeight: "700", color: c.foreground } : tone)}
                  {cell(r.percent ? `%${r.percent}` : "-", 6, tone)}
                  {cell(r.paidLeave, 7, tone)}{cell(r.unpaidLeave, 8, tone)}{cell(r.sick, 9, tone)}{cell(r.absent, 10, tone)}{cell(r.holiday, 11, tone)}
                  <Txt style={[{ minWidth: 112, maxWidth: 200, paddingHorizontal: 6, paddingVertical: 6, fontSize: 11, lineHeight: 16.5 }, tone]}>{[r.status, r.note].filter(Boolean).join(" · ")}</Txt>
                </View>
              );
            })}
            <View style={{ flexDirection: "row", borderTopWidth: 2, borderTopColor: c.border, backgroundColor: c.muted }}>
              <Txt style={{ width: W[0] + W[1] + W[2] + W[3], paddingVertical: 6, fontSize: 11, lineHeight: 16.5, fontWeight: "700", textAlign: "center" }}>TOPLAM</Txt>
              {cell(num(ts.totals.normalHours), 4, { fontWeight: "700" })}{cell(num(ts.totals.overtimeHours), 5, { fontWeight: "700" })}{cell("-", 6, { fontWeight: "700" })}
              {cell(ts.totals.paidLeave, 7, { fontWeight: "700" })}{cell(ts.totals.unpaidLeave, 8, { fontWeight: "700" })}{cell(ts.totals.sick, 9, { fontWeight: "700" })}
              {cell(ts.totals.absent, 10, { fontWeight: "700" })}{cell(ts.totals.holiday, 11, { fontWeight: "700" })}
              <View style={{ minWidth: 112 }} />
            </View>
          </View>
        </ScrollView>

        <View style={{ marginTop: 16, flexDirection: "row", flexWrap: "wrap", rowGap: 4 }}>
          {[
            ["Normal çalışma günü", String(ts.totals.normalDays)],
            ["Toplam mesai", hrs(ts.totals.overtimeHours)],
            ...(ts.totals.sickDeductedHours > 0 ? [["Rapor düşümü", `−${hrs(ts.totals.sickDeductedHours)}`]] : []),
            ["Maaşa dahil mesai", hrs(ts.totals.includedHours)],
            ["Ücretli mesai", hrs(ts.totals.paidOvertimeHours)],
            ...Object.entries(ts.totals.overtimeByPercent).sort((a, b) => Number(a[0]) - Number(b[0])).map(([p, h]) => [`Ek mesai %${p}`, hrs(h)]),
          ].map(([k, v], i) => (
            <View key={k} style={{ width: "50%", paddingRight: i % 2 === 0 ? 12 : 0, paddingLeft: i % 2 === 1 ? 12 : 0 }}>
              <Txt muted style={{ fontSize: 12, lineHeight: 16 }}>{k}</Txt>
              <Txt style={{ fontSize: 14, lineHeight: 20, fontWeight: "600", fontVariant: ["tabular-nums"] }}>{v}</Txt>
            </View>
          ))}
        </View>

        <View style={{ marginTop: 32, flexDirection: "row", gap: 40 }}>
          {["Çalışan imzası", "Onay (İK / Yönetici)"].map((t) => (
            <View key={t} style={{ flex: 1, borderTopWidth: 1, borderTopColor: alpha(c.foreground, 0.4), paddingTop: 4 }}>
              <Txt muted style={{ fontSize: 12, lineHeight: 16, textAlign: "center" }}>{t}</Txt>
            </View>
          ))}
        </View>
      </View>
    </Screen>
  );
}
