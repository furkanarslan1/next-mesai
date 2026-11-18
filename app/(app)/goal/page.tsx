"use client";

import { useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { mutate, useSettings, useMonthEntries, monthKey, useTotalHours } from "@/lib/store";
import { goalProgress, hrs, levelFor, LEVELS, money } from "@/lib/calc";
import type { Settings } from "@/lib/types";
import { LevelIcon } from "@/components/mesai/level-icon";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";

type Form = {
  monthly_salary: string; hourly_rate: string; sunday_rate: string; holiday_rate: string;
  goal_mode: Settings["goal_mode"]; monthly_goal_amount: string; monthly_goal_hours: string;
};
const str = (n: number) => (n > 0 ? String(n) : "");
const toForm = (s: Settings): Form => ({
  monthly_salary: str(s.monthly_salary), hourly_rate: str(s.hourly_rate),
  sunday_rate: str(s.sunday_rate), holiday_rate: str(s.holiday_rate),
  goal_mode: s.goal_mode, monthly_goal_amount: str(s.monthly_goal_amount), monthly_goal_hours: str(s.monthly_goal_hours),
});

export default function GoalPage() {
  const settings = useSettings();
  if (!settings) return <div className="glass h-96 w-full animate-pulse" aria-busy />;
  return <GoalView settings={settings} />;
}

function GoalView({ settings }: { settings: Settings }) {
  const entries = useMonthEntries(monthKey(new Date()));
  const totalHours = useTotalHours() ?? 0;
  const [f, setF] = useState<Form>(() => toForm(settings));
  const [busy, setBusy] = useState(false);
  const n = (v: string) => Math.max(0, parseFloat(v.replace(",", ".")) || 0);

  const next: Partial<Settings> = {
    monthly_salary: n(f.monthly_salary), hourly_rate: n(f.hourly_rate),
    sunday_rate: n(f.sunday_rate), holiday_rate: n(f.holiday_rate),
    goal_mode: f.goal_mode, monthly_goal_amount: n(f.monthly_goal_amount), monthly_goal_hours: n(f.monthly_goal_hours),
  };
  const dirty = (Object.keys(next) as (keyof Settings)[]).some((k) => next[k] !== settings[k]);
  // Kaydetmeden de özet canlı güncellensin
  const live: Settings = { ...settings, ...next };
  const g = goalProgress(entries ?? [], live);
  const doubled = live.hourly_rate > 0 ? String(live.hourly_rate * 2) : "0";
  const lvl = levelFor(totalHours);

  async function save() {
    setBusy(true);
    try {
      const { data: { user } } = await createClient().auth.getUser();
      if (!user) throw new Error("Oturum bulunamadı");
      await mutate.saveSettings(user.id, next);
      toast.success("Kaydedildi");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Kaydedilemedi");
    } finally { setBusy(false); }
  }

  const field = (k: keyof Form, label: string, opts?: { hint?: string; placeholder?: string; step?: string }) => (
    <div className="space-y-1.5">
      <Label htmlFor={`g-${k}`}>{label}</Label>
      <Input id={`g-${k}`} type="number" inputMode="decimal" min="0" step={opts?.step ?? "0.01"} placeholder={opts?.placeholder ?? "0"}
        value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} />
      {opts?.hint && <p className="text-xs text-muted-foreground">{opts.hint}</p>}
    </div>
  );

  return (
    <div className="grid items-start gap-5 md:grid-cols-2">
      <h1 className="text-2xl font-bold md:col-span-2">Hedef & Ücret</h1>

      <Card>
        <CardHeader><CardTitle>Ücret bilgilerin</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {field("monthly_salary", "Aylık maaş (₺)")}
          <div className="grid grid-cols-2 gap-3">
            {field("hourly_rate", "Saatlik mesai ücreti (₺)")}
            {field("sunday_rate", "Pazar saatlik (₺)", { placeholder: doubled })}
          </div>
          {field("holiday_rate", "Resmi tatil saatlik (₺)", { placeholder: doubled, hint: "Pazar/tatil boş kalırsa saatlik ücretin 2 katı hesaplanır." })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Aylık hedef</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Hedef türü">
            {(["amount", "hours"] as const).map((m) => (
              <Button key={m} type="button" role="radio" aria-checked={f.goal_mode === m}
                variant={f.goal_mode === m ? "default" : "secondary"} onClick={() => setF({ ...f, goal_mode: m })}>
                {m === "amount" ? "Hedef maaş" : "Mesai saati"}
              </Button>
            ))}
          </div>
          {f.goal_mode === "amount"
            ? field("monthly_goal_amount", "Bu ay toplam kazanmak istediğin (₺)", { step: "100", placeholder: "Örn. 40000", hint: "Maaş + mesai kazancı toplamı." })
            : field("monthly_goal_hours", "Bu ay yapmak istediğin mesai (saat)", { step: "0.5", placeholder: "Örn. 40" })}
          <Button className="w-full" onClick={save} disabled={busy || !dirty}>Kaydet</Button>
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardContent className="space-y-3">
          <p className="font-semibold">Bu ay: %{g.percent.toFixed(0)} tamamlandı</p>
          <Progress value={g.percent} />
          {g.set ? (
            g.mode === "hours"
              ? <p className="text-sm">Yapılan: <b>{hrs(g.done)}</b> / {hrs(g.goal)}</p>
              : <p className="text-sm">Hedef için toplam mesai: <b>{hrs(Math.round(g.hoursNeeded * 10) / 10)}</b></p>
          ) : <p className="text-sm text-muted-foreground">Hedef belirlediğinde ilerleme burada görünür.</p>}
          <p className="text-sm text-muted-foreground">
            Maaş {money(live.monthly_salary, live.currency)} + mesai {money(g.earned, live.currency)} = <b className="text-foreground">{money(g.income, live.currency)}</b>
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
  );
}
