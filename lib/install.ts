"use client";

import { useSyncExternalStore } from "react";

/** Chrome/Android "uygulamayı yükle" isteği yalnızca bir kez, sayfa açılırken gelir; burada yakalayıp saklarız. */
interface InstallEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let deferred: InstallEvent | null = null;
let installed = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as InstallEvent;
    emit();
  });
  window.addEventListener("appinstalled", () => { deferred = null; installed = true; emit(); });
}

const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches
    || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}
function isIOS() {
  const ua = navigator.userAgent;
  return /iphone|ipad|ipod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

export type InstallState = "unknown" | "installed" | "prompt" | "ios" | "manual";

/** Uygulamanın kurulum durumu: kurulu, tek dokunuşla kurulabilir (prompt), iOS (elle) ya da diğer tarayıcılar (manual). */
export function useInstall() {
  const state = useSyncExternalStore<InstallState>(
    subscribe,
    () => {
      if (installed || isStandalone()) return "installed";
      if (deferred) return "prompt";
      return isIOS() ? "ios" : "manual";
    },
    () => "unknown",
  );
  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    deferred = null;
    if (outcome === "accepted") installed = true;
    emit();
  }
  return { state, install };
}
