"use client";

import { hoursBetween, hrs } from "@/lib/calc";
import { SHIFTS, type ShiftType } from "@/lib/types";
import { FormRow, FormSection, Segmented, SwitchRow } from "@/components/mesai/ios-form";

export interface WorkSchedule {
  work_start: string; // HH:MM
  work_end: string;
  has_shift: boolean;
  shift_type: ShiftType;
}

/** Giriş/çıkıştan günlük normal çalışma süresi. */
export const dailyHoursOf = (w: Pick<WorkSchedule, "work_start" | "work_end">) =>
  w.work_start && w.work_end ? hoursBetween(w.work_start, w.work_end) : 0;

/**
 * Normal çalışma saati + isteğe bağlı vardiya (gündüz/akşam/gece).
 * Saatler tarayıcının yerel saat seçicisini (iOS'ta tekerlek) açan type="time" alanlarıyla girilir.
 */
export function WorkScheduleFields({ value, onChange, idPrefix = "ws", tone = "muted" }: {
  value: WorkSchedule; onChange: (next: WorkSchedule) => void; idPrefix?: string; tone?: "muted" | "card";
}) {
  const set = (patch: Partial<WorkSchedule>) => onChange({ ...value, ...patch });
  const pickShift = (t: ShiftType) => set({ shift_type: t, work_start: SHIFTS[t].start, work_end: SHIFTS[t].end });
  const daily = dailyHoursOf(value);
  const timeInput = (id: string, v: string, on: (v: string) => void, label: string) => (
    <input id={id} type="time" required value={v} aria-label={label} onChange={(e) => on(e.target.value)}
      className={`h-11 rounded-full ${tone === "card" ? "bg-muted" : "bg-card dark:bg-background"} px-4 text-[17px] font-semibold tabular-nums outline-none`} />
  );

  return (
    <div className="space-y-5">
      <FormSection tone={tone} title="Çalışma saatleri"
        footer={<>Günlük normal çalışma: <b className="text-foreground">{daily > 0 ? hrs(daily) : "-"}</b> · Mesai bu süreden sonrası için girilir.</>}>
        <FormRow label="Giriş saati">{timeInput(`${idPrefix}-in`, value.work_start, (v) => set({ work_start: v }), "Giriş saati")}</FormRow>
        <FormRow label="Çıkış saati">{timeInput(`${idPrefix}-out`, value.work_end, (v) => set({ work_end: v }), "Çıkış saati")}</FormRow>
        <SwitchRow label="Vardiyalı çalışıyorum" checked={value.has_shift} onChange={(v) => set({ has_shift: v })} />
        {value.has_shift && (
          <div className="space-y-2 p-3">
            <Segmented label="Vardiya türü" value={value.shift_type} onChange={pickShift}
              options={(Object.keys(SHIFTS) as ShiftType[]).map((t) => ({ value: t, label: SHIFTS[t].label }))} />
            <p className="px-1 text-xs text-muted-foreground">Tür seçince saatler hazır gelir; yukarıdan istediğin gibi değiştirebilirsin.</p>
          </div>
        )}
      </FormSection>
    </div>
  );
}
