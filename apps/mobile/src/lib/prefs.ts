/**
 * Cihaza özel tercihler (tema, hatırlatıcı): web'deki lib/prefs.ts'in aynısı. Veritabanına değil telefona
 * (AsyncStorage) yazılır; her cihaz kendi görünümünü seçer. Okunamıyorsa varsayılanlar kullanılır.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSyncExternalStore } from "react";
import { Appearance } from "react-native";

export type ThemePref = "light" | "dark" | "system";
export interface Prefs { theme: ThemePref; reminderOn: boolean; reminderHour: number; reminderDismissed: string }

const KEY = "mesai.prefs";
const DEFAULTS: Prefs = { theme: "system", reminderOn: false, reminderHour: 20, reminderDismissed: "" };
const listeners = new Set<() => void>();
let cache: Prefs = DEFAULTS;

/** Seçilen temayı telefonun yerel parçalarına da (saat seçici, klavye, bulanıklık) uygular. */
function applyTheme(theme: ThemePref) {
  try { Appearance.setColorScheme(theme === "system" ? "unspecified" : theme); } catch { /* web önizlemesinde yok */ }
}

function emit() { listeners.forEach((l) => l()); }

AsyncStorage.getItem(KEY)
  .then((raw) => {
    if (!raw) return;
    cache = { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Prefs>) };
    applyTheme(cache.theme);
    emit();
  })
  .catch(() => {});

export function setPrefs(patch: Partial<Prefs>) {
  cache = { ...cache, ...patch };
  void AsyncStorage.setItem(KEY, JSON.stringify(cache)).catch(() => {});
  if (patch.theme) applyTheme(cache.theme);
  emit();
}

const subscribe = (cb: () => void) => { listeners.add(cb); return () => { listeners.delete(cb); }; };

export function usePrefs(): Prefs {
  return useSyncExternalStore(subscribe, () => cache);
}

export const THEME_LABEL: Record<ThemePref, string> = { light: "Açık", dark: "Koyu", system: "Sistem" };
