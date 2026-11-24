import { collectBackup, restoreBackup } from "@mesai/core/backup";
import { toCSV } from "@mesai/core/csv";
import { errorText } from "@mesai/core/errors";
import * as DocumentPicker from "expo-document-picker";
import { router } from "expo-router";
import { Download, FileJson, FileSpreadsheet, Upload } from "@/components/icons";
import { useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { SettingsGroup, SettingsRow } from "@/components/settings-list";
import { toast } from "@/components/toast";
import { Card, Screen, Txt } from "@/components/ui";
import { readText, shareCsv, shareJson } from "@/lib/export";
import { haptic } from "@/lib/haptics";
import { mutate, useProfile } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { useColors } from "@/theme";

const back = { label: "Ayarlar", onPress: () => router.back() };

/**
 * Yedekle ve geri yükle (web: /profile/data → DataSettings). Web'deki "indir" yerine dosya hazırlanınca
 * paylaş menüsü açılır; geri yüklemede telefondaki JSON yedeği seçilir.
 */
export default function DataScreen() {
  const c = useColors();
  const profile = useProfile();
  const [busy, setBusy] = useState(false);
  if (!profile) return <Screen title="Yedekleme" back={back}><Card style={{ minHeight: 192, opacity: 0.6 }} /></Screen>;
  const employee = profile.role === "employee";

  async function backup(format: "json" | "csv") {
    setBusy(true);
    try {
      // 1000 satır sınırına takılmadan tüm kayıtlar okunur (eksik yedek sessizce oluşmasın)
      const data = await collectBackup(supabase, employee);
      if (!data) { toast.error("Yedek alınamadı, tekrar dene"); return; }
      const stamp = new Date().toISOString().slice(0, 10);
      if (format === "json") await shareJson(`mesai-yedek-${stamp}.json`, JSON.stringify(data, null, 2));
      // Her tablo ayrı dosya: paylaş menüsü sırayla açılır
      else for (const [t, rows] of Object.entries(data)) if (rows.length) await shareCsv(`mesai-${t}-${stamp}.csv`, toCSV(rows));
      haptic("success");
    } catch (e) {
      toast.error(errorText(e, "Yedek alınamadı"));
    } finally { setBusy(false); }
  }
  async function restore() {
    const pick = await DocumentPicker.getDocumentAsync({ type: ["application/json", "text/plain", "*/*"], copyToCacheDirectory: true });
    if (pick.canceled || !pick.assets[0]) return;
    setBusy(true);
    try {
      const n = await restoreBackup(supabase, await readText(pick.assets[0].uri));
      await mutate.refresh.all();
      haptic("success");
      toast.success(`Geri yüklendi: ${n.entries} kayıt, ${n.shortcuts} kısayol, ${n.finance} gelir/gider, ${n.payslips} bordro`, { duration: 4000 });
    } catch (e) {
      toast.error(e instanceof SyntaxError ? "Bu dosya geçerli bir JSON yedeği değil" : errorText(e, "Geri yükleme başarısız"));
    } finally { setBusy(false); }
  }

  const dl = busy ? <ActivityIndicator size="small" color={c.mutedForeground} /> : <Download size={16} color={c.mutedForeground} />;
  return (
    <Screen title="Yedekleme" back={back}>
      <View style={{ gap: 24 }}>
        <SettingsGroup title="Yedekle" footer="JSON tam yedektir, geri yüklenebilir. CSV dosyaları Excel'de açılır.">
          <SettingsRow icon={FileJson} color="#5b91a3" label="JSON tam yedek" value={busy ? <Txt muted style={{ fontSize: 15 }}>Hazırlanıyor…</Txt> : dl}
            onPress={() => { if (!busy) void backup("json"); }} />
          <SettingsRow icon={FileSpreadsheet} color="#2f9e6e" label="CSV (Excel)" value={dl} onPress={() => { if (!busy) void backup("csv"); }} />
        </SettingsGroup>
        {employee ? (
          <SettingsGroup title="Geri yükle" footer="Yedekteki kayıtlar hesabına eklenir; mevcut kayıtların silinmez.">
            <SettingsRow icon={Upload} color="#7a6fd6" label="JSON yedeğinden geri yükle" onPress={() => { if (!busy) void restore(); }} />
          </SettingsGroup>
        ) : null}
      </View>
    </Screen>
  );
}
