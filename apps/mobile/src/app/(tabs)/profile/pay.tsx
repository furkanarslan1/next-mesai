import { baseRate, goalProgress, hrs, money } from "@mesai/core/calc";
import { errorText } from "@mesai/core/errors";
import { parseNum } from "@mesai/core/num";
import type { Settings } from "@mesai/core/types";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Animated, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Skeleton } from "@/components/skeleton";
import { GrossNetDialog } from "@/components/gross-net";
import { FormSection, NumberRow, PercentRow, Segmented, SwitchRow } from "@/components/form";
import { toast } from "@/components/toast";
import { Button, Card, Screen, Txt } from "@/components/ui";
import { haptic } from "@/lib/haptics";
import { useToday } from "@/lib/now";
import { monthKey, mutate, useMonthEntries, useProfile, useSettings } from "@/lib/store";
import { alpha, radius, useColors } from "@/theme";

type Form = {
  monthly_salary: string; base_hourly_rate: string; sunday_rate: string; holiday_rate: string; included_overtime_hours: string;
  weekday_percent: number; sunday_percent: number; holiday_percent: number; sick_leave_unpaid: boolean; sick_deducts_overtime: boolean;
  goal_mode: Settings["goal_mode"]; monthly_goal_amount: string; monthly_goal_hours: string; payday: string;
};
/** Maaş günü 1-31 arası tam sayı; değilse boş (null) */
const paydayOf = (v: string) => { const d = Math.round(Number(v.replace(",", "."))); return d >= 1 && d <= 31 ? d : null; };
const str = (n: number) => (n > 0 ? String(n) : "");
const round2 = (n: number) => Math.round(n * 100) / 100;
const toForm = (s: Settings): Form => ({
  monthly_salary: str(s.monthly_salary), base_hourly_rate: str(round2(baseRate(s))),
  sunday_rate: str(s.sunday_rate), holiday_rate: str(s.holiday_rate), included_overtime_hours: str(s.included_overtime_hours),
  weekday_percent: s.weekday_percent, sunday_percent: s.sunday_percent, holiday_percent: s.holiday_percent, sick_leave_unpaid: s.sick_leave_unpaid, sick_deducts_overtime: s.sick_deducts_overtime,
  goal_mode: s.goal_mode, monthly_goal_amount: str(s.monthly_goal_amount), monthly_goal_hours: str(s.monthly_goal_hours),
  payday: s.payday ? String(s.payday) : "",
});
const back = { label: "Ayarlar", onPress: () => router.back() };

/** Ücret ve hedef: web'deki app/(app)/profile/pay/page.tsx'in aynısı. */
export default function PayScreen() {
  const settings = useSettings();
  if (!settings) return <Screen title="Ücret ve hedef" back={back}><Skeleton style={{ minHeight: 640 }} /></Screen>;
  return <PayForm settings={settings} />;
}

function PayForm({ settings }: { settings: Settings }) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const today = useToday();
  const entries = useMonthEntries(monthKey(today));
  const userId = useProfile()?.id ?? "";
  const [f, setF] = useState<Form>(() => toForm(settings));
  const [busy, setBusy] = useState(false);
  const [fixedOpen, setFixedOpen] = useState(false);
  const [grossOpen, setGrossOpen] = useState(false);
  const n = (v: string) => Math.max(0, parseNum(v) || 0);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((cur) => ({ ...cur, [k]: v }));

  const base = round2(n(f.base_hourly_rate));
  const next: Partial<Settings> = {
    monthly_salary: n(f.monthly_salary), base_hourly_rate: base > 0 ? base : null,
    // Eski alan hafta içi mesai ücretini tutar (eski ekranlar/yedekler için uyumluluk)
    hourly_rate: round2((base * f.weekday_percent) / 100),
    weekday_percent: f.weekday_percent, sunday_percent: f.sunday_percent, holiday_percent: f.holiday_percent,
    sunday_rate: n(f.sunday_rate), holiday_rate: n(f.holiday_rate),
    included_overtime_hours: Math.min(200, n(f.included_overtime_hours)), sick_leave_unpaid: f.sick_leave_unpaid,
    sick_deducts_overtime: f.sick_deducts_overtime,
    goal_mode: f.goal_mode, monthly_goal_amount: n(f.monthly_goal_amount), monthly_goal_hours: n(f.monthly_goal_hours),
    payday: paydayOf(f.payday),
  };
  // Karşılaştırma, kayıtlı ayarın aynı alanlara göre görünümüyle yapılır (eski kayıtta taban ücret türetilir)
  const current = toForm(settings);
  const saved: Partial<Settings> = {
    monthly_salary: n(current.monthly_salary), base_hourly_rate: n(current.base_hourly_rate) > 0 ? n(current.base_hourly_rate) : null,
    hourly_rate: settings.hourly_rate, weekday_percent: settings.weekday_percent, sunday_percent: settings.sunday_percent, holiday_percent: settings.holiday_percent,
    sunday_rate: settings.sunday_rate, holiday_rate: settings.holiday_rate, included_overtime_hours: settings.included_overtime_hours,
    sick_leave_unpaid: settings.sick_leave_unpaid, sick_deducts_overtime: settings.sick_deducts_overtime, goal_mode: settings.goal_mode, monthly_goal_amount: settings.monthly_goal_amount, monthly_goal_hours: settings.monthly_goal_hours,
    payday: settings.payday ?? null,
  };
  const dirty = (Object.keys(next) as (keyof Settings)[]).some((k) => k !== "hourly_rate" && next[k] !== saved[k]);
  // Kaydetmeden de özet canlı güncellensin
  const live: Settings = { ...settings, ...next };
  const g = goalProgress(entries ?? [], live);
  const rateText = (pct: number) => (base > 0 ? `${money((base * pct) / 100, live.currency)}/saat` : "-");

  // Kaydet çubuğu: değişiklik varken alttaki menünün hemen üstünde belirir (web: sticky, opacity + translate)
  const [bar] = useState(() => new Animated.Value(0));
  useEffect(() => { Animated.timing(bar, { toValue: dirty ? 1 : 0, duration: 200, useNativeDriver: true }).start(); }, [dirty, bar]);

  async function save() {
    setBusy(true);
    try {
      if (!userId) throw new Error("Hesap bilgileri yükleniyor, birkaç saniye sonra tekrar dene");
      // Maaş günü yalnızca değiştiyse gönderilir (sütun eklenmeden önceki sürümlerle de kayıt çalışsın)
      const { payday, ...rest } = next;
      await mutate.saveSettings(userId, payday !== saved.payday ? next : rest);
      haptic("success");
      toast.success("Kaydedildi");
    } catch (e) {
      toast.error(errorText(e, "Kaydedilemedi"));
    } finally { setBusy(false); }
  }

  const overlay = (
    <Animated.View pointerEvents={dirty ? "box-none" : "none"} accessibilityElementsHidden={!dirty}
      style={{ position: "absolute", left: 16, right: 16, bottom: 100 + insets.bottom, opacity: bar,
        transform: [{ translateY: bar.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] }}>
      <Button title="Değişiklikleri kaydet" size="xl" disabled={busy || !dirty} onPress={save}
        style={{ boxShadow: "0px 10px 15px -3px rgba(0,0,0,0.1), 0px 4px 6px -4px rgba(0,0,0,0.1)" }} />
    </Animated.View>
  );

  return (
    <Screen title="Ücret ve hedef" back={back} overlay={overlay}>
      <FormSection title="Maaş" footer="Bordrondaki sicil (net) maaşın. Maaşa dahil mesai yoksa boş bırak; örneğin maaşın 10,5 saat mesai içeriyorsa 10,5 yaz.">
        <NumberRow label="Aylık net maaş" suffix="₺" value={f.monthly_salary} onChange={(v) => set("monthly_salary", v)} />
        <Pressable onPress={() => { haptic(); setGrossOpen(true); }} accessibilityRole="button"
          style={{ minHeight: 52, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16 }}>
          <Txt style={{ fontSize: 15, fontWeight: "500", color: c.tint }}>Brütten nete hesapla</Txt>
          <Txt muted style={{ fontSize: 17 }}>›</Txt>
        </Pressable>
        <NumberRow label="Maaş günü" hint="Ayın kaçında yatıyor (özette geri sayım)" placeholder="Örn. 15"
          value={f.payday} onChange={(v) => set("payday", v.replace(/[^0-9]/g, "").slice(0, 2))} />
        <NumberRow label="Maaşa dahil mesai" suffix="saat" hint="Maaşın içerdiği mesai saati"
          value={f.included_overtime_hours} onChange={(v) => set("included_overtime_hours", v)} />
        <SwitchRow label="Raporlu günler maaştan düşer" hint="Bordroda “Raporlu (Ücretsiz)” varsa aç" value={f.sick_leave_unpaid} onChange={(v) => set("sick_leave_unpaid", v)} />
        <SwitchRow label="Raporlu günler mesaiden düşer" hint={`Her raporlu gün için ${hrs(settings.daily_hours)} mesaiden düşülür`}
          value={f.sick_deducts_overtime} onChange={(v) => set("sick_deducts_overtime", v)} />
      </FormSection>

      <FormSection title="Mesai ücreti"
        footer={`Hafta içi ${rateText(f.weekday_percent)} · Pazar ${rateText(f.sunday_percent)} · Resmi tatil ${rateText(f.holiday_percent)}. Maaşa dahil saatlerin üstü bu ücretlerle eklenir.`}>
        <NumberRow label="Saatlik ücret (%100)" suffix="₺" hint="Bordrodaki “Ek. Mes. %100” ücreti"
          value={f.base_hourly_rate} onChange={(v) => set("base_hourly_rate", v)} />
        <PercentRow label="Hafta içi mesai" value={f.weekday_percent} onChange={(v) => set("weekday_percent", v)} />
        <PercentRow label="Pazar mesaisi" value={f.sunday_percent} onChange={(v) => set("sunday_percent", v)} />
        <PercentRow label="Resmi tatil mesaisi" value={f.holiday_percent} onChange={(v) => set("holiday_percent", v)} />
      </FormSection>

      {/* Açılır bölüm (web: <details>) */}
      <View style={{ borderRadius: radius.lg, backgroundColor: c.card, overflow: "hidden" }}>
        <Pressable onPress={() => { haptic(); setFixedOpen(!fixedOpen); }} accessibilityRole="button" accessibilityState={{ expanded: fixedOpen }}
          style={{ minHeight: 52, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16 }}>
          <Txt style={{ fontSize: 15, fontWeight: "500" }}>Sabit saatlik ücretler (isteğe bağlı)</Txt>
          <Txt muted style={{ fontSize: 15, transform: [{ rotate: fixedOpen ? "90deg" : "0deg" }] }}>›</Txt>
        </Pressable>
        {fixedOpen ? (
          <View style={{ borderTopWidth: 1, borderTopColor: alpha(c.border, 0.6) }}>
            <NumberRow label="Pazar saatlik" suffix="₺" placeholder="Orandan hesapla" value={f.sunday_rate} onChange={(v) => set("sunday_rate", v)} />
            <View style={{ height: 1, backgroundColor: alpha(c.border, 0.6) }} />
            <NumberRow label="Resmi tatil saatlik" suffix="₺" placeholder="Orandan hesapla" value={f.holiday_rate} onChange={(v) => set("holiday_rate", v)} />
            <View style={{ height: 1, backgroundColor: alpha(c.border, 0.6) }} />
            <Txt muted style={{ paddingHorizontal: 16, paddingVertical: 12, fontSize: 12, lineHeight: 16 }}>Doldurursan o gün tipinde oran yerine bu sabit ücret kullanılır.</Txt>
          </View>
        ) : null}
      </View>

      <FormSection title="Aylık hedef">
        <View style={{ padding: 12 }}>
          <Segmented value={f.goal_mode} onChange={(m) => set("goal_mode", m)}
            options={[{ value: "amount", label: "Hedef maaş" }, { value: "hours", label: "Mesai saati" }]} />
        </View>
        {f.goal_mode === "amount"
          ? <NumberRow label="Toplam kazanç" suffix="₺" placeholder="Örn. 60000" hint="Maaş + mesai kazancı" value={f.monthly_goal_amount} onChange={(v) => set("monthly_goal_amount", v)} />
          : <NumberRow label="Mesai" suffix="saat" placeholder="Örn. 40" hint="Bu ay yapmak istediğin" value={f.monthly_goal_hours} onChange={(v) => set("monthly_goal_hours", v)} />}
      </FormSection>

      <Card style={{ padding: 16, gap: 12, marginBottom: dirty ? 64 : 0 }}>
        <Txt style={{ fontSize: 14, lineHeight: 20, fontWeight: "600" }}>Bu ay: %{g.percent.toFixed(0)} tamamlandı</Txt>
        <View style={{ height: 4, borderRadius: radius.pill, backgroundColor: c.muted, overflow: "hidden" }}>
          <View style={{ height: "100%", width: `${Math.max(0, Math.min(100, g.percent))}%`, backgroundColor: c.primary }} />
        </View>
        {g.set ? (
          g.mode === "hours"
            ? <Txt style={{ fontSize: 14, lineHeight: 20 }}>Yapılan: <Txt style={{ fontSize: 14, fontWeight: "700" }}>{hrs(g.done)}</Txt> / {hrs(g.goal)}</Txt>
            : <Txt style={{ fontSize: 14, lineHeight: 20 }}>Hedef için toplam mesai: <Txt style={{ fontSize: 14, fontWeight: "700" }}>{hrs(Math.round(g.hoursNeeded * 10) / 10)}</Txt></Txt>
        ) : <Txt muted style={{ fontSize: 14, lineHeight: 20 }}>Hedef belirlediğinde ilerleme burada görünür.</Txt>}
        <Txt muted style={{ fontSize: 14, lineHeight: 20 }}>
          Maaş {money(live.monthly_salary, live.currency)}{g.deduction > 0 ? ` − kesinti ${money(g.deduction, live.currency)}` : ""} + mesai {money(g.earned, live.currency)} = <Txt style={{ fontSize: 14, fontWeight: "700" }}>{money(g.income, live.currency)}</Txt>
        </Txt>
      </Card>
      <GrossNetDialog open={grossOpen} onClose={() => setGrossOpen(false)} today={today}
        onApply={(net) => { set("monthly_salary", String(net).replace(".", ",")); toast.success("Net maaş yazıldı, kaydetmeyi unutma"); }} />
    </Screen>
  );
}
