import { errorText } from "@mesai/core/errors";
import * as Clipboard from "expo-clipboard";
import { router } from "expo-router";
import { Pressable, View } from "react-native";
import { SettingsGroup } from "@/components/settings-list";
import { toast } from "@/components/toast";
import { Button, Card, Screen, Txt } from "@/components/ui";
import { haptic } from "@/lib/haptics";
import { mutate, useLinks, useProfile } from "@/lib/store";
import { useColors } from "@/theme";

const back = { label: "Ayarlar", onPress: () => router.back() };

/** Yöneticim (web: /profile/manager → ManagerSettings): davet kodu ve yönetici isteklerini onaylama/kaldırma. */
export default function ManagerScreen() {
  const c = useColors();
  const profile = useProfile();
  const links = useLinks();
  if (!profile) return <Screen title="Yöneticim" back={back}><Card style={{ minHeight: 192, opacity: 0.6 }} /></Screen>;

  async function respond(id: string, status: "accepted" | "revoked") {
    try { await mutate.respondLink(id, status); haptic(); toast.success(status === "accepted" ? "Onaylandı" : "Erişim kaldırıldı"); }
    catch (e) { toast.error(errorText(e, "İşlem başarısız")); }
  }
  async function copy() {
    try { await Clipboard.setStringAsync(profile!.invite_code); haptic(); toast.success("Davet kodu kopyalandı"); }
    catch { toast.info(profile!.invite_code); }
  }
  const visible = (links ?? []).filter((l) => l.status !== "revoked");

  return (
    <Screen title="Yöneticim" back={back}>
      <View style={{ gap: 24 }}>
        <SettingsGroup title="Davet kodun" footer="Yöneticin bu kodla istek gönderir; onay senin elinde. Yönetici yalnızca mesai/izin kayıtlarını görür; ücret, hedef ve gelir-gider bilgilerin gizli kalır.">
          <Pressable onPress={copy} accessibilityRole="button" accessibilityLabel="Davet kodunu kopyala"
            style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, paddingHorizontal: 16, paddingVertical: 16, backgroundColor: pressed ? c.muted : "transparent" })}>
            <Txt selectable style={{ fontFamily: "monospace", fontSize: 24, lineHeight: 32, fontWeight: "700", letterSpacing: 6 }}>{profile.invite_code}</Txt>
            <Txt style={{ fontSize: 15, color: c.tint }}>Kopyala</Txt>
          </Pressable>
        </SettingsGroup>
        <SettingsGroup title="Yöneticiler">
          {links === null ? <View style={{ height: 52, opacity: 0.5 }} /> : null}
          {links !== null && visible.length === 0 ? <Txt muted style={{ paddingHorizontal: 16, paddingVertical: 16, fontSize: 15, lineHeight: 22.5 }}>Bağlı yöneticin yok. Tek başına da kullanabilirsin.</Txt> : null}
          {visible.map((l) => (
            <View key={l.id} style={{ minHeight: 52, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, paddingHorizontal: 16, paddingVertical: 8 }}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Txt numberOfLines={1} style={{ fontSize: 17 }}>{l.name || "Yönetici"}</Txt>
                <Txt muted style={{ fontSize: 13 }}>{l.status === "accepted" ? "Bağlı" : "Onay bekliyor"}</Txt>
              </View>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {l.status === "pending" ? <Button title="Onayla" size="sm" onPress={() => respond(l.id, "accepted")} /> : null}
                <Button title={l.status === "pending" ? "Reddet" : "Kaldır"} size="sm" variant="secondary" onPress={() => respond(l.id, "revoked")} />
              </View>
            </View>
          ))}
        </SettingsGroup>
      </View>
    </Screen>
  );
}
