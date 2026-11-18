"use client";

import { useSyncExternalStore } from "react";

const noop = () => () => {};
let cached: Date | null = null;

/**
 * Bugünün tarihi. Sunucuda (ön render) null döner, tarayıcıda hemen gerçek tarih gelir.
 * Böylece render sırasında `new Date()` çağrılmaz ve Next'in "kararsız değer" hatası oluşmaz.
 * Gün değişirse (uygulama gece yarısını geçerek açık kaldıysa) yeni gün döner.
 */
export function useToday(): Date | null {
  return useSyncExternalStore(
    noop,
    () => {
      const d = new Date();
      if (!cached || cached.toDateString() !== d.toDateString()) cached = d;
      return cached;
    },
    () => null,
  );
}
