import { dailyHoursOf, type WorkSchedule } from "@mesai/core/auth";
import { hrs } from "@mesai/core/calc";
import { parseNum } from "@mesai/core/num";
import { SHIFTS, type ShiftStep, type ShiftType } from "@mesai/core/types";
import { Plus, X } from "@/components/icons";
import { useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { radius, useColors } from "@/theme";
import { FormSection, Segmented, SwitchRow, TimeRow } from "./form";
import { Button, Txt } from "./ui";

/**
 * Normal çalışma saati + isteğe bağlı vardiya (web: WorkScheduleFields). Kayıt formunda (`muted`, kart içinde)
 * ve Ayarlar → Çalışma saati'nde (`card`, sayfa zemininde) kullanılır.
 */
export function WorkScheduleFields({ value, onChange, tone = "muted" }: {
  value: WorkSchedule; onChange: (next: WorkSchedule) => void; tone?: "muted" | "card";
}) {
  const set = (patch: Partial<WorkSchedule>) => onChange({ ...value, ...patch });
  const pickShift = (t: ShiftType) => set({ shift_type: t, work_start: SHIFTS[t].start, work_end: SHIFTS[t].end });
  const daily = dailyHoursOf(value);
  return (
    <FormSection tone={tone} title="Çalışma saatleri"
      footer={<>Günlük normal çalışma: <Txt style={{ fontSize: 12, fontWeight: "700" }}>{daily > 0 ? hrs(daily) : "-"}</Txt> · Mesai bu süreden sonrası için girilir.</>}>
      <TimeRow label="Giriş saati" value={value.work_start} onChange={(v) => set({ work_start: v })} tone={tone} />
      <TimeRow label="Çıkış saati" value={value.work_end} onChange={(v) => set({ work_end: v })} tone={tone} />
      <SwitchRow label="Vardiyalı çalışıyorum" value={value.has_shift} onChange={(v) => set({ has_shift: v })} />
      {value.has_shift ? (
        <View style={{ gap: 8, padding: 12 }}>
          <Segmented value={value.shift_type} onChange={pickShift}
            options={(Object.keys(SHIFTS) as ShiftType[]).map((t) => ({ value: t, label: SHIFTS[t].label }))} />
          <Txt muted style={{ paddingHorizontal: 4, fontSize: 12, lineHeight: 16 }}>Tür seçince saatler hazır gelir; yukarıdan istediğin gibi değiştirebilirsin.</Txt>
        </View>
      ) : null}
    </FormSection>
  );
}

export const fmtHours = (h: number) => `${(+h.toFixed(2)).toLocaleString("tr-TR", { maximumFractionDigits: 2 })} saat`;

/** Sık yapılan mesai saatlerini (2.5, 6.5 gibi) ekleyip çıkarmak için küçük düzenleyici (web: HoursChips). */
export function HoursChips({ items, onAdd, onRemove, max = 8 }: {
  items: number[]; onAdd: (hours: number) => void; onRemove: (hours: number) => void; max?: number;
}) {
  const c = useColors();
  const [v, setV] = useState("");
  const h = parseNum(v);
  const valid = h > 0 && h <= 24 && !items.includes(h) && items.length < max;
  const add = () => { if (!valid) return; onAdd(h); setV(""); };
  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {items.length === 0 ? <Txt muted style={{ fontSize: 14, lineHeight: 20 }}>Henüz kısayol yok.</Txt> : null}
        {items.map((i) => (
          <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 4, paddingLeft: 12, paddingRight: 4,
            borderRadius: radius.pill, backgroundColor: c.card, borderWidth: 1, borderColor: c.cardBorder, boxShadow: c.shadow.card }}>
            <Txt style={{ fontSize: 14, lineHeight: 20, fontWeight: "500" }}>{fmtHours(i)}</Txt>
            <Pressable onPress={() => onRemove(i)} accessibilityLabel={`${fmtHours(i)} kısayolunu sil`} hitSlop={6}
              style={{ width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center" }}>
              <X size={14} color={c.mutedForeground} />
            </Pressable>
          </View>
        ))}
      </View>
      <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
        <TextInput maxFontSizeMultiplier={1.35} value={v} onChangeText={(t) => setV(t.replace(/[^0-9.,]/g, ""))} placeholder="Örn. 2,5" placeholderTextColor={c.mutedForeground}
          keyboardType="decimal-pad" returnKeyType="done" onSubmitEditing={add} accessibilityLabel="Mesai saati"
          style={{ flex: 1, height: 44, borderRadius: radius.md, backgroundColor: c.muted, paddingHorizontal: 16, fontSize: 16, color: c.foreground }} />
        <Button title="Ekle" variant="secondary" disabled={!valid} icon={<Plus size={16} color={c.secondaryForeground} />} onPress={add} accessibilityLabel="Kısayol ekle" />
      </View>
      {items.length >= max ? <Txt muted style={{ fontSize: 12, lineHeight: 16 }}>En fazla {max} kısayol ekleyebilirsin.</Txt> : null}
    </View>
  );
}

/** Vardiya döngüsü formu (web: RotationFields) */
export interface RotationForm { on: boolean; weeks: number; steps: ShiftStep[]; current: number }

export function RotationFields({ value, onChange }: { value: RotationForm; onChange: (v: RotationForm) => void }) {
  const c = useColors();
  const set = (patch: Partial<RotationForm>) => onChange({ ...value, ...patch });
  const setStep = (i: number, patch: Partial<ShiftStep>) => set({ steps: value.steps.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
  return (
    <FormSection title="Vardiya döngüsü"
      footer={value.on ? "Uygulama her gün hangi vardiyada olduğunu buna göre hesaplar: Bugün kartı, çıkış saatine göre mesai, çıkış bildirimi ve çizelge." : "Vardiyan belirli haftalarda değişiyorsa (ör. bir hafta gündüz, bir hafta gece) aç."}>
      <SwitchRow label="Vardiyam dönüşümlü değişiyor" value={value.on} onChange={(on) => set({ on })} />
      {value.on ? (
        <View style={{ gap: 16, padding: 12 }}>
          {value.steps.map((x, i) => (
            <View key={i} style={{ gap: 8, borderRadius: radius.md, backgroundColor: c.muted, paddingVertical: 8 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 12 }}>
                <Txt style={{ fontSize: 14, fontWeight: "600" }}>{i + 1}. vardiya</Txt>
                {value.steps.length > 2 ? (
                  <Pressable hitSlop={8} onPress={() => set({ steps: value.steps.filter((_, j) => j !== i), current: Math.min(value.current, value.steps.length - 2) })}>
                    <Txt style={{ fontSize: 12, color: c.destructive }}>Kaldır</Txt>
                  </Pressable>
                ) : null}
              </View>
              <View style={{ paddingHorizontal: 12 }}>
                <Segmented value={x.type} onChange={(t: ShiftType) => setStep(i, { type: t, start: SHIFTS[t].start, end: SHIFTS[t].end })}
                  options={(Object.keys(SHIFTS) as ShiftType[]).map((t) => ({ value: t, label: SHIFTS[t].label }))} />
              </View>
              <TimeRow label="Giriş" value={x.start} onChange={(v) => setStep(i, { start: v })} tone="muted" />
              <TimeRow label="Çıkış" value={x.end} onChange={(v) => setStep(i, { end: v })} tone="muted" />
            </View>
          ))}
          {value.steps.length < 4 ? (
            <Button title="+ Vardiya ekle" variant="secondary" size="md" onPress={() => set({ steps: [...value.steps, { type: "day", start: SHIFTS.day.start, end: SHIFTS.day.end }] })} />
          ) : null}
          <View style={{ gap: 6 }}>
            <Txt style={{ fontSize: 14, fontWeight: "500", paddingHorizontal: 4 }}>Her vardiya kaç hafta sürüyor?</Txt>
            <Segmented value={String(value.weeks)} onChange={(v) => set({ weeks: Number(v) })} options={["1", "2", "3", "4"].map((n) => ({ value: n, label: `${n} hafta` }))} />
          </View>
          <View style={{ gap: 6 }}>
            <Txt style={{ fontSize: 14, fontWeight: "500", paddingHorizontal: 4 }}>Bu hafta hangi vardiyadasın?</Txt>
            <Segmented value={String(value.current)} onChange={(v) => set({ current: Number(v) })}
              options={value.steps.map((x, i) => ({ value: String(i), label: `${i + 1}. ${SHIFTS[x.type].label}` }))} />
          </View>
        </View>
      ) : null}
    </FormSection>
  );
}
