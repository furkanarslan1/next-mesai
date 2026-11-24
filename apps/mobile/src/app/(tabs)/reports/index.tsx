import { BADGES, earnedBadges, streaks } from "@mesai/core/badges";
import { goalProgress, hrs, levelFor, LEVELS, money, num } from "@mesai/core/calc";
import { toCSV } from "@mesai/core/csv";
import { errorText } from "@mesai/core/errors";
import { annualLeave, change, keyOf, lastMonths, leaveByTenure, monthStats, payslipCheck, projection } from "@mesai/core/reports";
import { periodMonths, periodRange, periodSummary, type Period } from "@mesai/core/period";
import type { Payslip, Settings } from "@mesai/core/types";
import { addMonths, format, parseISO, startOfMonth } from "date-fns";
import { tr } from "date-fns/locale";
import { router } from "expo-router";
import { AlertTriangle, ArrowDownRight, ArrowUpRight, Check, FileText, Minus, Plus, Table2 } from "lucide-react-native";
import { useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { AnimatedNumber } from "@/components/animated-number";
import { BadgeIcon } from "@/components/badge-icon";
import { LevelIcon } from "@/components/level-icon";
import { PayslipSheet } from "@/components/payslip-sheet";
import { SwipeRow } from "@/components/swipe-row";
import { toast } from "@/components/toast";
import { Button, Card, Screen, Txt } from "@/components/ui";
import { esc, shareCsv, sharePdf } from "@/lib/export";
import { haptic } from "@/lib/haptics";
import { useToday } from "@/lib/now";
import { mutate, useEntriesMap, usePayslips, useProfile, useSettings, useTotalHours } from "@/lib/store";
import { alpha, radius, useColors } from "@/theme";

/** Kart içi başlık (web: kart yazısı 14px, h2 font-semibold) */
const h2 = { fontSize: 14, lineHeight: 20, fontWeight: "600" as const };

function Delta({ cur: c, prev: p, fmt }: { cur: number; prev: number; fmt: (n: number) => string }) {
  const col = useColors();
  const { delta, pct } = change(c, p);
  const Icon = delta > 0 ? ArrowUpRight : delta < 0 ? ArrowDownRight : Minus;
  const color = delta > 0 ? "#009966" : delta < 0 ? col.destructive : col.mutedForeground;
  return (
    <View style={{ height: 24, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 2 }}>
      <Icon size={14} color={color} />
      <Txt style={{ fontSize: 12, lineHeight: 16, fontWeight: "500", color }}>{fmt(Math.abs(delta))}{pct !== null ? ` (%${Math.round(Math.abs(pct))})` : ""}</Txt>
    </View>
  );
}

function Progress({ value }: { value: number }) {
  const c = useColors();
  return (
    <View style={{ height: 4, borderRadius: radius.pill, backgroundColor: c.muted, overflow: "hidden" }}>
      <View style={{ height: "100%", width: `${Math.max(0, Math.min(100, value))}%`, backgroundColor: c.primary }} />
    </View>
  );
}

export default function ReportsScreen() {
  const settings = useSettings();
  if (!settings) return <Screen title="Raporlar"><Card style={{ minHeight: 448, opacity: 0.6 }} /></Screen>;
  return <ReportsView settings={settings} />;
}

/** Raporlar: web'deki app/(app)/reports/page.tsx'in birebir aynısı. */
function ReportsView({ settings }: { settings: Settings }) {
  const c = useColors();
  const today = useToday();
  const profile = useProfile();
  const userId = profile?.id ?? "";
  const payslips = usePayslips();
  const totalHours = useTotalHours() ?? 0;
  const cur = settings.currency;
  const [metric, setMetric] = useState<"hours" | "income">("hours");
  const [period, setPeriod] = useState<Period>("month");
  const [segW, setSegW] = useState(0);
  const [sheet, setSheet] = useState<{ item: Payslip | null; del?: boolean } | null>(null);

  // Grafik için son 6 ay, yıllık özet/izin için yılın tüm ayları, bordrolu aylar
  const six = lastMonths(today, 6);
  const year = today.getFullYear();
  const yearMonths = Array.from({ length: today.getMonth() + 1 }, (_, i) => new Date(year, i, 1));
  const slipKeys = (payslips ?? []).map((p) => p.month.slice(0, 7));
  const fullYear = Array.from({ length: 12 }, (_, i) => new Date(year, i, 1));
  // Özetteki hafta önceki/sonraki yıla taşabilir: o aylar da okunur
  const weekMonths = periodMonths(periodRange("week", today));
  const keys = [...new Set([...six.map(keyOf), ...fullYear.map(keyOf), ...slipKeys, ...weekMonths])];
  const byMonth = useEntriesMap(keys);
  // Kaydı olmayan ay "veri yok" sayılır (uygulama kullanılmadan önceki aylar tam maaş gibi görünmesin)
  const ZERO = { hours: 0, earned: 0, deduction: 0, absentDays: 0, salaryNet: 0, income: 0, workDays: 0 };
  const statsOf = (k: string) => ((byMonth[k]?.length ?? 0) > 0 ? monthStats(byMonth[k], settings) : ZERO);

  const series = six.map((d) => ({ d, key: keyOf(d), s: statsOf(keyOf(d)) }));
  const value = (s: ReturnType<typeof monthStats>) => (metric === "hours" ? s.hours : s.income);
  const max = Math.max(1, ...series.map((x) => value(x.s)));
  const curStats = statsOf(keyOf(today));
  const prevStats = statsOf(keyOf(addMonths(startOfMonth(today), -1)));

  const ytd = yearMonths.map((d) => ({ d, s: statsOf(keyOf(d)) }));
  const ytdHours = ytd.reduce((a, x) => a + x.s.hours, 0);
  const ytdIncome = ytd.reduce((a, x) => a + x.s.income, 0);
  const activeMonths = ytd.filter((x) => (byMonth[keyOf(x.d)]?.length ?? 0) > 0).length;
  const best = ytd.reduce((b, x) => (x.s.hours > b.s.hours ? x : b), ytd[0]);

  const leave = annualLeave(byMonth, year, settings.annual_leave_days);
  const [leaveInput, setLeaveInput] = useState(String(settings.annual_leave_days));
  const earned = earnedBadges(byMonth, settings, totalHours, today);
  const st = streaks(Object.values(byMonth).flat(), today);
  const lvl = levelFor(totalHours);
  // Özet: seçili dönem (hafta pazartesi başlar); hedef yalnızca "Bu ay"da gösterilir
  const ps = periodSummary(byMonth, settings, periodRange(period, today));
  const monthEntries = byMonth[keyOf(today)] ?? [];
  const goal = goalProgress(monthEntries, settings);
  const pr = projection(monthEntries, settings, today);
  const okColor = "#009966";

  async function saveLeave() {
    const n = Math.round(Number(leaveInput));
    if (!(n >= 0 && n <= 60) || !userId) return;
    try { await mutate.saveSettings(userId, { annual_leave_days: n }); haptic("success"); toast.success("Yıllık izin hakkı kaydedildi"); }
    catch (e) { toast.error(errorText(e, "Kaydedilemedi")); }
  }
  async function exportCsv() {
    const rows = ytd.map(({ d, s }) => ({ ay: format(d, "yyyy-MM"), mesai_saat: s.hours, mesai_kazanc: Math.round(s.earned), maas_kesinti: Math.round(s.deduction), toplam_gelir: Math.round(s.income), mesai_gunu: s.workDays }));
    try { await shareCsv(`rapor-${year}.csv`, toCSV(rows)); } catch (e) { toast.error(errorText(e, "CSV oluşturulamadı")); }
  }
  async function exportPdf() {
    const cell = (v: string | number) => `<td>${esc(v)}</td>`;
    const html = `<html><head><meta charset="utf-8"><style>
      body{font-family:-apple-system,system-ui,sans-serif;color:#111;padding:24px} h1{font-size:22px;margin:0 0 4px} h2{font-size:15px;margin:22px 0 8px}
      p{margin:2px 0;color:#444;font-size:12px} table{border-collapse:collapse;width:100%;font-size:12px} td,th{border:1px solid #c9d0d7;padding:5px 7px;text-align:center} th{background:#eef1f4}
    </style></head><body>
      <h1>Mesai raporu · ${year}</h1><p>${esc(profile?.full_name ?? "")} · ${esc(format(today, "d MMMM yyyy", { locale: tr }))}</p>
      <h2>Bu ay · geçen aya göre</h2><table><tr><th></th><th>Bu ay</th><th>Geçen ay</th></tr>
        <tr><th>Mesai saati</th>${cell(hrs(curStats.hours))}${cell(hrs(prevStats.hours))}</tr>
        <tr><th>Toplam gelir</th>${cell(money(curStats.income, cur))}${cell(money(prevStats.income, cur))}</tr></table>
      <h2>${year} yılı</h2><table><tr><th>Ay</th><th>Mesai</th><th>Mesai kazancı</th><th>Kesinti</th><th>Toplam gelir</th><th>Mesai günü</th></tr>
        ${ytd.map(({ d, s }) => `<tr>${cell(format(d, "LLLL", { locale: tr }))}${cell(hrs(s.hours))}${cell(money(s.earned, cur))}${cell(money(s.deduction, cur))}${cell(money(s.income, cur))}${cell(s.workDays)}</tr>`).join("")}
        <tr><th>Toplam</th>${cell(hrs(ytdHours))}<td></td><td></td>${cell(money(ytdIncome, cur))}<td></td></tr></table>
      <h2>Yıllık izin</h2><p>${leave.used} / ${settings.annual_leave_days} gün kullanıldı · ${leave.left} gün kaldı</p>
      <h2>Seviye</h2><p>Seviye ${lvl.level} · ${esc(lvl.name)} · toplam ${esc(hrs(totalHours))}</p>
    </body></html>`;
    try { await sharePdf(`rapor-${year}.pdf`, html); } catch (e) { toast.error(errorText(e, "PDF oluşturulamadı")); }
  }

  const slipMonths = lastMonths(today, 12).reverse();
  const tile = { flex: 1, borderRadius: radius.md, backgroundColor: c.muted, alignItems: "center" as const };

  return (
    <Screen title="Raporlar" actions={(
      <>
        <Button title="CSV" size="sm" variant="secondary" onPress={exportCsv} />
        <Button title="PDF" size="sm" variant="secondary" icon={<FileText size={16} color={c.secondaryForeground} />} onPress={exportPdf} />
      </>
    )}>
      {/* Özet: bu hafta / bu ay / bu yıl */}
      <Card style={{ paddingVertical: 16, paddingHorizontal: 16, gap: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <Txt style={h2}>Özet</Txt>
          <View accessibilityRole="radiogroup" style={{ flexDirection: "row", gap: 4, borderRadius: radius.pill, backgroundColor: c.muted, padding: 4 }}>
            {(["week", "month", "year"] as const).map((p) => (
              <Pressable key={p} accessibilityRole="radio" accessibilityState={{ selected: period === p }} onPress={() => { haptic(); setPeriod(p); }}
                // Web: grid-cols-3, üç sekme en genişi kadar eşit
                onLayout={(e) => { const w = Math.ceil(e.nativeEvent.layout.width); setSegW((cur) => Math.max(cur, w)); }}
                style={{ minWidth: segW || undefined, alignItems: "center", borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: period === p ? c.primary : "transparent" }}>
                <Txt style={{ fontSize: 12, lineHeight: 16, fontWeight: "600", color: period === p ? c.primaryForeground : c.mutedForeground }}>
                  {p === "week" ? "Bu hafta" : p === "month" ? "Bu ay" : "Bu yıl"}
                </Txt>
              </Pressable>
            ))}
          </View>
        </View>
        <View style={{ flexDirection: "row", gap: 12 }}>
          <View style={[tile, { paddingHorizontal: 12, paddingVertical: 12 }]}>
            <Txt muted style={{ fontSize: 12, lineHeight: 16 }}>Mesai</Txt>
            <AnimatedNumber value={ps.hours} format={hrs} numberOfLines={1} adjustsFontSizeToFit style={{ fontSize: 20, lineHeight: 28, fontWeight: "700" }} />
            <Txt muted style={{ fontSize: 12, lineHeight: 16 }}>{ps.workDays} gün çalışıldı</Txt>
          </View>
          <View style={[tile, { paddingHorizontal: 12, paddingVertical: 12 }]}>
            <Txt muted style={{ fontSize: 12, lineHeight: 16 }}>Mesai kazancı</Txt>
            <AnimatedNumber value={ps.earned} format={(n) => money(n, cur)} numberOfLines={1} adjustsFontSizeToFit style={{ fontSize: 20, lineHeight: 28, fontWeight: "700" }} />
            <Txt muted style={{ fontSize: 12, lineHeight: 16, textTransform: period === "month" ? "capitalize" : "none" }}>
              {period === "week" ? "Pazartesi–pazar" : period === "month" ? format(today, "LLLL", { locale: tr }) : year}
            </Txt>
          </View>
        </View>
        {period === "month" ? (
          goal.set ? (
            <View style={{ borderRadius: radius.md, backgroundColor: c.muted, paddingHorizontal: 16, paddingVertical: 12 }}>
              <Txt style={{ fontSize: 14, lineHeight: 20, fontWeight: "600" }}>{goal.mode === "hours" ? `Hedef ${hrs(goal.goal)} mesai` : `Hedef ${money(goal.goal, cur)}`}</Txt>
              <Txt muted style={{ fontSize: 14, lineHeight: 20, fontVariant: ["tabular-nums"] }}>
                {goal.mode === "hours" ? `${hrs(goal.done)} yapıldı` : `${money(goal.income, cur)} kazanıldı`}
                {" · "}
                {pr.reached ? <Txt style={{ fontSize: 14, fontWeight: "600", color: c.tint }}>Tamamlandı</Txt>
                  : goal.mode === "hours" ? `${hrs(Math.max(0, goal.goal - goal.done))} kaldı` : `${money(Math.max(0, goal.goal - goal.income), cur)} kaldı`}
              </Txt>
              {!pr.reached && pr.neededHours > 0 ? (
                <Txt muted style={{ fontSize: 14, lineHeight: 20, fontVariant: ["tabular-nums"] }}>
                  Hedef için {hrs(Math.round(pr.neededHours * 10) / 10)} mesai daha{pr.remaining > 0 ? `, günde ~${hrs(Math.round(pr.perDay * 10) / 10)} (kalan ${pr.remaining} gün)` : ""}
                </Txt>
              ) : null}
            </View>
          ) : (
            <View style={{ borderRadius: radius.md, backgroundColor: c.muted, paddingHorizontal: 16, paddingVertical: 12 }}>
              <Txt muted style={{ fontSize: 14, lineHeight: 20 }}>Ana sayfadan aylık hedef belirlersen kaç saat mesai daha gerektiği burada görünür.</Txt>
            </View>
          )
        ) : null}
        <View style={{ flexDirection: "row", flexWrap: "wrap", rowGap: 8 }}>
          {([
            ["Ücretli izin", ps.paidLeave], ["Ücretsiz izin", ps.unpaidLeave], ["Raporlu", ps.sick],
            ["Gelmedi", ps.absent], ["Resmi tatil", ps.holiday], ["Çalışılan gün", ps.workDays],
          ] as const).map(([k, v], i) => (
            <View key={k} style={{ width: "50%", flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: 8, paddingRight: i % 2 === 0 ? 12 : 0, paddingLeft: i % 2 === 1 ? 12 : 0 }}>
              <Txt muted style={{ fontSize: 14, lineHeight: 20 }}>{k}</Txt>
              <Txt style={{ fontSize: 14, lineHeight: 20, fontWeight: "600", fontVariant: ["tabular-nums"] }}>{v} gün</Txt>
            </View>
          ))}
        </View>
      </Card>

      {/* Aylık çalışma çizelgesi */}
      <Pressable onPress={() => router.push("/reports/timesheet")}
        style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 14, borderRadius: radius.lg, paddingHorizontal: 16, paddingVertical: 14,
          backgroundColor: pressed ? alpha(c.muted, 1) : c.card, boxShadow: c.shadow.card })}>
        <View style={{ width: 30, height: 30, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: c.teal }}>
          <Table2 size={18} color="#fff" />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Txt style={{ fontSize: 17, lineHeight: 25.5, fontWeight: "600" }}>Aylık çalışma çizelgesi</Txt>
          <Txt muted style={{ fontSize: 13, lineHeight: 24 }}>Gün gün giriş-çıkış · Excel ve PDF</Txt>
        </View>
        <Txt style={{ fontSize: 20, color: alpha(c.mutedForeground, 0.6) }}>›</Txt>
      </Pressable>

      {/* Bu ay · geçen aya göre */}
      <Card style={{ paddingVertical: 16, paddingHorizontal: 16, gap: 16 }}>
        <Txt style={h2}>Bu ay · geçen aya göre</Txt>
        <View style={{ flexDirection: "row", gap: 12 }}>
          {[
            { label: "Mesai saati", v: hrs(curStats.hours), d: <Delta cur={curStats.hours} prev={prevStats.hours} fmt={hrs} /> },
            { label: "Toplam gelir", v: money(curStats.income, cur), d: <Delta cur={curStats.income} prev={prevStats.income} fmt={(n) => money(n, cur)} /> },
          ].map((t) => (
            <View key={t.label} style={[tile, { paddingHorizontal: 12, paddingVertical: 12 }]}>
              <Txt muted style={{ fontSize: 12, lineHeight: 16 }}>{t.label}</Txt>
              <Txt numberOfLines={1} adjustsFontSizeToFit style={{ fontSize: 20, lineHeight: 28, fontWeight: "700", fontVariant: ["tabular-nums"] }}>{t.v}</Txt>
              {t.d}
            </View>
          ))}
        </View>
      </Card>

      {/* Son 6 ay */}
      <Card style={{ paddingVertical: 16, paddingHorizontal: 16, gap: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <Txt style={h2}>Son 6 ay</Txt>
          <View accessibilityRole="radiogroup" style={{ flexDirection: "row", gap: 4, borderRadius: radius.pill, backgroundColor: c.muted, padding: 4 }}>
            {(["hours", "income"] as const).map((m) => (
              <Pressable key={m} accessibilityRole="radio" accessibilityState={{ selected: metric === m }} onPress={() => { haptic(); setMetric(m); }}
                style={{ borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: metric === m ? c.primary : "transparent" }}>
                <Txt style={{ fontSize: 12, lineHeight: 16, fontWeight: "600", color: metric === m ? c.primaryForeground : c.mutedForeground }}>{m === "hours" ? "Mesai" : "Gelir"}</Txt>
              </Pressable>
            ))}
          </View>
        </View>
        <View style={{ height: 176, flexDirection: "row", alignItems: "flex-end", gap: 10 }} accessibilityLabel="Aylara göre grafik">
          {series.map(({ d, key, s }) => {
            const v = value(s);
            const isCur = key === keyOf(today);
            return (
              <View key={key} style={{ flex: 1, height: "100%", alignItems: "center", justifyContent: "flex-end", gap: 6 }}>
                <Txt muted style={{ fontSize: 10, lineHeight: 15, fontWeight: "600", fontVariant: ["tabular-nums"] }}>{v > 0 ? (metric === "hours" ? num(+v.toFixed(1)) : `${Math.round(v / 1000)}b`) : ""}</Txt>
                <View style={{ width: "100%", flexShrink: 1, borderTopLeftRadius: 28, borderTopRightRadius: 28, height: `${Math.max(v > 0 ? 6 : 2, (v / max) * 100)}%`, backgroundColor: isCur ? c.teal : alpha(c.teal, 0.38) }} />
                <Txt muted style={{ fontSize: 11, lineHeight: 16.5, textTransform: "capitalize" }}>{format(d, "LLL", { locale: tr })}</Txt>
              </View>
            );
          })}
        </View>
      </Card>

      {/* Yıl özeti */}
      <Card style={{ paddingVertical: 16, paddingHorizontal: 16, gap: 12 }}>
        <Txt style={h2}>{year} yılı özeti</Txt>
        <View style={{ flexDirection: "row", gap: 10 }}>
          {[
            { label: "Toplam mesai", v: hrs(ytdHours) },
            { label: "Toplam gelir", v: money(ytdIncome, cur) },
            { label: "Aylık ortalama", v: money(activeMonths ? ytdIncome / activeMonths : 0, cur) },
          ].map((t) => (
            <View key={t.label} style={[tile, { paddingHorizontal: 8, paddingVertical: 12 }]}>
              <Txt numberOfLines={1} adjustsFontSizeToFit style={{ fontSize: 16, lineHeight: 20, fontWeight: "700", fontVariant: ["tabular-nums"] }}>{t.v}</Txt>
              <Txt muted style={{ marginTop: 4, fontSize: 11, lineHeight: 16.5 }}>{t.label}</Txt>
            </View>
          ))}
        </View>
        {best && best.s.hours > 0 ? (
          <Txt muted style={{ fontSize: 12, lineHeight: 16, textAlign: "center" }}>
            En yoğun ay: <Txt style={{ fontSize: 12, fontWeight: "700", textTransform: "capitalize" }}>{format(best.d, "LLLL", { locale: tr })}</Txt> ({hrs(best.s.hours)})
          </Txt>
        ) : null}
      </Card>

      {/* Yıllık izin */}
      <Card style={{ paddingVertical: 16, paddingHorizontal: 16, gap: 12 }}>
        <Txt style={h2}>Yıllık izin</Txt>
        <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" }}>
          <Txt style={{ fontSize: 36, lineHeight: 40, fontWeight: "700", fontVariant: ["tabular-nums"] }}>
            {leave.left}<Txt muted style={{ fontSize: 16, fontWeight: "500" }}> gün kaldı</Txt>
          </Txt>
          <Txt muted style={{ fontSize: 14, fontVariant: ["tabular-nums"] }}>{leave.used} / {settings.annual_leave_days} kullanıldı</Txt>
        </View>
        <Progress value={settings.annual_leave_days > 0 ? (leave.used / settings.annual_leave_days) * 100 : 0} />
        {leave.over > 0 ? <Txt style={{ fontSize: 12, lineHeight: 16, color: c.destructive }}>Hakkını {leave.over} gün aştın.</Txt> : null}
        <Txt muted style={{ fontSize: 12, lineHeight: 16 }}>Takvimde &quot;Ücretli izin&quot; olarak işaretlediğin günler (ileriye planladıkların dahil) sayılır.</Txt>
        <View style={{ flexDirection: "row", gap: 8, alignItems: "flex-start" }}>
          <TextInput value={leaveInput} onChangeText={(t) => setLeaveInput(t.replace(/\D/g, "").slice(0, 2))} keyboardType="number-pad" accessibilityLabel="Yıllık izin hakkı (gün)"
            style={{ flex: 1, height: 44, borderRadius: radius.md, backgroundColor: c.muted, paddingHorizontal: 16, fontSize: 16, color: c.foreground }} />
          <Button title="Hakkı kaydet" variant="secondary" onPress={saveLeave}
            disabled={leaveInput === "" || Number(leaveInput) > 60 || Number(leaveInput) === settings.annual_leave_days} />
        </View>
        <Txt muted style={{ fontSize: 12, lineHeight: 16 }}>Yasal asgari hak: 1–5 yıl {leaveByTenure(1)} gün, 5–15 yıl {leaveByTenure(5)} gün, 15 yıl ve üzeri {leaveByTenure(15)} gün.</Txt>
      </Card>

      {/* Bordro kontrolü */}
      <Card style={{ paddingVertical: 16, paddingHorizontal: 16, gap: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Txt style={h2}>Bordro kontrolü</Txt>
            <Txt muted style={{ fontSize: 12, lineHeight: 16 }}>Bordrodaki mesai, uygulamanın hesabıyla aynı mı?</Txt>
          </View>
          <Button title="Ekle" size="sm" disabled={!userId} icon={<Plus size={16} color={c.primaryForeground} />} onPress={() => setSheet({ item: null })} />
        </View>
        {payslips === null ? <Card size="lg" style={{ height: 64, opacity: 0.6 }} /> : null}
        {payslips?.length === 0 ? (
          <View style={{ borderRadius: radius.lg, backgroundColor: c.muted, paddingHorizontal: 16, paddingVertical: 16 }}>
            <Txt muted style={{ fontSize: 14, lineHeight: 20, textAlign: "center" }}>Henüz bordro eklemedin.</Txt>
          </View>
        ) : null}
        {(payslips ?? []).map((p) => {
          const chk = payslipCheck(p, byMonth[p.month.slice(0, 7)] ?? [], settings);
          const tone = chk.issues === 0 ? okColor : c.destructive;
          return (
            <SwipeRow key={p.id} style={{ borderRadius: radius.lg }} bg={c.muted} onDelete={() => setSheet({ item: p, del: true })} onPress={() => setSheet({ item: p })}>
              <View style={{ gap: 8, paddingHorizontal: 16, paddingVertical: 12 }}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  <Txt style={{ fontSize: 14, fontWeight: "600", textTransform: "capitalize" }}>{format(parseISO(p.month), "LLLL yyyy", { locale: tr })}</Txt>
                  <Txt style={{ fontSize: 14, fontWeight: "600", color: tone }}>{chk.issues === 0 ? "Uyumlu" : `${chk.issues} fark var`}</Txt>
                </View>
                <View style={{ gap: 4 }}>
                  {chk.rows.map((r) => (
                    <View key={r.key} style={{ flexDirection: "row", alignItems: "flex-start", gap: 6 }}>
                      <View style={{ marginTop: 2 }}>{r.ok ? <Check size={14} color={okColor} /> : <AlertTriangle size={14} color={c.destructive} />}</View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Txt style={{ fontSize: 12, lineHeight: 16, fontWeight: "500" }}>{r.label}</Txt>
                        <Txt muted style={{ fontSize: 12, lineHeight: 16, fontVariant: ["tabular-nums"] }}>Bordro {r.bordro} · Uygulama {r.app}</Txt>
                        {r.note ? <Txt style={{ fontSize: 12, lineHeight: 16, color: c.destructive }}>{r.note}</Txt> : null}
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            </SwipeRow>
          );
        })}
        <Txt muted style={{ fontSize: 12, lineHeight: 16 }}>Silmek için bordroyu sola kaydır. Tutarlar net esaslı karşılaştırılır (saatlik ücretini bordrodaki net ücretle girdiysen). Küçük farklar (çeyrek saat, gün kesri, birkaç TL) yok sayılır.</Txt>
      </Card>

      {/* Başarılar */}
      <Card style={{ paddingVertical: 16, paddingHorizontal: 16, gap: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
          <Txt style={h2}>Başarılar</Txt>
          <Txt muted style={{ flexShrink: 1, fontSize: 12, lineHeight: 16 }}>{earned.size} / {BADGES.length} · seri {st.current} gün (en iyi {st.best})</Txt>
        </View>
        {Array.from({ length: Math.ceil(BADGES.length / 3) }, (_, i) => BADGES.slice(i * 3, i * 3 + 3)).map((row, i) => (
          <View key={i} style={{ flexDirection: "row", gap: 12 }}>
            {row.map((b) => (
              <View key={b.key} style={{ flex: 1, alignItems: "center", gap: 6 }}>
                <BadgeIcon badge={b.key} earned={earned.has(b.key)} />
                <Txt style={{ fontSize: 12, lineHeight: 15, fontWeight: "600", textAlign: "center", color: earned.has(b.key) ? c.foreground : c.mutedForeground }}>{b.title}</Txt>
                {!earned.has(b.key) ? <Txt muted style={{ fontSize: 10, lineHeight: 12.5, textAlign: "center" }}>{b.hint}</Txt> : null}
              </View>
            ))}
            {Array.from({ length: 3 - row.length }).map((_, j) => <View key={`e${j}`} style={{ flex: 1 }} />)}
          </View>
        ))}
      </Card>

      {/* Seviye */}
      <Card style={{ paddingVertical: 16, paddingHorizontal: 16, gap: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <LevelIcon level={lvl.level} size={48} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Txt style={h2}>Seviye {lvl.level} · {lvl.name}</Txt>
            <Txt muted style={{ fontSize: 12, lineHeight: 16 }}>{lvl.next ? `${lvl.next.name} için ${hrs(lvl.toNext)} kaldı` : "En yüksek seviyedesin"} · toplam {hrs(totalHours)}</Txt>
          </View>
        </View>
        <Progress value={lvl.progress} />
        {[LEVELS.slice(0, 3), LEVELS.slice(3)].map((row, ri) => (
          <View key={ri} style={{ flexDirection: "row", gap: 8 }}>
            {row.map((l, j) => {
              const i = ri * 3 + j;
              return (
                <View key={l.name} style={{ flex: 1, alignItems: "center", gap: 4, opacity: i + 1 <= lvl.level ? 1 : 0.4, filter: i + 1 <= lvl.level ? undefined : "grayscale(1)" }}>
                  <LevelIcon level={i + 1} size={36} />
                  <Txt style={{ fontSize: 11, lineHeight: 13.75, fontWeight: "600", textAlign: "center" }}>{l.name}</Txt>
                  <Txt muted style={{ fontSize: 10, lineHeight: 15 }}>{l.min} sa</Txt>
                </View>
              );
            })}
          </View>
        ))}
      </Card>

      {sheet && userId ? (
        <PayslipSheet key={`${sheet.item?.id ?? "new"}${sheet.del ? "-del" : ""}`} userId={userId} months={slipMonths} item={sheet.item} startInDelete={sheet.del}
          existingMonths={slipKeys} settings={settings} defaultMonth={keyOf(addMonths(startOfMonth(today), -1))} onClose={() => setSheet(null)} />
      ) : null}
    </Screen>
  );
}
