import { Children, Fragment, isValidElement, useEffect, useState } from "react";
import DateTimePicker from "@react-native-community/datetimepicker";
import { parseNum } from "@mesai/core/num";
import { Animated, Platform, Pressable, TextInput, View } from "react-native";
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
      <TextInput maxFontSizeMultiplier={1.35} value={value} onChangeText={(t) => onChange(t.replace(/[^0-9.,]/g, ""))} placeholder={placeholder} autoFocus={autoFocus}
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

const PRESETS = [100, 125, 150, 200];
/** Mesai oranı seçici (web: PercentRow): hazır yüzdeler tek dokunuşla, "Özel" ile istediğin değer. */
export function PercentRow({ label, hint, value, onChange }: { label: string; hint?: string; value: number; onChange: (v: number) => void }) {
  const c = useColors();
  const [custom, setCustom] = useState(!PRESETS.includes(value));
  const chip = (active: boolean, text: string, onPress: () => void) => (
    <Pressable key={text} accessibilityRole="button" accessibilityState={{ selected: active }} onPress={onPress}
      style={({ pressed }) => ({ flex: 1, height: 44, borderRadius: radius.pill, alignItems: "center", justifyContent: "center",
        backgroundColor: active ? c.primary : c.muted, transform: [{ scale: pressed ? 0.95 : 1 }] })}>
      <Txt style={{ fontSize: 15, fontWeight: "600", fontVariant: ["tabular-nums"], color: active ? c.primaryForeground : c.foreground }}>{text}</Txt>
    </Pressable>
  );
  return (
    <View style={{ gap: 10, paddingHorizontal: 16, paddingVertical: 12 }} accessibilityLabel={label}>
      <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
        <Txt style={{ fontSize: 15, lineHeight: 22.5, fontWeight: "500" }}>{label}</Txt>
        <Txt style={{ fontSize: 15, lineHeight: 22.5, fontWeight: "600", fontVariant: ["tabular-nums"] }}>%{(+value.toFixed(2)).toLocaleString("tr-TR")}</Txt>
      </View>
      <View style={{ flexDirection: "row", gap: 6 }}>
        {PRESETS.map((p) => chip(!custom && value === p, `%${p}`, () => { haptic(); setCustom(false); onChange(p); }))}
        {chip(custom, "Özel", () => setCustom(true))}
      </View>
      {custom ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, borderRadius: radius.pill, backgroundColor: c.muted, paddingHorizontal: 16 }}>
          <Txt muted>%</Txt>
          <TextInput maxFontSizeMultiplier={1.35} value={String(value || "")} placeholder="Örn. 175" placeholderTextColor={alpha(c.mutedForeground, 0.5)} keyboardType="decimal-pad"
            accessibilityLabel={`${label} özel oran`}
            onChangeText={(t) => { const n = parseNum(t); onChange(Number.isFinite(n) ? Math.min(500, Math.max(0, n)) : 0); }}
            style={{ flex: 1, height: 44, fontSize: 17, fontWeight: "600", fontVariant: ["tabular-nums"], color: c.foreground, padding: 0 }} />
        </View>
      ) : null}
      {hint ? <Txt muted style={{ fontSize: 12, lineHeight: 16 }}>{hint}</Txt> : null}
    </View>
  );
}

const toDate = (hm: string) => { const d = new Date(); const [h, m] = (hm || "08:00").split(":").map(Number); d.setHours(h, m, 0, 0); return d; };
const fromDate = (d: Date) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

/**
 * Saat satırı (web: type="time" alanı): sağda hap içinde saat; dokununca Android'de saat penceresi,
 * iPhone'da satırın altında tekerlek açılır.
 */
export function TimeRow({ label, value, onChange, tone = "card" }: { label: string; value: string; onChange: (v: string) => void; tone?: "card" | "muted" }) {
  const c = useColors();
  const dark = useIsDark();
  const [open, setOpen] = useState(false);
  const pillBg = tone === "card" ? c.muted : dark ? c.background : c.card;
  return (
    <View>
      <FormRow label={label} onPress={() => { haptic(); setOpen(!open); }}>
        <View style={{ height: 44, paddingHorizontal: 16, borderRadius: radius.pill, justifyContent: "center", backgroundColor: pillBg }}>
          <Txt style={{ fontSize: 17, fontWeight: "600", fontVariant: ["tabular-nums"], color: open ? c.tint : c.foreground }}>{value || "--:--"}</Txt>
        </View>
      </FormRow>
      {open ? (
        <DateTimePicker mode="time" is24Hour locale="tr-TR" display={Platform.OS === "ios" ? "spinner" : "default"} value={toDate(value)}
          onChange={(ev, d) => {
            if (Platform.OS !== "ios") setOpen(false);
            if (ev.type === "set" && d) onChange(fromDate(d));
          }} />
      ) : null}
    </View>
  );
}
