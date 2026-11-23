import { Pressable, Switch, TextInput, View } from "react-native";
import { haptic } from "@/lib/haptics";
import { radius, useColors } from "@/theme";
import { Txt } from "./ui";

/** iOS tarzı bölümlü seçim (web'deki Segmented). */
export function Segmented<T extends string>({ value, options, onChange }: {
  value: T; options: { value: T; label: string; disabled?: boolean }[]; onChange: (v: T) => void;
}) {
  const c = useColors();
  return (
    <View style={{ flexDirection: "row", backgroundColor: c.muted, borderRadius: radius.pill, padding: 3 }} accessibilityRole="radiogroup">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable key={o.value} disabled={o.disabled} accessibilityRole="radio" accessibilityState={{ selected: on, disabled: o.disabled }}
            onPress={() => { if (!on) { haptic(); onChange(o.value); } }}
            style={{ flex: 1, paddingVertical: 9, borderRadius: radius.pill, alignItems: "center", backgroundColor: on ? c.card : "transparent", opacity: o.disabled ? 0.4 : 1,
              shadowColor: "#000", shadowOpacity: on ? 0.08 : 0, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: on ? 1 : 0 }}>
            <Txt style={{ fontSize: 14, fontWeight: on ? "600" : "500" }}>{o.label}</Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Gruplu ayar satırları kutusu (web'deki FormSection). */
export function FormSection({ children, footer }: { children: React.ReactNode; footer?: React.ReactNode }) {
  const c = useColors();
  return (
    <View style={{ gap: 6 }}>
      <View style={{ backgroundColor: c.muted, borderRadius: radius.lg, overflow: "hidden" }}>{children}</View>
      {footer ? <Txt muted style={{ fontSize: 12, paddingHorizontal: 4 }}>{footer}</Txt> : null}
    </View>
  );
}

export function SwitchRow({ label, hint, value, onChange }: { label: string; hint?: string; value: boolean; onChange: (v: boolean) => void }) {
  const c = useColors();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 12, minHeight: 52 }}>
      <View style={{ flex: 1 }}>
        <Txt style={{ fontSize: 15, fontWeight: "500" }}>{label}</Txt>
        {hint ? <Txt muted style={{ fontSize: 12 }}>{hint}</Txt> : null}
      </View>
      <Switch value={value} onValueChange={(v) => { haptic(); onChange(v); }} trackColor={{ true: c.ring }} />
    </View>
  );
}

/** Sayı girişi satırı: "2,5" gibi Türkçe ondalık kabul eder (core/num ile okunur). */
export function NumberRow({ label, suffix, value, onChange, placeholder, autoFocus }: {
  label: string; suffix?: string; value: string; onChange: (v: string) => void; placeholder?: string; autoFocus?: boolean;
}) {
  const c = useColors();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, minHeight: 52 }}>
      <Txt style={{ flex: 1, fontSize: 15, fontWeight: "500" }}>{label}</Txt>
      <TextInput value={value} onChangeText={(t) => onChange(t.replace(/[^0-9.,]/g, ""))} placeholder={placeholder} autoFocus={autoFocus}
        keyboardType="decimal-pad" placeholderTextColor={c.mutedForeground}
        style={{ minWidth: 80, textAlign: "right", fontSize: 17, fontWeight: "600", color: c.foreground, paddingVertical: 10 }} />
      {suffix ? <Txt muted>{suffix}</Txt> : null}
    </View>
  );
}
