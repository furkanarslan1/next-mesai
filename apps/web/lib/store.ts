"use client";

/**
 * Web tarafı: ortak önbelleği (`@mesai/core/store`) tarayıcıya bağlar ve React hook'larını verir.
 * Önbelleğin kuralları (tazelik süreleri, tek istekte çok ay, yazma sonrası güncelleme) core'dadır.
 */
import { useEffect, useSyncExternalStore } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  configureStore, getState, hydrateFromDevice, load, retain, revalidateStale, subscribe,
} from "@mesai/core/store";
import type { Entry, FinanceItem, Profile } from "@mesai/core/types";

export { DEFAULT_SETTINGS, load, monthKey, mutate, resetStore } from "@mesai/core/store";

// Profil (ad, rol) bir sonraki açılışta ilk çizimde hazır olsun diye tarayıcıda da tutulur
const PROFILE_KEY = "mesai.profile";
const CACHE_KEY = "mesai.cache";
function readSavedProfile(): Profile | null {
  try {
    const raw = typeof window !== "undefined" ? window.localStorage.getItem(PROFILE_KEY) : null;
    return raw ? (JSON.parse(raw) as Profile) : null;
  } catch { return null; }
}
configureStore({
  client: createClient,
  savedProfile: readSavedProfile(),
  saveProfile: (p) => { try { window.localStorage.setItem(PROFILE_KEY, JSON.stringify(p)); } catch { /* yok say */ } },
  clearProfile: () => { try { window.localStorage.removeItem(PROFILE_KEY); } catch { /* yok say */ } },
  // Son görülen veri tarayıcıda saklanır: sayfa yeniden açılınca anında görünür, arka planda tazelenir
  persist: {
    read: async () => { try { return window.localStorage.getItem(CACHE_KEY); } catch { return null; } },
    write: (v) => { try { window.localStorage.setItem(CACHE_KEY, v); } catch { /* yer yoksa yok say */ } },
    clear: () => { try { window.localStorage.removeItem(CACHE_KEY); } catch { /* yok say */ } },
  },
});

if (typeof window !== "undefined") {
  void hydrateFromDevice();
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") revalidateStale(); });
  window.addEventListener("online", revalidateStale);
}

// Sunucuda (ön render) boş harita: her çağrıda aynı nesne dönmeli
const NO_ENTRIES: Record<string, Entry[]> = {};
const NO_FINANCE: Record<string, FinanceItem[]> = {};
function useActive(ids: string[]) {
  const joined = ids.join(",");
  useEffect(() => retain(joined.split(",").filter(Boolean)), [joined]);
}

/* ---------- dilim okuyucu hook'lar (sadece kendi diliminde yeniden çizilir) ---------- */
export function useProfile() {
  const v = useSyncExternalStore(subscribe, () => getState().profile, () => null);
  // Kaydedilmiş profil olsa bile arka planda tazele (rol/ad değişmiş olabilir)
  useEffect(() => { load.profile(); }, []);
  return v;
}
export function useSettings() {
  const v = useSyncExternalStore(subscribe, () => getState().settings, () => null);
  useEffect(() => { load.settings(); }, []);
  return v;
}
export function useShortcuts() {
  const v = useSyncExternalStore(subscribe, () => getState().shortcuts, () => null);
  useEffect(() => { load.shortcuts(); }, []);
  return v;
}
export function useTotalHours() {
  const v = useSyncExternalStore(subscribe, () => getState().totalHours, () => null);
  useEffect(() => { load.totalHours(); }, []);
  return v;
}
export function useLinks() {
  const v = useSyncExternalStore(subscribe, () => getState().links, () => null);
  const ready = useSyncExternalStore(subscribe, () => getState().profile?.id ?? "", () => "");
  useEffect(() => { if (ready) load.links(); }, [ready]);
  return v;
}
export function useFinance(key: string) {
  const v = useSyncExternalStore(subscribe, () => getState().finance[key] ?? null, () => null);
  useActive([`f:${key}`]);
  useEffect(() => { load.finance(key); }, [key]);
  return v;
}
export function usePayslips() {
  const v = useSyncExternalStore(subscribe, () => getState().payslips, () => null);
  useEffect(() => { load.payslips(); }, []);
  return v;
}
/** Birden çok ayın kayıtları (raporlar): eksik aylar yüklenir, tüm önbellek haritası döner. */
export function useEntriesMap(keys: string[]) {
  const v = useSyncExternalStore(subscribe, () => getState().entries, () => NO_ENTRIES);
  const joined = keys.join(",");
  useActive(keys.map((k) => `e:${k}`));
  useEffect(() => { void load.entriesRange(joined.split(",").filter(Boolean)); }, [joined]);
  return v;
}
export function useFinanceMap(keys: string[]) {
  const v = useSyncExternalStore(subscribe, () => getState().finance, () => NO_FINANCE);
  const joined = keys.join(",");
  useActive(keys.map((k) => `f:${k}`));
  useEffect(() => { void load.financeRange(joined.split(",").filter(Boolean)); }, [joined]);
  return v;
}
export function useMonthEntries(key: string) {
  const v = useSyncExternalStore(subscribe, () => getState().entries[key] ?? null, () => null);
  useActive([`e:${key}`]);
  useEffect(() => { load.entries(key); }, [key]);
  return v;
}
