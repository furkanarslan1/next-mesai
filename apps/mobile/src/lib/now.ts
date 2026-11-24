import { useSyncExternalStore } from "react";
import { AppState } from "react-native";

let cached = new Date();

// Uygulama açık kalıp gece yarısı geçilirse ya da ertesi gün arka plandan dönülürse yeniden çizim tetiklensin
function subscribe(cb: () => void) {
  const check = () => { if (cached.toDateString() !== new Date().toDateString()) cb(); };
  const id = setInterval(check, 60_000);
  const sub = AppState.addEventListener("change", (s) => { if (s === "active") check(); });
  return () => { clearInterval(id); sub.remove(); };
}

/** Bugünün tarihi (web: lib/now.ts). Gün değişince yeni gün döner; aynı gün içinde aynı nesne kalır. */
export function useToday(): Date {
  return useSyncExternalStore(subscribe, () => {
    const d = new Date();
    if (cached.toDateString() !== d.toDateString()) cached = d;
    return cached;
  });
}
