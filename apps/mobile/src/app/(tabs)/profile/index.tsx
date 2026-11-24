import { money } from "@mesai/core/calc";
import { SHIFTS } from "@mesai/core/types";
import { router, type Href } from "expo-router";
import { BadgeDollarSign, Bell, Briefcase, ChevronRight, Clock, DatabaseBackup, Palette, UserRound, Users, Zap } from "lucide-react-native";
import { Pressable, View } from "react-native";
import { SettingsGroup, SettingsRow } from "@/components/settings-list";
import { Card, Screen, Txt } from "@/components/ui";
import { haptic } from "@/lib/haptics";
import { THEME_LABEL, usePrefs } from "@/lib/prefs";
import { useLinks, useProfile, useSettings, useShortcuts } from "@/lib/store";
import { alpha, radius, useColors, useIsDark } from "@/theme";

const initials = (name: string) => name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toLocaleUpperCase("tr")).join("") || "?";
const go = (href: Href) => router.push(href);

/** Ayarlar: web'deki app/(app)/profile/page.tsx'in aynısı; her satır kendi alt sayfasına kayarak açılır. */
export default function SettingsScreen() {
  const c = useColors();
  const dark = useIsDark();
  const profile = useProfile();
  const s = useSettings();
  const shortcuts = useShortcuts();
  const links = useLinks();
  const prefs = usePrefs();

  if (!profile) return <Screen title="Ayarlar"><Card style={{ minHeight: 384, opacity: 0.6 }} /></Screen>;
  const employee = profile.role === "employee";
  const pending = (links ?? []).filter((l) => l.status === "pending").length;
  const linked = (links ?? []).filter((l) => l.status === "accepted").length;

  return (
    <Screen title="Ayarlar">
      <View style={{ gap: 28 }}>
        {/* Profil kartı → Hesap */}
        <Pressable onPress={() => { haptic(); go("/profile/account"); }}
          style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 16, padding: 16, borderRadius: radius.lg,
            backgroundColor: pressed ? c.muted : c.card, boxShadow: c.shadow.card })}>
          <View style={{ width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center", backgroundColor: c.teal,
            experimental_backgroundImage: `linear-gradient(to bottom right, ${c.teal}, ${dark ? c.ink : "#131b2b"})` }}>
            <Txt style={{ fontSize: 24, fontWeight: "600", color: "#fff" }}>{initials(profile.full_name)}</Txt>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Txt numberOfLines={1} style={{ fontSize: 22, lineHeight: 27.5, fontWeight: "600" }}>{profile.full_name || "Adını ekle"}</Txt>
            <Txt muted style={{ fontSize: 15, lineHeight: 22.5 }}>{employee ? "Çalışan" : "Yönetici"} · Hesap ve gizlilik</Txt>
          </View>
          <ChevronRight size={20} color={alpha(c.mutedForeground, 0.6)} />
        </Pressable>

        {employee ? (
          <SettingsGroup title="Çalışma">
            <SettingsRow icon={Clock} color="#3b82c4" label="Çalışma saati" chevron onPress={() => go("/profile/work")}
              value={s ? (!s.work_start || !s.work_end ? "Ayarlanmadı"
                : (s.has_shift && s.shift_type ? `${SHIFTS[s.shift_type].label} · ` : "") + `${s.work_start.slice(0, 5)}–${s.work_end.slice(0, 5)}` + ((s.saturday_off ?? true) ? "" : " · 6 gün")) : undefined} />
            <SettingsRow icon={BadgeDollarSign} color="#2f9e6e" label="Ücret ve hedef" chevron onPress={() => go("/profile/pay")}
              value={s ? (s.monthly_salary > 0 ? money(s.monthly_salary, s.currency) : "Ayarlanmadı") : undefined} />
            <SettingsRow icon={Zap} color="#e08a3c" label="Mesai kısayolları" chevron onPress={() => go("/profile/shortcuts")}
              value={shortcuts ? `${shortcuts.length}` : undefined} />
          </SettingsGroup>
        ) : null}

        {employee ? (
          <SettingsGroup title="Paylaşım">
            <SettingsRow icon={Users} color="#7a6fd6" label="Yöneticim" chevron onPress={() => go("/profile/manager")}
              value={pending ? `${pending} istek` : linked ? "Bağlı" : "Yok"} />
          </SettingsGroup>
        ) : null}

        <SettingsGroup title="Uygulama">
          <SettingsRow icon={Palette} color="#d86a9a" label="Görünüm" chevron onPress={() => go("/profile/appearance")} value={THEME_LABEL[prefs.theme]} />
          {employee ? (
            <SettingsRow icon={Bell} color="#e0603c" label="Hatırlatıcı" chevron onPress={() => go("/profile/appearance")}
              value={prefs.reminderOn ? `${String(prefs.reminderHour).padStart(2, "0")}:00` : "Kapalı"} />
          ) : null}
          <SettingsRow icon={DatabaseBackup} color="#4a5d78" label="Yedekle ve geri yükle" chevron onPress={() => go("/profile/data")} />
        </SettingsGroup>

        <SettingsGroup>
          <SettingsRow icon={employee ? UserRound : Briefcase} color="#7f8f9c" label="Hesap" chevron onPress={() => go("/profile/account")} />
        </SettingsGroup>

        <Txt muted style={{ paddingBottom: 8, textAlign: "center", fontSize: 13 }}>Mesai · verilerin yalnızca senin hesabında saklanır</Txt>
      </View>
    </Screen>
  );
}
