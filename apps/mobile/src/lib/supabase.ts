import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { AppState, Platform } from "react-native";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) throw new Error("apps/mobile/.env.local içinde EXPO_PUBLIC_SUPABASE_URL ve EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY olmalı");

/** Web ile aynı Supabase projesi. Oturum telefonda AsyncStorage'da saklanır, uygulama kapanınca da kalır. */
export const supabase = createClient(url, key, {
  auth: {
    ...(Platform.OS !== "web" ? { storage: AsyncStorage } : {}),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Uygulama öne gelince oturum yenileme açılır, arka plana geçince durur (pil ve gereksiz istek olmasın)
if (Platform.OS !== "web") {
  AppState.addEventListener("change", (state) => {
    if (state === "active") supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
