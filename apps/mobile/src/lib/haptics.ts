import * as Haptics from "expo-haptics";

/** Dokunma titreşimi: "tap" seçim, "success" başarı (web'deki haptic() karşılığı). */
export function haptic(kind: "tap" | "success" | "warning" = "tap") {
  if (kind === "success") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  else if (kind === "warning") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  else void Haptics.selectionAsync();
}
