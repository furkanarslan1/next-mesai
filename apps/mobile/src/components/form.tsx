import { Children, Fragment, isValidElement, useEffect, useState } from "react";
import { Animated, Pressable, TextInput, View } from "react-native";
import { haptic } from "@/lib/haptics";
import { alpha, radius, useColors, useIsDark } from "@/theme";
import { Txt } from "./ui";

/**
 * Web'deki iOS form parçalarının (components/mesai/ios-form.tsx) aynısı: gruplanmış satırlar (en az 52px),
 * sağa yaslı 17px sayı girişleri, segmentli kontrol ve küçük anahtar.
 * `tone="muted"` kart/pencere içinde, `tone="card"` sayfa zemininde.
 */
export function FormSection({ children, footer, title, tone = "card" }: { children: React.ReactNode; footer?: React.ReactNode; title?: string; tone?: "card" | "muted" }) {
  const c = useColors();
  const rows = Children.toArray(children).filter((x) => isValidElement(x));
  return (
    <View style={{ gap: 6 }}>
      {title ? <Txt muted style={{ paddingHorizontal: 16, fontSize: 12, lineHeight: 16, fontWeight: "500", letterSpacing: 0.3, textTransform: "uppercase" }}>{title}</Txt> : null}
      <View style={{ backgroundColor: tone === "card" ? c.card : c.muted, borderRadius: radius.lg, overflow: "hidden" }}>
        {rows.map((r, i) => (
          <Fragment key={i}>
            {i > 0 ? <View style={{ height: 1, backgroundColor: alpha(c.border, 0.6) }} /> : null}
            {r}
          </Fragment>
        ))}
      </View>
      {footer ? <Txt muted style={{ fontSize: 12, lineHeight: 19.5, paddingHorizontal: 16 }}>{footer}</Txt> : null}
    </View>
  );
}

/** Etiket solda, içerik sağda (web: FormRow). */
export function FormRow({ label, hint, children, onPress }: { label: string; hint?: string; children: React.ReactNode; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} disabled={!onPress}
      style={{ minHeight: 52, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, paddingHorizontal: 16, paddingVertical: 8 }}>
      <View style={{ flexShrink: 0 }}>
        <Txt style={{ fontSize: 15, lineHeight: 18.75, fontWeight: "500" }}>{label}</Txt>
        {hint ? <Txt muted style={{ fontSize: 12, lineHeight: 16, marginTop: 2 }}>{hint}</Txt> : null}
      </View>
      <View style={{ flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 6 }}>{children}</View>
    </Pressable>
  );
}

export function NumberRow({ label, hint, suffix, value, onChange, placeholder = "0", autoFocus }: {
  label: string; hint?: string; suffix?: string; value: string; onChange: (v: string) => void; placeholder?: string; autoFocus?: boolean;
}) {
  const c = useColors();
  return (
    <FormRow label={label} hint={hint}>
      <TextInput value={value} onChangeText={(t) => onChange(t.replace(/[^0-9.,]/g, ""))} placeholder={placeholder} autoFocus={autoFocus}
        keyboardType="decimal-pad" placeholderTextColor={alpha(c.mutedForeground, 0.5)} accessibilityLabel={label}
        style={{ flex: 1, minWidth: 0, height: 44, textAlign: "right", fontSize: 17, fontWeight: value ? "600" : "400", fontVariant: ["tabular-nums"], color: c.foreground, padding: 0 }} />
      {suffix ? <Txt muted style={{ fontSize: 15 }}>{suffix}</Txt> : null}
    </FormRow>
  );
}

/** Web'deki küçük anahtar (32×18.4, 16px düğme). */
export function Switch({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label?: string }) {
  const c = useColors();
  const dark = useIsDark();
  const [x] = useState(() => new Animated.Value(value ? 1 : 0));
  useEffect(() => { Animated.timing(x, { toValue: value ? 1 : 0, duration: 150, useNativeDriver: true }).start(); }, [value, x]);
  const track = value ? c.primary : dark ? "rgba(41, 61, 81, 0.8)" : "#c0d4dc";
  const thumb = dark ? (value ? c.primaryForeground : c.foreground) : c.background;
  return (
    <Pressable accessibilityRole="switch" accessibilityState={{ checked: value }} accessibilityLabel={label} hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}
      onPress={() => { haptic(); onChange(!value); }}
      style={{ width: 32, height: 18.4, borderRadius: radius.pill, padding: 1, backgroundColor: track, justifyContent: "center" }}>
      <Animated.View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: thumb, transform: [{ translateX: x.interpolate({ inputRange: [0, 1], outputRange: [0, 14] }) }] }} />
    </Pressable>
  );
}

export function SwitchRow({ label, hint, value, onChange }: { label: string; hint?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <FormRow label={label} hint={hint} onPress={() => { haptic(); onChange(!value); }}>
      <Switch value={value} onChange={onChange} label={label} />
    </FormRow>
  );
}

/** iOS segmentli kontrol (web: gri zemin, seçili parça açık temada zemin rengi, koyuda accent). */
export function Segmented<T extends string>({ value, options, onChange }: {
  value: T; options: { value: T; label: string; disabled?: boolean }[]; onChange: (v: T) => void;
}) {
  const c = useColors();
  const dark = useIsDark();
  return (
    <View accessibilityRole="radiogroup" style={{ flexDirection: "row", gap: 4, backgroundColor: c.muted, borderRadius: radius.pill, padding: 4 }}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable key={o.value} disabled={o.disabled} accessibilityRole="radio" accessibilityState={{ selected: on, disabled: o.disabled }}
            onPress={() => { if (!on) haptic(); onChange(o.value); }}
            style={({ pressed }) => ({
              flex: 1, height: 40, paddingHorizontal: 8, borderRadius: radius.pill, alignItems: "center", justifyContent: "center",
              backgroundColor: on ? (dark ? "#223245" : c.background) : "transparent", opacity: o.disabled ? 0.4 : 1,
              boxShadow: on ? "0px 1px 3px rgba(0,0,0,0.1), 0px 1px 2px -1px rgba(0,0,0,0.1)" : undefined,
              transform: [{ scale: pressed ? 0.97 : 1 }],
            })}>
            <Txt numberOfLines={1} style={{ fontSize: 14, fontWeight: "600", color: on ? c.foreground : c.mutedForeground }}>{o.label}</Txt>
          </Pressable>
        );
      })}
    </View>
  );
}
