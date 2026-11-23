"use client";

import { parseNum } from "@mesai/core/num";
import { useId, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { haptic } from "@/lib/haptics";

/**
 * iOS tarzı form parçaları: gruplanmış satırlar, sağa yaslı büyük sayı girişleri, segmentli kontrol ve oran seçici.
 * Her satır en az 52 px yüksekliktedir (parmakla rahat basılır), alanlar 16 px+ olduğu için iOS yakınlaştırmaz.
 * `tone="muted"` kartın/panelin içinde, `tone="card"` sayfa zemini üzerinde kullanılır.
 */
type Tone = "card" | "muted";
const toneBg = (t: Tone) => (t === "card" ? "bg-card" : "bg-muted");

export function FormSection({ title, footer, tone = "card", children }: { title?: string; footer?: React.ReactNode; tone?: Tone; children: React.ReactNode }) {
  return (
    <section className="space-y-1.5">
      {title && <h3 className="px-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</h3>}
      <div className={`overflow-hidden rounded-[var(--r-lg)] ${toneBg(tone)} [&>*+*]:border-t [&>*+*]:border-border/60`}>{children}</div>
      {footer && <p className="px-4 text-xs leading-relaxed text-muted-foreground">{footer}</p>}
    </section>
  );
}

/** Etiket solda, içerik sağda; tüm satır dokunulabilir (etiket içindeki alana odaklanır). */
export function FormRow({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="flex min-h-[3.25rem] cursor-pointer items-center justify-between gap-3 px-4 py-2">
      <span className="shrink-0 text-[15px] font-medium leading-tight">
        {label}
        {hint && <span className="mt-0.5 block text-xs font-normal text-muted-foreground">{hint}</span>}
      </span>
      <span className="flex min-w-0 flex-1 items-center justify-end gap-1.5">{children}</span>
    </label>
  );
}

export function NumberRow({ label, hint, value, onChange, suffix, placeholder = "0", inputMode = "decimal" }: {
  label: string; hint?: string; value: string; onChange: (v: string) => void; suffix?: string; placeholder?: string; inputMode?: "decimal" | "numeric";
}) {
  return (
    <FormRow label={label} hint={hint}>
      <input
        inputMode={inputMode} placeholder={placeholder} value={value} aria-label={label}
        onChange={(e) => onChange(e.target.value.replace(/[^0-9.,]/g, ""))}
        className="h-11 w-full min-w-0 bg-transparent text-right text-[17px] font-semibold tabular-nums outline-none placeholder:font-normal placeholder:text-muted-foreground/50"
      />
      {suffix && <span className="shrink-0 text-[15px] text-muted-foreground">{suffix}</span>}
    </FormRow>
  );
}

export function SwitchRow({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <FormRow label={label} hint={hint}>
      <Switch checked={checked} onCheckedChange={(v) => { haptic(); onChange(v); }} aria-label={label} />
    </FormRow>
  );
}

/** iOS segmentli kontrol: gri zemin, seçili parça beyaz hap. */
export function Segmented<T extends string | number>({ options, value, onChange, label }: {
  options: { value: T; label: string; disabled?: boolean }[]; value: T; onChange: (v: T) => void; label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex gap-1 rounded-full bg-muted p-1">
      {options.map((o) => (
        <button key={String(o.value)} type="button" role="radio" aria-checked={value === o.value} disabled={o.disabled}
          onClick={() => { if (value !== o.value) haptic(); onChange(o.value); }}
          className={`h-10 min-w-0 flex-1 rounded-full px-2 text-sm font-semibold transition active:scale-[0.97] disabled:opacity-40 ${
            value === o.value ? "bg-background text-foreground shadow-sm dark:bg-accent dark:text-accent-foreground" : "text-muted-foreground"
          }`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

const PRESETS = [100, 125, 150, 200];
/** Mesai oranı seçici: hazır yüzdeler tek dokunuşla, "Özel" ile istediğin değer. */
export function PercentRow({ label, hint, value, onChange }: { label: string; hint?: string; value: number; onChange: (v: number) => void }) {
  const id = useId();
  const [custom, setCustom] = useState(!PRESETS.includes(value));
  const chip = (active: boolean) =>
    `h-11 rounded-full text-[15px] font-semibold tabular-nums transition active:scale-95 ${active ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`;
  return (
    <div className="space-y-2.5 px-4 py-3" role="group" aria-labelledby={id}>
      <div className="flex items-baseline justify-between gap-3">
        <span id={id} className="text-[15px] font-medium">{label}</span>
        <span className="text-[15px] font-semibold tabular-nums">%{(+value.toFixed(2)).toLocaleString("tr-TR")}</span>
      </div>
      <div className="grid grid-cols-5 gap-1.5">
        {PRESETS.map((p) => (
          <button key={p} type="button" aria-pressed={!custom && value === p} className={chip(!custom && value === p)} onClick={() => { haptic(); setCustom(false); onChange(p); }}>%{p}</button>
        ))}
        <button type="button" aria-pressed={custom} className={chip(custom)} onClick={() => setCustom(true)}>Özel</button>
      </div>
      {custom && (
        <div className="flex items-center gap-2 rounded-full bg-muted px-4">
          <span className="text-muted-foreground">%</span>
          <input inputMode="decimal" aria-label={`${label} özel oran`} value={String(value || "")} placeholder="Örn. 175"
            onChange={(e) => { const n = parseNum(e.target.value); onChange(Number.isFinite(n) ? Math.min(500, Math.max(0, n)) : 0); }}
            className="h-11 w-full bg-transparent text-[17px] font-semibold tabular-nums outline-none" />
        </div>
      )}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
