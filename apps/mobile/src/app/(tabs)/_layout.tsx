import { Tabs } from "expo-router/js-tabs";
import { TabBar } from "@/components/tab-bar";
import { useColors } from "@/theme";

export default function TabsLayout() {
  const c = useColors();
  return (
    <Tabs tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: c.background }, animation: "fade" }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="calendar" />
      <Tabs.Screen name="finance" />
      <Tabs.Screen name="reports" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
