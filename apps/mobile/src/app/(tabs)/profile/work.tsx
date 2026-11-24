import { errorText } from "@mesai/core/errors";
import { dailyHoursOf, type WorkSchedule } from "@mesai/core/auth";
import { SHIFTS, type Settings } from "@mesai/core/types";
import { router } from "expo-router";
import { useState } from "react";
import { Skeleton } from "@/components/skeleton";
import { FormSection, SwitchRow } from "@/components/form";
import { toast } from "@/components/toast";
import { Button, Screen } from "@/components/ui";
import { WorkScheduleFields } from "@/components/work-schedule";
import { haptic } from "@/lib/haptics";
import { mutate, useProfile, useSettings } from "@/lib/store";

const hhmm5 = (t: string | null, fallback: string) => (t ? t.slice(0, 5) : fallback);
const back = { label: "Ayarlar", onPress: () => router.back() };

/** Çalışma saati ve vardiya (web: /profile/work → WorkSettings + WorkScheduleFields). */
export default function WorkScreen() {
  const settings = useSettings();
  const userId = useProfile()?.id;
  if (!settings || !userId) return <Screen title="Çalışma saati" back={back}><Skeleton style={{ minHeight: 352 }} /></Screen>;
  return <WorkForm userId={userId} settings={settings} />;
}

function WorkForm({ userId, settings }: { userId: string; settings: Settings }) {
  const [w, setW] = useState<WorkSchedule>({
    work_start: hhmm5(settings.work_start, "08:00"), work_end: hhmm5(settings.work_end, "16:00"),
    has_shift: settings.has_shift, shift_type: settings.shift_type ?? "day",
  });
  const savedSat = settings.saturday_off ?? true;
  const [satOff, setSatOff] = useState(savedSat);
  const [busy, setBusy] = useState(false);
  const daily = dailyHoursOf(w);
  const dirty = w.work_start !== hhmm5(settings.work_start, "08:00") || w.work_end !== hhmm5(settings.work_end, "16:00")
    || w.has_shift !== settings.has_shift || (w.has_shift && w.shift_type !== settings.shift_type) || satOff !== savedSat
    // Hiç kaydedilmemişse ekrandaki varsayılan (08:00–16:00) da kaydedilebilsin
    || !settings.work_start || !settings.work_end;

  async function save() {
    if (daily <= 0) return toast.error("Giriş ve çıkış saatini gir");
    setBusy(true);
    try {
      await mutate.saveSettings(userId, {
        work_start: w.work_start, work_end: w.work_end, daily_hours: daily,
        has_shift: w.has_shift, shift_type: w.has_shift ? w.shift_type : null,
        ...(satOff !== savedSat ? { saturday_off: satOff } : {}),
      });
      haptic("success");
      toast.success(w.has_shift ? `${SHIFTS[w.shift_type].label} vardiyası kaydedildi` : "Çalışma saati kaydedildi");
    } catch (e) {
      const missing = /saturday_off/.test(String((e as { message?: string })?.message));
      toast.error(missing ? "Cumartesi ayarı için sunucu güncellemesi gerekli." : errorText(e, "Kaydedilemedi"));
    } finally { setBusy(false); }
  }

  return (
    <Screen title="Çalışma saati" back={back}>
      <WorkScheduleFields value={w} onChange={setW} tone="card" />
      <FormSection title="Çalışma günleri" footer={satOff
        ? "Haftada 5 gün: cumartesi ve pazar tatil. Çizelgede cumartesi boş kalır."
        : "Haftada 6 gün: cumartesi normal iş günü, yalnızca pazar tatil. Cumartesi mesaisi hafta içi oranıyla hesaplanır."}>
        <SwitchRow label="Cumartesi tatil" hint="İş yerinde cumartesi çalışılmıyorsa açık bırak" value={satOff} onChange={setSatOff} />
      </FormSection>
      <Button title="Kaydet" size="xl" disabled={busy || !dirty} onPress={save} />
    </Screen>
  );
}
