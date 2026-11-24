import { Stack } from "expo-router";
import { useColors } from "@/theme";

/** Ayarlar sekmesi içinde yığın: Ayarlar → alt sayfalar (web: /profile → /profile/*, sağdan kayarak). */
export default function ProfileLayout() {
  const c = useColors();
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.background } }} />;
}
