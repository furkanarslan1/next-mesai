"use client";

/**
 * Cihaza özel tercihler (tema, hatırlatıcı). Veritabanına değil tarayıcıya yazılır:
 * her cihaz kendi görünümünü seçer. Okunamıyorsa varsayılanlar kullanılır.
 */
import { useSyncExternalStore } from "react";

export type ThemePref = "light" | "dark" | "system";
export interface Prefs { theme: ThemePref; reminderOn: boolean; reminderHour: number; reminderDismissed: string }

const KEY = "mesai.prefs";
const DEFAULTS: Prefs = { theme: "system", reminderOn: false, reminderHour: 20, reminderDismissed: "" };
const listeners = new Set<() => void>();
let cache: Prefs | null = null;

function read(): Prefs {
  if (cache) return cache;
  try {
    const raw = window.localStorage.getItem(KEY);
    cache = { ...DEFAULTS, ...(raw ? (JSON.parse(raw) as Partial<Prefs>) : {}) };
  } catch { cache = { ...DEFAULTS }; }
  return cache;
}

export function applyTheme(theme: ThemePref) {
  const dark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
}

export function setPrefs(patch: Partial<Prefs>) {
  cache = { ...read(), ...patch };
  try { window.localStorage.setItem(KEY, JSON.stringify(cache)); } catch { /* yok say */ }
  if (patch.theme) applyTheme(cache.theme);
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => { if (e.key === KEY) { cache = null; cb(); } };
  // Sistem teması değişirse ve "sistem" seçiliyse güncelle
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const onMq = () => { if (read().theme === "system") applyTheme("system"); };
  window.addEventListener("storage", onStorage);
  mq.addEventListener("change", onMq);
  return () => { listeners.delete(cb); window.removeEventListener("storage", onStorage); mq.removeEventListener("change", onMq); };
}

export function usePrefs(): Prefs {
  // Sunucuda varsayılanlar; tarayıcıda saklı değerler (hydration sonrası)
  return useSyncExternalStore(subscribe, read, () => DEFAULTS);
}

/** Sayfa boyanmadan önce temayı uygulayan satır içi betik (flaş olmasın diye <head>'e konur). */
export const THEME_INIT_SCRIPT = `(function(){try{var p=JSON.parse(localStorage.getItem('${KEY}')||'{}');var t=p.theme||'system';var d=t==='dark'||(t==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d)}catch(e){}})()`;
