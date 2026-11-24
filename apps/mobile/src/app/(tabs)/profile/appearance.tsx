import { router } from "expo-router";
import { Check, Moon, Sun, SunMoon } from "@/components/icons";
import { useState } from "react";
import { View } from "react-native";
import { FormRow, FormSection, Segmented, SwitchRow } from "@/components/form";
import { Screen, Txt } from "@/components/ui";
import { haptic } from "@/lib/haptics";
import { setPrefs, THEME_LABEL, usePrefs, type ThemePref } from "@/lib/prefs";
import { alpha, radius, useColors } from "@/theme";

const THEME_ICON = { light: Sun, dark: Moon, system: SunMoon };
const HOURS = [17, 18, 19, 20, 21, 22, 23];
const back = { label: "Ayarlar", onPress: () => router.back() };

/** Görünüm ve akşam hatırlatıcısı (web: /profile/appearance → AppearanceSettings): bu telefona özel tercihler. */
export default function AppearanceScreen() {
  const c = useColors();
  const p = usePrefs();
  const [pickHour, setPickHour] = useState(false);
  const hourText = (h: number) => `${String(h).padStart(2, "0")}:00 sonrası`;

  return (
    <Screen title="Görünüm" back={back}>
      <FormSection title="Tema" footer="Sistem: telefonun açık/koyu ayarını izler.">
        <View style={{ padding: 12 }}>
          <Segmented value={p.theme} onChange={(t) => setPrefs({ theme: t })}
            options={(["light", "dark", "system"] as ThemePref[]).map((t) => ({ value: t, label: THEME_LABEL[t] }))} />
        </View>
        <View style={{ flexDirection: "row", justifyContent: "center", gap: 24, paddingVertical: 16 }}>
          {(["light", "dark", "system"] as ThemePref[]).map((t) => {
            const Icon = THEME_ICON[t];
            const on = p.theme === t;
            return <View key={t} style={{ transform: [{ scale: on ? 1.1 : 1 }] }}><Icon size={24} color={on ? c.tint : alpha(c.mutedForeground, 0.4)} /></View>;
          })}
        </View>
      </FormSection>

      <FormSection title="Hatırlatıcı" footer="Uygulama açıkken, ayarladığın saatten sonra o güne kayıt girmediysen hatırlatır.">
        <SwitchRow label="Akşam hatırlatıcısı" value={p.reminderOn} onChange={(v) => { setPrefs({ reminderOn: v }); if (!v) setPickHour(false); }} />
        {p.reminderOn ? (
          <FormRow label="Saat" onPress={() => { haptic(); setPickHour(!pickHour); }}>
            <View style={{ height: 44, paddingHorizontal: 16, borderRadius: radius.pill, justifyContent: "center", backgroundColor: c.muted }}>
              <Txt style={{ fontSize: 16, fontWeight: "600", color: pickHour ? c.tint : c.foreground }}>{hourText(p.reminderHour)}</Txt>
            </View>
          </FormRow>
        ) : null}
        {/* Saat listesi (web: <select>): satırın altında açılır */}
        {p.reminderOn && pickHour ? (
          <View>
            {HOURS.map((h, i) => (
              <View key={h}>
                {i > 0 ? <View style={{ height: 1, marginLeft: 16, backgroundColor: alpha(c.border, 0.6) }} /> : null}
                <FormRow label={hourText(h)} onPress={() => { haptic(); setPrefs({ reminderHour: h }); setPickHour(false); }}>
                  {p.reminderHour === h ? <Check size={18} color={c.tint} /> : null}
                </FormRow>
              </View>
            ))}
          </View>
        ) : null}
      </FormSection>
    </Screen>
  );
}
