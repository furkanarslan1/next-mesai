"use client";

import { rotationStartFor, scheduleFor, validRotation } from "@mesai/core/shift";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Download, FileJson, FileSpreadsheet, LogOut, Plus, Trash2, Upload } from "lucide-react";
import { errorText } from "@mesai/core/errors";
import { createClient } from "@/lib/supabase/client";
import { backupTables, collectBackup } from "@mesai/core/backup";
import { download, nextDownload, toCSV } from "@/lib/backup";
import { restoreBackup } from "@/lib/restore";
import { haptic } from "@/lib/haptics";
import { parseNum } from "@mesai/core/num";
import { load, mutate, resetStore, useLinks, useProfile, useSettings, useShortcuts } from "@/lib/store";
import { SHIFTS, type Settings } from "@mesai/core/types";
import { dailyHoursOf, RotationFields, WorkScheduleFields, type RotationForm, type WorkSchedule } from "@/components/mesai/work-schedule";
import { FormSection, SwitchRow } from "@/components/mesai/ios-form";
import { fmtHours } from "@/components/mesai/hours-chips";
import { SettingsGroup, SettingsRow } from "@/components/mesai/settings-list";
import { SwipeRow } from "@/components/mesai/swipe-row";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const Skeleton = ({ h = "min-h-48" }: { h?: string }) => <div className={`glass ${h} w-full animate-pulse`} aria-busy />;

/* ---------------- Çalışma saati & vardiya ---------------- */
const hhmm5 = (t: string | null, fallback: string) => (t ? t.slice(0, 5) : fallback);

export function WorkSettings() {
  const settings = useSettings();
  const userId = useProfile()?.id;
  if (!settings || !userId) return <Skeleton h="min-h-[22rem]" />;
  return <WorkSettingsForm userId={userId} settings={settings} />;
}

const pick = (x: { start: string; end: string }) => ({ start: x.start, end: x.end });

function WorkSettingsForm({ userId, settings }: { userId: string; settings: Settings }) {
  const [w, setW] = useState<WorkSchedule>({
    work_start: hhmm5(settings.work_start, "08:00"), work_end: hhmm5(settings.work_end, "16:00"),
    has_shift: settings.has_shift, shift_type: settings.shift_type ?? "day",
  });
  const savedSat = settings.saturday_off ?? true;
  const [satOff, setSatOff] = useState(savedSat);
  // Vardiya döngüsü: kayıtlıysa onun adımları ve bu haftaki adım; yoksa gündüz → gece önerisi
  const [rot, setRot] = useState<RotationForm>(() => {
    const r = validRotation(settings.shift_rotation);
    return r
      ? { on: true, weeks: r.weeks, steps: r.steps, current: scheduleFor(new Date(), settings).step }
      : { on: false, weeks: 1, steps: [{ type: "day", ...pick(SHIFTS.day) }, { type: "night", ...pick(SHIFTS.night) }], current: 0 };
  });
  const nextRotation = w.has_shift && rot.on ? validRotation({ start: rotationStartFor(new Date(), rot.current, rot.weeks), weeks: rot.weeks, steps: rot.steps }) : null;
  // Kayıtlı döngü aynı anlama gelen başlangıçla karşılaştırılır (bu haftaki adım aynıysa değişiklik yok)
  const saved = validRotation(settings.shift_rotation);
  const savedNorm = saved ? { ...saved, start: rotationStartFor(new Date(), scheduleFor(new Date(), settings).step, saved.weeks) } : null;
  const rotationChanged = JSON.stringify(nextRotation) !== JSON.stringify(savedNorm) || (!!saved && !w.has_shift);
  const [busy, setBusy] = useState(false);
  const daily = dailyHoursOf(w);
  const dirty = w.work_start !== hhmm5(settings.work_start, "08:00") || w.work_end !== hhmm5(settings.work_end, "16:00")
    || w.has_shift !== settings.has_shift || (w.has_shift && w.shift_type !== settings.shift_type) || satOff !== savedSat || rotationChanged
    // Hiç kaydedilmemişse ekrandaki varsayılan (08:00–16:00) da kaydedilebilsin
    || !settings.work_start || !settings.work_end;

  async function save() {
    if (daily <= 0) return toast.error("Giriş ve çıkış saatini gir");
    if (w.has_shift && rot.on && !nextRotation) return toast.error("Döngüdeki her vardiyanın giriş ve çıkış saatini gir");
    setBusy(true);
    try {
      await mutate.saveSettings(userId, {
        work_start: w.work_start, work_end: w.work_end, daily_hours: daily,
        has_shift: w.has_shift, shift_type: w.has_shift ? w.shift_type : null,
        ...(satOff !== savedSat ? { saturday_off: satOff } : {}),
        // Yalnızca değiştiyse gönderilir (sütun eklenmeden önce de kayıt çalışsın)
        ...(rotationChanged ? { shift_rotation: nextRotation } : {}),
      });
      haptic("success");
      toast.success(w.has_shift ? `${SHIFTS[w.shift_type].label} vardiyası kaydedildi` : "Çalışma saati kaydedildi");
    } catch (e) {
      // Sunucuya 0011 migration'ı uygulanmadıysa sütun yoktur
      const missing = /saturday_off/.test(String((e as { message?: string })?.message));
      toast.error(missing ? "Cumartesi ayarı için sunucu güncellemesi gerekli." : errorText(e, "Kaydedilemedi"));
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-5">
      <WorkScheduleFields value={w} onChange={setW} idPrefix="set" tone="card" />
      {w.has_shift && <RotationFields value={rot} onChange={setRot} />}
      <FormSection title="Çalışma günleri" footer={satOff
        ? "Haftada 5 gün: cumartesi ve pazar tatil. Çizelgede cumartesi boş kalır."
        : "Haftada 6 gün: cumartesi normal iş günü, yalnızca pazar tatil. Cumartesi mesaisi hafta içi oranıyla hesaplanır."}>
        <SwitchRow label="Cumartesi tatil" hint="İş yerinde cumartesi çalışılmıyorsa açık bırak" checked={satOff} onChange={setSatOff} />
      </FormSection>
      <Button type="button" className="h-14 w-full text-base font-semibold" onClick={save} disabled={busy || !dirty}>Kaydet</Button>
    </div>
  );
}

/* ---------------- Mesai kısayolları ---------------- */
export function ShortcutSettings() {
  const shortcuts = useShortcuts();
  const userId = useProfile()?.id;
  const [v, setV] = useState("");
  const list = shortcuts ?? [];
  const h = parseNum(v);
  const valid = h > 0 && h <= 24 && !list.some((s) => Number(s.hours) === h) && list.length < 8;

  async function add() {
    if (!valid || !userId) return;
    const { error } = await createClient().from("shortcuts").insert({
      user_id: userId, label: fmtHours(h), hours: h, sort: Math.max(0, ...list.map((s) => s.sort)) + 1,
    });
    if (error) { toast.error(errorText(error, "Eklenemedi")); return; }
    haptic("success"); setV("");
    await mutate.refresh.shortcuts();
  }
  async function remove(id: string) {
    const { error } = await createClient().from("shortcuts").delete().eq("id", id);
    if (error) { toast.error(errorText(error, "Silinemedi")); return; }
    await mutate.refresh.shortcuts();
  }

  return (
    <div className="space-y-6">
      <SettingsGroup title="Kısayollar" footer="Ana sayfada tek dokunuşla o güne mesai ekler. Silmek için satırı sola kaydır. En fazla 8 kısayol.">
        {shortcuts === null && <div className="h-13 animate-pulse" aria-busy />}
        {shortcuts?.length === 0 && <p className="px-4 py-4 text-[15px] text-muted-foreground">Henüz kısayol yok.</p>}
        {list.map((s) => (
          <SwipeRow key={s.id} onDelete={() => remove(s.id)}>
            <div className="flex min-h-[3.25rem] items-center justify-between gap-3 bg-card px-4">
              <span className="text-[17px] font-medium tabular-nums">{fmtHours(Number(s.hours))}</span>
              <button type="button" aria-label={`${fmtHours(Number(s.hours))} kısayolunu sil`} onClick={() => remove(s.id)}
                className="grid size-9 place-items-center rounded-full text-muted-foreground transition hover:text-destructive md:opacity-60 md:hover:opacity-100">
                <Trash2 className="size-4" />
              </button>
            </div>
          </SwipeRow>
        ))}
      </SettingsGroup>
      <SettingsGroup title="Yeni kısayol">
        <form className="flex items-center gap-2 px-4 py-2" onSubmit={(e) => { e.preventDefault(); void add(); }}>
          <input inputMode="decimal" placeholder="Örn. 2,5" value={v} aria-label="Mesai saati"
            onChange={(e) => setV(e.target.value.replace(/[^0-9.,]/g, ""))}
            className="h-11 min-w-0 flex-1 bg-transparent text-[17px] font-semibold tabular-nums outline-none placeholder:font-normal placeholder:text-muted-foreground/50" />
          <span className="text-[15px] text-muted-foreground">saat</span>
          <Button type="submit" size="sm" disabled={!valid}><Plus className="size-4" />Ekle</Button>
        </form>
      </SettingsGroup>
    </div>
  );
}

/* ---------------- Yöneticim ---------------- */
export function ManagerSettings() {
  const profile = useProfile();
  const links = useLinks();
  if (!profile) return <Skeleton />;

  async function respond(id: string, status: "accepted" | "revoked") {
    try { await mutate.respondLink(id, status); haptic(); toast.success(status === "accepted" ? "Onaylandı" : "Erişim kaldırıldı"); }
    catch (e) { toast.error(errorText(e, "İşlem başarısız")); }
  }
  async function copy() {
    try { await navigator.clipboard.writeText(profile!.invite_code); haptic(); toast.success("Davet kodu kopyalandı"); }
    catch { toast.info(profile!.invite_code); }
  }
  const visible = (links ?? []).filter((l) => l.status !== "revoked");

  return (
    <div className="space-y-6">
      <SettingsGroup title="Davet kodun" footer="Yöneticin bu kodla istek gönderir; onay senin elinde. Yönetici yalnızca mesai/izin kayıtlarını görür; ücret, hedef ve gelir-gider bilgilerin gizli kalır.">
        <button type="button" onClick={copy} className="settings-row flex w-full items-center justify-between gap-3 px-4 py-4 text-left">
          <span className="select-all font-mono text-2xl font-bold tracking-[0.25em]">{profile.invite_code}</span>
          <span className="text-[15px] text-[var(--tint)]">Kopyala</span>
        </button>
      </SettingsGroup>
      <SettingsGroup title="Yöneticiler">
        {links === null && <div className="h-13 animate-pulse" aria-busy />}
        {links !== null && visible.length === 0 && <p className="px-4 py-4 text-[15px] text-muted-foreground">Bağlı yöneticin yok. Tek başına da kullanabilirsin.</p>}
        {visible.map((l) => (
          <div key={l.id} className="flex min-h-[3.25rem] items-center justify-between gap-3 px-4 py-2">
            <span className="min-w-0">
              <span className="block truncate text-[17px]">{l.name || "Yönetici"}</span>
              <span className="text-[13px] text-muted-foreground">{l.status === "accepted" ? "Bağlı" : "Onay bekliyor"}</span>
            </span>
            <span className="flex shrink-0 gap-2">
              {l.status === "pending" && <Button size="sm" onClick={() => respond(l.id, "accepted")}>Onayla</Button>}
              <Button size="sm" variant="secondary" onClick={() => respond(l.id, "revoked")}>{l.status === "pending" ? "Reddet" : "Kaldır"}</Button>
            </span>
          </div>
        ))}
      </SettingsGroup>
    </div>
  );
}

/* ---------------- Yedekle & geri yükle ---------------- */
export function DataSettings() {
  const profile = useProfile();
  const [busy, setBusy] = useState(false);
  if (!profile) return <Skeleton />;
  const employee = profile.role === "employee";

  async function backup(format: "json" | "csv") {
    setBusy(true);
    try {
      const tables = backupTables(employee);
      // 1000 satır sınırına takılmadan tüm kayıtlar okunur (eksik yedek sessizce oluşmasın)
      const data = await collectBackup(createClient(), employee);
      if (!data) { toast.error("Yedek alınamadı, tekrar dene"); return; }
      const stamp = new Date().toISOString().slice(0, 10);
      if (format === "json") download(`mesai-yedek-${stamp}.json`, JSON.stringify(data, null, 2), "application/json");
      else for (const t of tables) if (data[t].length) { download(`mesai-${t}-${stamp}.csv`, toCSV(data[t] as Record<string, unknown>[]), "text/csv"); await nextDownload(); }
      haptic("success");
      toast.success("Yedek indirildi");
    } finally { setBusy(false); }
  }
  async function restore(file?: File) {
    if (!file) return;
    setBusy(true);
    try {
      const c = await restoreBackup(await file.text());
      await mutate.refresh.all();
      haptic("success");
      toast.success(`Geri yüklendi: ${c.entries} kayıt, ${c.shortcuts} kısayol, ${c.finance} gelir/gider, ${c.payslips} bordro`);
    } catch (e) {
      toast.error(errorText(e, "Geri yükleme başarısız"));
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-6">
      <SettingsGroup title="Yedekle" footer="JSON tam yedektir, geri yüklenebilir. CSV dosyaları Excel'de açılır.">
        <SettingsRow icon={FileJson} color="#5b91a3" label="JSON tam yedek" value={busy ? "Hazırlanıyor…" : <Download className="size-4" />} onClick={() => !busy && backup("json")} />
        <SettingsRow icon={FileSpreadsheet} color="#2f9e6e" label="CSV (Excel)" value={<Download className="size-4" />} onClick={() => !busy && backup("csv")} />
      </SettingsGroup>
      {employee && (
        <SettingsGroup title="Geri yükle" footer="Yedekteki kayıtlar hesabına eklenir; mevcut kayıtların silinmez.">
          <label className="settings-row flex min-h-[3.25rem] cursor-pointer items-center gap-3 px-4">
            <span className="settings-icon" style={{ background: "#7a6fd6" }}><Upload className="size-[18px]" /></span>
            <span className="flex-1 text-[17px]">JSON yedeğinden geri yükle</span>
            <input type="file" accept="application/json,.json" className="hidden" disabled={busy} onChange={(e) => { void restore(e.target.files?.[0]); e.target.value = ""; }} />
          </label>
        </SettingsGroup>
      )}
    </div>
  );
}

/* ---------------- Hesap ---------------- */
export function AccountSettings() {
  const router = useRouter();
  const profile = useProfile();
  const [value, setValue] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [typed, setTyped] = useState("");
  if (!profile) return <Skeleton />;
  const name = profile.full_name;
  const current = value ?? name;
  const trimmed = current.trim();

  function signedOut() { resetStore(); router.replace("/login"); router.refresh(); }
  async function saveName() {
    if (!trimmed || trimmed === name) return;
    setBusy(true);
    const { error } = await createClient().from("profiles").update({ full_name: trimmed }).eq("id", profile!.id);
    setBusy(false);
    if (error) { toast.error(errorText(error, "Ad kaydedilemedi")); return; }
    await load.profile(true);
    setValue(null);
    haptic("success");
    toast.success("Adın güncellendi");
  }
  async function signOut() {
    await createClient().auth.signOut();
    signedOut();
  }
  async function deleteAccount() {
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.rpc("delete_my_account");
    if (error) {
      setBusy(false);
      toast.error(/delete_my_account|function|schema cache/i.test(error.message) ? "Hesap silme henüz etkin değil (sunucu güncellemesi gerekli)." : errorText(error, "Hesap silinemedi"));
      return;
    }
    await supabase.auth.signOut().catch(() => {});
    toast.success("Hesabın ve tüm verilerin silindi");
    signedOut();
  }

  return (
    <div className="space-y-6">
      <SettingsGroup title="Ad Soyad">
        <form className="flex items-center gap-2 px-4 py-1.5" onSubmit={(e) => { e.preventDefault(); void saveName(); }}>
          <input value={current} onChange={(e) => setValue(e.target.value)} maxLength={60} aria-label="Ad Soyad" placeholder="Ad Soyad"
            className="h-11 min-w-0 flex-1 bg-transparent text-[17px] outline-none" />
          {trimmed !== name && <Button type="submit" size="sm" disabled={busy || !trimmed}>Kaydet</Button>}
        </form>
      </SettingsGroup>
      <SettingsGroup>
        <SettingsRow icon={LogOut} color="#7f8f9c" label="Çıkış yap" onClick={signOut} />
      </SettingsGroup>
      <SettingsGroup footer="Mesai kayıtların, ayarların, gelir-gider ve bordroların kalıcı olarak silinir. İstersen önce yedek indir.">
        <SettingsRow label="Hesabımı sil" destructive onClick={() => { setTyped(""); setConfirm(true); }} />
      </SettingsGroup>

      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogContent showCloseButton={false} className="gap-5 p-6 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Hesabın kalıcı olarak silinsin mi?</DialogTitle>
            <DialogDescription>Bu işlem geri alınamaz. Onaylamak için <b>SİL</b> yaz.</DialogDescription>
          </DialogHeader>
          <Input value={typed} onChange={(e) => setTyped(e.target.value)} aria-label="Onay metni" placeholder="SİL" autoComplete="off" />
          <div className="grid grid-cols-2 gap-3">
            <Button variant="secondary" className="h-12" autoFocus onClick={() => setConfirm(false)}>Vazgeç</Button>
            <Button className="h-12 bg-destructive text-white hover:bg-destructive/90" disabled={busy || typed.trim().toLocaleUpperCase("tr") !== "SİL"} onClick={deleteAccount}>Kalıcı olarak sil</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
