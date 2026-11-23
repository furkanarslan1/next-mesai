/**
 * Mobil tarafı: ortak önbelleği (`@mesai/core/store`) telefona bağlar ve React hook'larını verir.
 * Web ile aynı kurallar: dilim bir kez yüklenir, sekme geçişleri DB'ye gitmez, süresi dolan dilim
 * uygulama öne gelince arka planda yenilenir.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  configureStore, getState, hydrateProfile, load, retain, revalidateStale, subscribe,
} from "@mesai/core/store";
import type { Entry, Profile } from "@mesai/core/types";
import { useEffect, useSyncExternalStore } from "react";
import { AppState } from "react-native";
import { supabase } from "./supabase";

export { DEFAULT_SETTINGS, load, monthKey, mutate, resetStore } from "@mesai/core/store";

const PROFILE_KEY = "mesai.profile";
configureStore({
  client: () => supabase,
  saveProfile: (p) => { void AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(p)); },
  clearProfile: () => { void AsyncStorage.removeItem(PROFILE_KEY); },
});
// Profil (ad, rol) bir sonraki açılışta hemen görünsün
AsyncStorage.getItem(PROFILE_KEY)
  .then((raw) => { if (raw) hydrateProfile(JSON.parse(raw) as Profile); })
  .catch(() => {});

AppState.addEventListener("change", (s) => { if (s === "active") revalidateStale(); });

const NO_ENTRIES: Record<string, Entry[]> = {};
function useActive(ids: string[]) {
  const joined = ids.join(",");
  useEffect(() => retain(joined.split(",").filter(Boolean)), [joined]);
}

export function useProfile() {
  const v = useSyncExternalStore(subscribe, () => getState().profile);
  useEffect(() => { load.profile(); }, []);
  return v;
}
export function useSettings() {
  const v = useSyncExternalStore(subscribe, () => getState().settings);
  useEffect(() => { load.settings(); }, []);
  return v;
}
export function useShortcuts() {
  const v = useSyncExternalStore(subscribe, () => getState().shortcuts);
  useEffect(() => { load.shortcuts(); }, []);
  return v;
}
export function useTotalHours() {
  const v = useSyncExternalStore(subscribe, () => getState().totalHours);
  useEffect(() => { load.totalHours(); }, []);
  return v;
}
export function useMonthEntries(key: string) {
  const v = useSyncExternalStore(subscribe, () => getState().entries[key] ?? null);
  useActive([`e:${key}`]);
  useEffect(() => { load.entries(key); }, [key]);
  return v;
}
/** Birden çok ayın kayıtları: eksik aylar tek istekle yüklenir, tüm önbellek haritası döner. */
export function useEntriesMap(keys: string[]) {
  const v = useSyncExternalStore(subscribe, () => getState().entries ?? NO_ENTRIES);
  const joined = keys.join(",");
  useActive(keys.map((k) => `e:${k}`));
  useEffect(() => { void load.entriesRange(joined.split(",").filter(Boolean)); }, [joined]);
  return v;
}
