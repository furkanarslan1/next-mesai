"use client";

import { useSyncExternalStore } from "react";

let cached: Date | null = null;

// Uygulama açık kalıp gece yarısı geçilirse yeniden çizim tetiklensin: dakikada bir ve uygulamaya dönüşte kontrol
function subscribe(cb: () => void) {
  const check = () => { if (!cached || cached.toDateString() !== new Date().toDateString()) cb(); };
  const id = window.setInterval(check, 60_000);
  document.addEventListener("visibilitychange", check);
  return () => { window.clearInterval(id); document.removeEventListener("visibilitychange", check); };
}

/**
 * Bugünün tarihi. Sunucuda (ön render) null döner, tarayıcıda hemen gerçek tarih gelir.
 * Böylece render sırasında `new Date()` çağrılmaz ve Next'in "kararsız değer" hatası oluşmaz.
 * Gün değişirse (uygulama gece yarısını geçerek açık kaldıysa) yeni gün döner.
 */
export function useToday(): Date | null {
  return useSyncExternalStore(
    subscribe,
    () => {
      const d = new Date();
      if (!cached || cached.toDateString() !== d.toDateString()) cached = d;
      return cached;
    },
    () => null,
  );
}
