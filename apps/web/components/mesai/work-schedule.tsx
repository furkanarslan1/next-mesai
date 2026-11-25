"use client";

import { dailyHoursOf, type WorkSchedule } from "@mesai/core/auth";
import { hrs } from "@mesai/core/calc";
import { SHIFTS, type ShiftStep, type ShiftType } from "@mesai/core/types";
import { FormRow, FormSection, Segmented, SwitchRow } from "@/components/mesai/ios-form";

export { dailyHoursOf, type WorkSchedule } from "@mesai/core/auth";

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

/** Vardiya döngüsü formu: adımlar (tür + saat), kaç haftada bir değiştiği ve bu haftaki adım */
export interface RotationForm { on: boolean; weeks: number; steps: ShiftStep[]; current: number }

export function RotationFields({ value, onChange }: { value: RotationForm; onChange: (v: RotationForm) => void }) {
  const set = (patch: Partial<RotationForm>) => onChange({ ...value, ...patch });
  const setStep = (i: number, patch: Partial<ShiftStep>) => set({ steps: value.steps.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
  const time = (v: string, on: (v: string) => void, label: string) => (
    <input type="time" required value={v} aria-label={label} onChange={(e) => on(e.target.value)}
      className="h-10 rounded-full bg-muted px-3 text-[15px] font-semibold tabular-nums outline-none" />
  );
  return (
    <FormSection tone="card" title="Vardiya döngüsü"
      footer={value.on ? "Uygulama her gün hangi vardiyada olduğunu buna göre hesaplar: Bugün kartı, çıkış saatine göre mesai, çıkış bildirimi ve çizelge." : "Vardiyan belirli haftalarda değişiyorsa (ör. bir hafta gündüz, bir hafta gece) aç."}>
      <SwitchRow label="Vardiyam dönüşümlü değişiyor" checked={value.on} onChange={(on) => set({ on })} />
      {value.on && (
        <div className="space-y-4 p-3">
          {value.steps.map((x, i) => (
            <div key={i} className="space-y-2 r-md bg-muted/50 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold">{i + 1}. vardiya</p>
                {value.steps.length > 2 && (
                  <button type="button" className="text-xs text-destructive" onClick={() => set({ steps: value.steps.filter((_, j) => j !== i), current: Math.min(value.current, value.steps.length - 2) })}>Kaldır</button>
                )}
              </div>
              <Segmented label={`${i + 1}. vardiya türü`} value={x.type} onChange={(t: ShiftType) => setStep(i, { type: t, start: SHIFTS[t].start, end: SHIFTS[t].end })}
                options={(Object.keys(SHIFTS) as ShiftType[]).map((t) => ({ value: t, label: SHIFTS[t].label }))} />
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                {time(x.start, (v) => setStep(i, { start: v }), `${i + 1}. vardiya giriş`)}–{time(x.end, (v) => setStep(i, { end: v }), `${i + 1}. vardiya çıkış`)}
              </div>
            </div>
          ))}
          {value.steps.length < 4 && (
            <button type="button" className="w-full r-pill bg-muted py-2.5 text-sm font-medium" onClick={() => set({ steps: [...value.steps, { type: "day", start: SHIFTS.day.start, end: SHIFTS.day.end }] })}>+ Vardiya ekle</button>
          )}
          <div className="space-y-1.5">
            <p className="px-1 text-sm font-medium">Her vardiya kaç hafta sürüyor?</p>
            <Segmented label="Hafta" value={value.weeks} onChange={(weeks: number) => set({ weeks })} options={[1, 2, 3, 4].map((n) => ({ value: n, label: `${n} hafta` }))} />
          </div>
          <div className="space-y-1.5">
            <p className="px-1 text-sm font-medium">Bu hafta hangi vardiyadasın?</p>
            <Segmented label="Bu haftaki vardiya" value={value.current} onChange={(current: number) => set({ current })}
              options={value.steps.map((x, i) => ({ value: i, label: `${i + 1}. ${SHIFTS[x.type].label}` }))} />
          </div>
        </div>
      )}
    </FormSection>
  );
}
