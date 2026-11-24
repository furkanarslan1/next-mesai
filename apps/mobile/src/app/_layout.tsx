import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { ConfirmHost } from "@/components/dialog";
import { Toaster } from "@/components/toast";
import { AuthProvider, useSession } from "@/lib/auth";
import { useColors, useIsDark } from "@/theme";

SplashScreen.preventAutoHideAsync();

function RootStack() {
  const session = useSession();
  const c = useColors();
  // Oturum okunana kadar açılış ekranı kalır: giriş sayfası bir an görünüp kaybolmasın
  useEffect(() => { if (session !== undefined) SplashScreen.hideAsync(); }, [session]);
  if (session === undefined) return null;
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.background } }}>
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="(tabs)" />
      </Stack.Protected>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="login" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  // Ayarlar → Görünüm'de seçilen tema durum çubuğuna da uygulanır
  const dark = useIsDark();
  return (
    <AuthProvider>
      <StatusBar style={dark ? "light" : "dark"} />
      <RootStack />
      <ConfirmHost />
      <Toaster />
    </AuthProvider>
  );
}
