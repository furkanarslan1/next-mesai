import * as Haptics from "expo-haptics";
import { Alert } from "react-native";

/** Dokunma titreşimi: "tap" seçim, "success" başarı (web'deki haptic() karşılığı). */
export function haptic(kind: "tap" | "success" | "warning" = "tap") {
  if (kind === "success") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  else if (kind === "warning") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  else void Haptics.selectionAsync();
}

/** Evet/Hayır sorusu (web'deki onay penceresi): telefonun kendi uyarı penceresiyle. */
export function confirm({ title, desc, yes, run, destructive }: { title: string; desc?: string; yes: string; run: () => void; destructive?: boolean }) {
  Alert.alert(title, desc, [
    { text: "Hayır", style: "cancel" },
    { text: yes, style: destructive ? "destructive" : "default", onPress: () => { haptic(); run(); } },
  ]);
}
