"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useMesai } from "@/lib/use-data";
import { hhmm, hoursBetween, hrs, levelFor, LEVELS, money, monthSummary } from "@/lib/calc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";

export default function GoalPage() {
  const { entries, settings, shortcuts, totalHours, reload } = useMesai(new Date());
  const [f, setF] = useState({ hourly_rate: "", sunday_multiplier: "", holiday_multiplier: "", monthly_goal_amount: "" });
  const [sc, setSc] = useState({ start: "07:30", end: "19:00" });
  useEffect(() => {
    setF({
      hourly_rate: String(settings.hourly_rate), sunday_multiplier: String(settings.sunday_multiplier),
      holiday_multiplier: String(settings.holiday_multiplier), monthly_goal_amount: String(settings.monthly_goal_amount),
    });
  }, [settings]);
  const live = { ...settings, hourly_rate: +f.hourly_rate || 0, sunday_multiplier: +f.sunday_multiplier || 1, holiday_multiplier: +f.holiday_multiplier || 1, monthly_goal_amount: +f.monthly_goal_amount || 0 };
  const sum = monthSummary(entries, live);
  const neededHours = live.hourly_rate > 0 ? live.monthly_goal_amount / live.hourly_rate : 0;
  const lvl = levelFor(totalHours);

  async function save() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("user_settings").update({
      hourly_rate: live.hourly_rate, sunday_multiplier: live.sunday_multiplier,
      holiday_multiplier: live.holiday_multiplier, monthly_goal_amount: live.monthly_goal_amount,
    }).eq("user_id", user!.id);
    if (error) toast.error(error.message);
    else { toast.success("Kaydedildi"); reload(); }
  }
  async function addShortcut() {
    const h = hoursBetween(sc.start, sc.end);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("shortcuts").insert({
      user_id: user!.id, label: `${h} saat`, hours: h, sort: shortcuts.length + 1,
      start_time: sc.start, end_time: sc.end,
    });
    reload();
  }
  const field = (k: keyof typeof f, label: string) => (
    <div className="space-y-1.5"><Label>{label}</Label>
      <Input type="number" step="0.01" value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} /></div>
  );

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Hedef & Ücret</h1>
      <Card>
        <CardHeader><CardTitle>Hedef maaş</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {field("hourly_rate", "1 saat mesai ücreti")}
            {field("monthly_goal_amount", "Aylık hedef (₺)")}
            {field("sunday_multiplier", "Pazar çarpanı")}
            {field("holiday_multiplier", "Tatil çarpanı")}
          </div>
          <Button className="w-full" onClick={save}>Kaydet</Button>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="space-y-3">
          <p className="font-semibold">Bu ay: %{sum.percent.toFixed(0)} tamamlandı</p>
          <Progress value={sum.percent} />
          <p className="text-sm">Hedef için gereken: <b>{hrs(neededHours)}</b> mesai</p>
          <p className="text-sm">Yapılan: <b>{hrs(sum.hours)}</b> · Kazanılan: <b>{money(sum.earned, settings.currency)}</b></p>
          <p className="text-sm text-muted-foreground">Kalan ~{hrs(sum.remainingHours)} ({money(sum.remainingMoney, settings.currency)})</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Kısayollarım</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">{shortcuts.map((s) => (
            <Button key={s.id} variant="secondary" size="sm" onClick={async () => { await createClient().from("shortcuts").delete().eq("id", s.id); reload(); }}>{s.label}{s.start_time ? ` (${hhmm(s.start_time)}–${hhmm(s.end_time)})` : ""} ✕</Button>
          ))}</div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5"><Label>Başlangıç</Label><Input type="time" value={sc.start} onChange={(e) => setSc({ ...sc, start: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Bitiş</Label><Input type="time" value={sc.end} onChange={(e) => setSc({ ...sc, end: e.target.value })} /></div>
          </div>
          <p className="text-xs text-muted-foreground">Süre: {sc.start && sc.end ? hrs(hoursBetween(sc.start, sc.end)) : "-"} · Kısayola basınca bu saatler o günün kaydına eklenir.</p>
          <Button className="w-full" onClick={addShortcut} disabled={!sc.start || !sc.end}>Kısayol ekle</Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Seviyeler · {lvl.emoji} {lvl.name}</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {LEVELS.map((l, i) => (
            <div key={l.name} className={`flex justify-between ${i + 1 <= lvl.level ? "font-semibold" : "text-muted-foreground"}`}>
              <span>{l.emoji} Seviye {i + 1} · {l.name}</span><span>{l.min} sa</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
