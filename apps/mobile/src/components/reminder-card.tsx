import { BellRing, X } from "@/components/icons";
import { useEffect, useState } from "react";
import { AppState, Pressable } from "react-native";
import { setPrefs, usePrefs } from "@/lib/prefs";
import { radius, useColors } from "@/theme";
import { Button, Card, Txt } from "./ui";

/** Saat dakikada bir ve uygulama öne gelince yenilenir: hatırlatma saati gelince kart kendiliğinden çıkar */
function useHour() {
  const [h, setH] = useState(() => new Date().getHours());
  useEffect(() => {
    const tick = () => setH(new Date().getHours());
    const id = setInterval(tick, 60_000);
    const sub = AppState.addEventListener("change", (s) => { if (s === "active") tick(); });
    return () => { clearInterval(id); sub.remove(); };
  }, []);
  return h;
}

/**
 * Akşam hatırlatıcısı (web: ReminderCard, uygulama açıkken): bugüne bakılıyorsa, saat ayarlanan saati geçtiyse
 * ve o güne hiç kayıt girilmediyse görünür. "Yapmadım" ya da kapatma o gün için bir daha göstermez.
 */
export function ReminderCard({ todayStr, hasRecords, isToday }: { todayStr: string; hasRecords: boolean; isToday: boolean }) {
  const c = useColors();
  const p = usePrefs();
  const hour = useHour();
  if (!p.reminderOn || !isToday || hasRecords || p.reminderDismissed === todayStr || hour < p.reminderHour) return null;
  const dismiss = () => setPrefs({ reminderDismissed: todayStr });
  return (
    <Card size="lg" accessibilityRole="summary" style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 12 }}>
      <BellRing size={20} color={c.teal} />
      <Txt style={{ flex: 1, fontSize: 14, lineHeight: 20 }}>
        <Txt style={{ fontSize: 14, fontWeight: "700" }}>Bugün mesai yaptın mı?</Txt> Yaptıysan eklemeyi unutma; yapmadıysan kayıt girmen gerekmez.
      </Txt>
      <Button title="Yapmadım" size="sm" variant="secondary" onPress={dismiss} />
      <Pressable onPress={dismiss} accessibilityLabel="Kapat" hitSlop={6}
        style={({ pressed }) => ({ width: 32, height: 32, borderRadius: radius.pill, alignItems: "center", justifyContent: "center", backgroundColor: pressed ? c.muted : "transparent" })}>
        <X size={16} color={c.mutedForeground} />
      </Pressable>
    </Card>
  );
}
