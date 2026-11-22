"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useToday } from "@/lib/now";
import { errorText } from "@/lib/errors";
import { mutate, useProfile, useSettings, useMonthEntries, monthKey, useTotalHours } from "@/lib/store";
import { baseRate, goalProgress, hrs, levelFor, LEVELS, money } from "@/lib/calc";
import type { Settings } from "@/lib/types";
import { FormSection, NumberRow, PercentRow, Segmented, SwitchRow } from "@/components/mesai/ios-form";
import { LevelIcon } from "@/components/mesai/level-icon";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

type Form = {
  monthly_salary: string; base_hourly_rate: string; sunday_rate: string; holiday_rate: string; included_overtime_hours: string;
  weekday_percent: number; sunday_percent: number; holiday_percent: number; sick_leave_unpaid: boolean;
  goal_mode: Settings["goal_mode"]; monthly_goal_amount: string; monthly_goal_hours: string;
};
const str = (n: number) => (n > 0 ? String(n) : "");
const round2 = (n: number) => Math.round(n * 100) / 100;
const toForm = (s: Settings): Form => ({
  monthly_salary: str(s.monthly_salary), base_hourly_rate: str(round2(baseRate(s))),
  sunday_rate: str(s.sunday_rate), holiday_rate: str(s.holiday_rate), included_overtime_hours: str(s.included_overtime_hours),
  weekday_percent: s.weekday_percent, sunday_percent: s.sunday_percent, holiday_percent: s.holiday_percent, sick_leave_unpaid: s.sick_leave_unpaid,
  goal_mode: s.goal_mode, monthly_goal_amount: str(s.monthly_goal_amount), monthly_goal_hours: str(s.monthly_goal_hours),
});

export default function GoalPage() {
  const settings = useSettings();
  const today = useToday();
  if (!settings || !today) return <div className="glass min-h-[40rem] w-full animate-pulse" aria-busy />;
  return <GoalView settings={settings} today={today} />;
}

function GoalView({ settings, today }: { settings: Settings; today: Date }) {
  const entries = useMonthEntries(monthKey(today));
  const totalHours = useTotalHours() ?? 0;
  const userId = useProfile()?.id ?? "";
  const [f, setF] = useState<Form>(() => toForm(settings));
  const [busy, setBusy] = useState(false);
  const n = (v: string) => Math.max(0, parseFloat(v.replace(",", ".")) || 0);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((cur) => ({ ...cur, [k]: v }));

  const base = round2(n(f.base_hourly_rate));
  const next: Partial<Settings> = {
    monthly_salary: n(f.monthly_salary), base_hourly_rate: base > 0 ? base : null,
    // Eski alan hafta içi mesai ücretini tutar (eski ekranlar/yedekler için uyumluluk)
    hourly_rate: round2((base * f.weekday_percent) / 100),
    weekday_percent: f.weekday_percent, sunday_percent: f.sunday_percent, holiday_percent: f.holiday_percent,
    sunday_rate: n(f.sunday_rate), holiday_rate: n(f.holiday_rate),
    included_overtime_hours: Math.min(200, n(f.included_overtime_hours)), sick_leave_unpaid: f.sick_leave_unpaid,
    goal_mode: f.goal_mode, monthly_goal_amount: n(f.monthly_goal_amount), monthly_goal_hours: n(f.monthly_goal_hours),
  };
  // Karşılaştırma, kayıtlı ayarın aynı alanlara göre görünümüyle yapılır (eski kayıtta taban ücret türetilir)
  const current = toForm(settings);
  const saved: Partial<Settings> = {
    monthly_salary: n(current.monthly_salary), base_hourly_rate: n(current.base_hourly_rate) > 0 ? n(current.base_hourly_rate) : null,
    hourly_rate: settings.hourly_rate, weekday_percent: settings.weekday_percent, sunday_percent: settings.sunday_percent, holiday_percent: settings.holiday_percent,
    sunday_rate: settings.sunday_rate, holiday_rate: settings.holiday_rate, included_overtime_hours: settings.included_overtime_hours,
    sick_leave_unpaid: settings.sick_leave_unpaid, goal_mode: settings.goal_mode, monthly_goal_amount: settings.monthly_goal_amount, monthly_goal_hours: settings.monthly_goal_hours,
  };
  const dirty = (Object.keys(next) as (keyof Settings)[]).some((k) => k !== "hourly_rate" && next[k] !== saved[k]);
  // Kaydetmeden de özet canlı güncellensin
  const live: Settings = { ...settings, ...next };
  const g = goalProgress(entries ?? [], live);
  const lvl = levelFor(totalHours);
  const rateText = (pct: number) => (base > 0 ? `${money((base * pct) / 100, live.currency)}/sa` : "-");

  async function save() {
    setBusy(true);
    try {
      if (!userId) throw new Error("Hesap bilgileri yükleniyor, birkaç saniye sonra tekrar dene");
      await mutate.saveSettings(userId, next);
      toast.success("Kaydedildi");
    } catch (e) {
      toast.error(errorText(e, "Kaydedilemedi"));
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-5 pb-4">
      <h1 className="text-2xl font-bold">Hedef & Ücret</h1>

      <div className="grid items-start gap-5 md:grid-cols-2">
        <div className="space-y-5">
          <FormSection title="Maaş" footer="Bordrondaki sicil (net) maaşın.">
            <NumberRow label="Aylık net maaş" suffix="₺" value={f.monthly_salary} onChange={(v) => set("monthly_salary", v)} />
            <NumberRow label="Maaşa dahil mesai" suffix="saat" placeholder="Örn. 10.5" hint="Maaşın bu kadar saat mesai içeriyorsa gir"
              value={f.included_overtime_hours} onChange={(v) => set("included_overtime_hours", v)} />
            <SwitchRow label="Raporlu günler maaştan düşer" hint="Bordroda “Raporlu (Ücretsiz)” varsa aç" checked={f.sick_leave_unpaid} onChange={(v) => set("sick_leave_unpaid", v)} />
          </FormSection>

          <FormSection title="Mesai ücreti" tone="card"
            footer={`Hafta içi ${rateText(f.weekday_percent)} · Pazar ${rateText(f.sunday_percent)} · Resmi tatil ${rateText(f.holiday_percent)}. Maaşa dahil saatlerin üstü bu ücretlerle eklenir.`}>
            <NumberRow label="Saatlik ücret (%100)" suffix="₺" hint="Bordroda “Ek. Mes. %100” saatlik net ücret"
              value={f.base_hourly_rate} onChange={(v) => set("base_hourly_rate", v)} />
            <PercentRow label="Hafta içi mesai" value={f.weekday_percent} onChange={(v) => set("weekday_percent", v)} />
            <PercentRow label="Pazar mesaisi" value={f.sunday_percent} onChange={(v) => set("sunday_percent", v)} />
            <PercentRow label="Resmi tatil mesaisi" value={f.holiday_percent} onChange={(v) => set("holiday_percent", v)} />
          </FormSection>

          <details className="group rounded-[var(--r-lg)] bg-card">
            <summary className="flex min-h-[3.25rem] cursor-pointer list-none items-center justify-between px-4 text-[15px] font-medium">
              Sabit saatlik ücretler (isteğe bağlı)
              <span className="text-muted-foreground transition group-open:rotate-90" aria-hidden>›</span>
            </summary>
            <div className="border-t border-border/60 [&>*+*]:border-t [&>*+*]:border-border/60">
              <NumberRow label="Pazar saatlik" suffix="₺" placeholder="Orandan hesapla" value={f.sunday_rate} onChange={(v) => set("sunday_rate", v)} />
              <NumberRow label="Resmi tatil saatlik" suffix="₺" placeholder="Orandan hesapla" value={f.holiday_rate} onChange={(v) => set("holiday_rate", v)} />
              <p className="px-4 py-3 text-xs text-muted-foreground">Doldurursan o gün tipinde oran yerine bu sabit ücret kullanılır.</p>
            </div>
          </details>
        </div>

        <div className="space-y-5">
          <FormSection title="Aylık hedef">
            <div className="p-3">
              <Segmented label="Hedef türü" value={f.goal_mode} onChange={(m) => set("goal_mode", m)}
                options={[{ value: "amount", label: "Hedef maaş" }, { value: "hours", label: "Mesai saati" }]} />
            </div>
            {f.goal_mode === "amount"
              ? <NumberRow label="Toplam kazanç" suffix="₺" placeholder="Örn. 60000" hint="Maaş + mesai kazancı" value={f.monthly_goal_amount} onChange={(v) => set("monthly_goal_amount", v)} />
              : <NumberRow label="Mesai" suffix="saat" placeholder="Örn. 40" hint="Bu ay yapmak istediğin" value={f.monthly_goal_hours} onChange={(v) => set("monthly_goal_hours", v)} />}
          </FormSection>

          <Card>
            <CardContent className="space-y-3">
              <p className="font-semibold">Bu ay: %{g.percent.toFixed(0)} tamamlandı</p>
              <Progress value={g.percent} />
              {g.set ? (
                g.mode === "hours"
                  ? <p className="text-sm">Yapılan: <b>{hrs(g.done)}</b> / {hrs(g.goal)}</p>
                  : <p className="text-sm">Hedef için toplam mesai: <b>{hrs(Math.round(g.hoursNeeded * 10) / 10)}</b></p>
              ) : <p className="text-sm text-muted-foreground">Hedef belirlediğinde ilerleme burada görünür.</p>}
              <p className="text-sm text-muted-foreground">
                Maaş {money(live.monthly_salary, live.currency)}{g.deduction > 0 && <> − kesinti {money(g.deduction, live.currency)}</>} + mesai {money(g.earned, live.currency)} = <b className="text-foreground">{money(g.income, live.currency)}</b>
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-3"><LevelIcon level={lvl.level} className="size-10" />Seviyeler · {lvl.name}</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              {LEVELS.map((l, i) => (
                <div key={l.name} className={`flex items-center justify-between ${i + 1 <= lvl.level ? "font-semibold" : "text-muted-foreground opacity-60"}`}>
                  <span className="flex items-center gap-3"><LevelIcon level={i + 1} className="size-8" />Seviye {i + 1} · {l.name}</span><span>{l.min} sa</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Kaydet çubuğu: değişiklik varken alttaki menünün hemen üstünde, her zaman erişilebilir */}
      <div className={`sticky bottom-[calc(6.25rem+env(safe-area-inset-bottom))] z-20 transition md:bottom-4 ${dirty ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"}`} aria-hidden={!dirty}>
        <Button className="h-14 w-full text-base font-semibold shadow-lg" onClick={save} disabled={busy || !dirty} tabIndex={dirty ? 0 : -1}>Değişiklikleri kaydet</Button>
      </div>
    </div>
  );
}
