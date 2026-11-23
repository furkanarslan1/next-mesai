import { Stack } from "expo-router";
import { useColors } from "@/theme";

/** Rapor sekmesi içinde yığın: Raporlar → Aylık çalışma çizelgesi (web: /reports → /reports/timesheet, sağdan kayarak). */
export default function ReportsLayout() {
  const c = useColors();
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.background } }} />;
}
