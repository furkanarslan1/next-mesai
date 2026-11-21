"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { fetchAll } from "@/lib/fetch-all";
import { download, toCSV } from "@/lib/backup";
import { restoreBackup } from "@/lib/restore";
import { mutate, resetStore, useLinks, useProfile, useSettings, useShortcuts } from "@/lib/store";
import type { Settings } from "@/lib/types";
import { SHIFTS } from "@/lib/types";
import { dailyHoursOf, WorkScheduleFields, type WorkSchedule } from "@/components/mesai/work-schedule";
import { AppearanceCard } from "@/components/mesai/appearance-card";
import { InstallCard } from "@/components/mesai/install-card";
import { fmtHours, HoursChips } from "@/components/mesai/hours-chips";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ProfilePage() {
  const router = useRouter();
  const profile = useProfile();
  const links = useLinks() ?? [];

  async function respond(id: string, status: "accepted" | "revoked") {
    try { await mutate.respondLink(id, status); }
    catch (e) { toast.error(e instanceof Error ? e.message : "İşlem başarısız"); }
  }
  async function backup(format: "json" | "csv") {
    const supabase = createClient();
    const tables = profile?.role === "manager" ? ["manager_links"] : ["user_settings", "shortcuts", "entries", "finance_items", "payslips"];
    const data: Record<string, unknown[]> = {};
    for (const t of tables) {
      // 1000 satır sınırına takılmadan tüm kayıtlar okunur (eksik yedek sessizce oluşmasın)
      const rows = await fetchAll<Record<string, unknown>>((a, b) => supabase.from(t).select("*").order("id").range(a, b));
      if (!rows) { toast.error("Yedek alınamadı, tekrar dene"); return; }
      data[t] = rows;
    }
    const stamp = new Date().toISOString().slice(0, 10);
    if (format === "json") download(`mesai-yedek-${stamp}.json`, JSON.stringify(data, null, 2), "application/json");
    else for (const t of tables) if (data[t].length) download(`mesai-${t}-${stamp}.csv`, toCSV(data[t] as Record<string, unknown>[]), "text/csv");
    toast.success("Yedek indirildi");
  }

  async function restore(file?: File) {
    if (!file) return;
    try {
      const c = await restoreBackup(await file.text()); await mutate.refresh.all();
      toast.success(`Geri yüklendi: ${c.entries} kayıt, ${c.shortcuts} kısayol, ${c.finance} gelir/gider, ${c.payslips} bordro`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Geri yükleme başarısız");
    }
  }

  if (!profile) return <div className="glass min-h-72 w-full animate-pulse" aria-busy />;
  return (
    <div className="grid items-start gap-5 md:grid-cols-2">
      <h1 className="text-2xl font-bold md:col-span-2">{profile.full_name}</h1>
      <InstallCard className="md:col-span-2" />
      <AppearanceCard />
      {profile.role === "employee" && <WorkSettings userId={profile.id} />}
      {profile.role === "employee" && <ShortcutSettings userId={profile.id} />}
      {profile.role === "employee" && (
        <Card>
          <CardHeader><CardTitle>Yöneticim</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>Davet kodun: <b className="select-all font-mono text-lg tracking-widest">{profile.invite_code}</b></p>
            <p className="text-muted-foreground">Yöneticin bu kodla istek gönderir; onay senin elinde. Yönetici yalnızca mesai/izin kayıtlarını görür — ücret, hedef ve gelir-gider bilgilerin gizli kalır. Yöneticin yoksa tek başına kullanabilirsin.</p>
            {links.map((l) => (
              <div key={l.id} className="glass flex items-center justify-between px-3 py-2">
                <span>{l.name || "Yönetici"} · {l.status === "accepted" ? "Bağlı" : l.status === "pending" ? "Onay bekliyor" : "İptal"}</span>
                <span className="flex gap-2">
                  {l.status === "pending" && <Button size="sm" onClick={() => respond(l.id, "accepted")}>Onayla</Button>}
                  {l.status !== "revoked" && <Button size="sm" variant="outline" onClick={() => respond(l.id, "revoked")}>{l.status === "pending" ? "Reddet" : "Erişimi kaldır"}</Button>}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader><CardTitle>Yedekle</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-3">
          <Button variant="secondary" onClick={() => backup("json")}>JSON (tam yedek)</Button>
          <Button variant="secondary" onClick={() => backup("csv")}>CSV (Excel)</Button>
          {profile.role === "employee" && (
            <label className="col-span-2 cursor-pointer">
              <span className="inline-flex h-9 w-full items-center justify-center rounded-lg border text-sm font-medium">JSON yedeğinden geri yükle</span>
              <input type="file" accept="application/json,.json" className="hidden" onChange={(e) => { restore(e.target.files?.[0]); e.target.value = ""; }} />
            </label>
          )}
        </CardContent>
      </Card>
      <Button variant="outline" className="w-full md:col-span-2" onClick={async () => { await createClient().auth.signOut(); resetStore(); router.replace("/login"); router.refresh(); }}>Çıkış yap</Button>
    </div>
  );
}

const hhmm5 = (t: string | null, fallback: string) => (t ? t.slice(0, 5) : fallback);

function WorkSettings({ userId }: { userId: string }) {
  const settings = useSettings();
  if (!settings) return <div className="glass min-h-[24rem] w-full animate-pulse" aria-busy />;
  return <WorkSettingsForm userId={userId} settings={settings} />;
}

function WorkSettingsForm({ userId, settings }: { userId: string; settings: Settings }) {
  const [w, setW] = useState<WorkSchedule>({
    work_start: hhmm5(settings.work_start, "08:00"), work_end: hhmm5(settings.work_end, "16:00"),
    has_shift: settings.has_shift, shift_type: settings.shift_type ?? "day",
  });
  const [busy, setBusy] = useState(false);
  const daily = dailyHoursOf(w);
  const dirty = w.work_start !== hhmm5(settings.work_start, "08:00") || w.work_end !== hhmm5(settings.work_end, "16:00")
    || w.has_shift !== settings.has_shift || (w.has_shift && w.shift_type !== settings.shift_type);

  async function save() {
    if (daily <= 0) return toast.error("Giriş ve çıkış saatini gir");
    setBusy(true);
    try {
      await mutate.saveSettings(userId, {
        work_start: w.work_start, work_end: w.work_end, daily_hours: daily,
        has_shift: w.has_shift, shift_type: w.has_shift ? w.shift_type : null,
      });
      toast.success(w.has_shift ? `${SHIFTS[w.shift_type].label} vardiyası kaydedildi` : "Çalışma saati kaydedildi");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Kaydedilemedi");
    } finally { setBusy(false); }
  }

  return (
    <Card>
      <CardHeader><CardTitle>Çalışma saati & vardiya</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <WorkScheduleFields value={w} onChange={setW} idPrefix="set" />
        <Button type="button" className="w-full" onClick={save} disabled={busy || !dirty}>Kaydet</Button>
      </CardContent>
    </Card>
  );
}

function ShortcutSettings({ userId }: { userId: string }) {
  const shortcuts = useShortcuts();
  async function add(hours: number) {
    const { error } = await createClient().from("shortcuts").insert({
      user_id: userId, label: fmtHours(hours), hours, sort: Math.max(0, ...(shortcuts ?? []).map((s) => s.sort)) + 1,
    });
    if (error) { toast.error(error.message); return; }
    await mutate.refresh.shortcuts();
  }
  async function remove(id: string) {
    const { error } = await createClient().from("shortcuts").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    await mutate.refresh.shortcuts();
  }
  return (
    <Card>
      <CardHeader><CardTitle>Mesai kısayolları</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">Sık yaptığın mesai saatlerini ekle; ana sayfada tek dokunuşla o güne eklenir.</p>
        <HoursChips loading={shortcuts === null} items={(shortcuts ?? []).map((s) => ({ key: s.id, hours: Number(s.hours) }))} onAdd={add} onRemove={remove} />
      </CardContent>
    </Card>
  );
}
