import { errorText } from "@mesai/core/errors";
import { hoursBetween, hrs } from "@mesai/core/calc";
import { SHIFTS, type Settings, type ShiftType } from "@mesai/core/types";
import { router } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { FormSection, Segmented, SwitchRow, TimeRow } from "@/components/form";
import { toast } from "@/components/toast";
import { Button, Card, Screen, Txt } from "@/components/ui";
import { haptic } from "@/lib/haptics";
import { mutate, useProfile, useSettings } from "@/lib/store";

const hhmm5 = (t: string | null, fallback: string) => (t ? t.slice(0, 5) : fallback);
const back = { label: "Ayarlar", onPress: () => router.back() };

/** Çalışma saati ve vardiya (web: /profile/work → WorkSettings + WorkScheduleFields). */
export default function WorkScreen() {
  const settings = useSettings();
  const userId = useProfile()?.id;
  if (!settings || !userId) return <Screen title="Çalışma saati" back={back}><Card style={{ minHeight: 352, opacity: 0.6 }} /></Screen>;
  return <WorkForm userId={userId} settings={settings} />;
}

function WorkForm({ userId, settings }: { userId: string; settings: Settings }) {
  const [start, setStart] = useState(hhmm5(settings.work_start, "08:00"));
  const [end, setEnd] = useState(hhmm5(settings.work_end, "16:00"));
  const [hasShift, setHasShift] = useState(settings.has_shift);
  const [shift, setShift] = useState<ShiftType>(settings.shift_type ?? "day");
  const savedSat = settings.saturday_off ?? true;
  const [satOff, setSatOff] = useState(savedSat);
  const [busy, setBusy] = useState(false);
  const daily = start && end ? hoursBetween(start, end) : 0;
  const dirty = start !== hhmm5(settings.work_start, "08:00") || end !== hhmm5(settings.work_end, "16:00")
    || hasShift !== settings.has_shift || (hasShift && shift !== settings.shift_type) || satOff !== savedSat
    // Hiç kaydedilmemişse ekrandaki varsayılan (08:00–16:00) da kaydedilebilsin
    || !settings.work_start || !settings.work_end;

  function pickShift(t: ShiftType) { setShift(t); setStart(SHIFTS[t].start); setEnd(SHIFTS[t].end); }

  async function save() {
    if (daily <= 0) return toast.error("Giriş ve çıkış saatini gir");
    setBusy(true);
    try {
      await mutate.saveSettings(userId, {
        work_start: start, work_end: end, daily_hours: daily,
        has_shift: hasShift, shift_type: hasShift ? shift : null,
        ...(satOff !== savedSat ? { saturday_off: satOff } : {}),
      });
      haptic("success");
      toast.success(hasShift ? `${SHIFTS[shift].label} vardiyası kaydedildi` : "Çalışma saati kaydedildi");
    } catch (e) {
      const missing = /saturday_off/.test(String((e as { message?: string })?.message));
      toast.error(missing ? "Cumartesi ayarı için sunucu güncellemesi gerekli." : errorText(e, "Kaydedilemedi"));
    } finally { setBusy(false); }
  }

  return (
    <Screen title="Çalışma saati" back={back}>
      <FormSection title="Çalışma saatleri"
        footer={<>Günlük normal çalışma: <Txt style={{ fontSize: 12, fontWeight: "700" }}>{daily > 0 ? hrs(daily) : "-"}</Txt> · Mesai bu süreden sonrası için girilir.</>}>
        <TimeRow label="Giriş saati" value={start} onChange={setStart} />
        <TimeRow label="Çıkış saati" value={end} onChange={setEnd} />
        <SwitchRow label="Vardiyalı çalışıyorum" value={hasShift} onChange={setHasShift} />
        {hasShift ? (
          <View style={{ gap: 8, padding: 12 }}>
            <Segmented value={shift} onChange={pickShift}
              options={(Object.keys(SHIFTS) as ShiftType[]).map((t) => ({ value: t, label: SHIFTS[t].label }))} />
            <Txt muted style={{ paddingHorizontal: 4, fontSize: 12, lineHeight: 16 }}>Tür seçince saatler hazır gelir; yukarıdan istediğin gibi değiştirebilirsin.</Txt>
          </View>
        ) : null}
      </FormSection>
      <FormSection title="Çalışma günleri" footer={satOff
        ? "Haftada 5 gün: cumartesi ve pazar tatil. Çizelgede cumartesi boş kalır."
        : "Haftada 6 gün: cumartesi normal iş günü, yalnızca pazar tatil. Cumartesi mesaisi hafta içi oranıyla hesaplanır."}>
        <SwitchRow label="Cumartesi tatil" hint="İş yerinde cumartesi çalışılmıyorsa açık bırak" value={satOff} onChange={setSatOff} />
      </FormSection>
      <Button title="Kaydet" size="xl" disabled={busy || !dirty} onPress={save} />
    </Screen>
  );
}
