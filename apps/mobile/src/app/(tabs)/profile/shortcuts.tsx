import { errorText } from "@mesai/core/errors";
import { parseNum } from "@mesai/core/num";
import { router } from "expo-router";
import { Plus, Trash2 } from "@/components/icons";
import { useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { SettingsGroup } from "@/components/settings-list";
import { SwipeRow } from "@/components/swipe-row";
import { toast } from "@/components/toast";
import { Button, Screen, Txt } from "@/components/ui";
import { haptic } from "@/lib/haptics";
import { mutate, useProfile, useShortcuts } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { alpha, useColors } from "@/theme";

const fmtHours = (h: number) => `${(+h.toFixed(2)).toLocaleString("tr-TR", { maximumFractionDigits: 2 })} saat`;
const back = { label: "Ayarlar", onPress: () => router.back() };

/** Mesai kısayolları (web: /profile/shortcuts → ShortcutSettings): sola kaydırarak ya da çöp kutusuyla sil, en fazla 8. */
export default function ShortcutsScreen() {
  const c = useColors();
  const shortcuts = useShortcuts();
  const userId = useProfile()?.id;
  const [v, setV] = useState("");
  const list = shortcuts ?? [];
  const h = parseNum(v);
  const valid = h > 0 && h <= 24 && !list.some((s) => Number(s.hours) === h) && list.length < 8;

  async function add() {
    if (!valid || !userId) return;
    const { error } = await supabase.from("shortcuts").insert({
      user_id: userId, label: fmtHours(h), hours: h, sort: Math.max(0, ...list.map((s) => s.sort)) + 1,
    });
    if (error) { toast.error(errorText(error, "Eklenemedi")); return; }
    haptic("success"); setV("");
    await mutate.refresh.shortcuts();
  }
  async function remove(id: string) {
    const { error } = await supabase.from("shortcuts").delete().eq("id", id);
    if (error) { toast.error(errorText(error, "Silinemedi")); return; }
    await mutate.refresh.shortcuts();
  }

  return (
    <Screen title="Kısayollar" back={back}>
      <View style={{ gap: 24 }}>
        <SettingsGroup title="Kısayollar" footer="Ana sayfada tek dokunuşla o güne mesai ekler. Silmek için satırı sola kaydır. En fazla 8 kısayol.">
          {shortcuts === null ? <View style={{ height: 52, opacity: 0.5 }} /> : null}
          {shortcuts?.length === 0 ? <Txt muted style={{ paddingHorizontal: 16, paddingVertical: 16, fontSize: 15, lineHeight: 22.5 }}>Henüz kısayol yok.</Txt> : null}
          {list.map((s) => (
            <SwipeRow key={s.id} onDelete={() => remove(s.id)}>
              <View style={{ minHeight: 52, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, paddingHorizontal: 16 }}>
                <Txt style={{ fontSize: 17, fontWeight: "500", fontVariant: ["tabular-nums"] }}>{fmtHours(Number(s.hours))}</Txt>
                <Pressable onPress={() => { haptic(); void remove(s.id); }} accessibilityLabel={`${fmtHours(Number(s.hours))} kısayolunu sil`} hitSlop={6}
                  style={({ pressed }) => ({ width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: pressed ? c.muted : "transparent" })}>
                  <Trash2 size={16} color={c.mutedForeground} />
                </Pressable>
              </View>
            </SwipeRow>
          ))}
        </SettingsGroup>
        <SettingsGroup title="Yeni kısayol">
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 8 }}>
            <TextInput value={v} onChangeText={(t) => setV(t.replace(/[^0-9.,]/g, ""))} placeholder="Örn. 2,5" placeholderTextColor={alpha(c.mutedForeground, 0.5)}
              keyboardType="decimal-pad" returnKeyType="done" onSubmitEditing={() => void add()} accessibilityLabel="Mesai saati"
              style={{ flex: 1, minWidth: 0, height: 44, fontSize: 17, fontWeight: v ? "600" : "400", fontVariant: ["tabular-nums"], color: c.foreground, padding: 0 }} />
            <Txt muted style={{ fontSize: 15 }}>saat</Txt>
            <Button title="Ekle" size="sm" disabled={!valid} icon={<Plus size={16} color={c.primaryForeground} />} onPress={() => void add()} />
          </View>
        </SettingsGroup>
      </View>
    </Screen>
  );
}
