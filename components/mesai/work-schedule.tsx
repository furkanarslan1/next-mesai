"use client";

import { hoursBetween, hrs } from "@/lib/calc";
import { SHIFTS, type ShiftType } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

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
export function WorkScheduleFields({ value, onChange, idPrefix = "ws" }: {
  value: WorkSchedule; onChange: (next: WorkSchedule) => void; idPrefix?: string;
}) {
  const set = (patch: Partial<WorkSchedule>) => onChange({ ...value, ...patch });
  const pickShift = (t: ShiftType) => set({ shift_type: t, work_start: SHIFTS[t].start, work_end: SHIFTS[t].end });
  const daily = dailyHoursOf(value);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-in`}>Giriş saati</Label>
          <Input id={`${idPrefix}-in`} type="time" required value={value.work_start} onChange={(e) => set({ work_start: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-out`}>Çıkış saati</Label>
          <Input id={`${idPrefix}-out`} type="time" required value={value.work_end} onChange={(e) => set({ work_end: e.target.value })} />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Günlük normal çalışma: <b className="text-foreground">{daily > 0 ? hrs(daily) : "-"}</b> · Mesai bu süreden sonrası için girilir.
      </p>

      <label className="flex items-center justify-between text-sm">
        Vardiyalı çalışıyorum
        <Switch checked={value.has_shift} onCheckedChange={(v) => set({ has_shift: v })} />
      </label>
      {value.has_shift && (
        <div className="space-y-2">
          <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Vardiya türü">
            {(Object.keys(SHIFTS) as ShiftType[]).map((t) => (
              <button
                key={t} type="button" role="radio" aria-checked={value.shift_type === t}
                onClick={() => pickShift(t)}
                className={cn(
                  "rounded-xl border px-2 py-2.5 text-sm font-medium transition",
                  value.shift_type === t ? "border-primary bg-primary text-primary-foreground" : "bg-secondary/50 text-muted-foreground",
                )}
              >
                {SHIFTS[t].label}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">Tür seçince saatler hazır gelir; yukarıdaki giriş/çıkıştan istediğin gibi değiştirebilirsin.</p>
        </div>
      )}
    </div>
  );
}
