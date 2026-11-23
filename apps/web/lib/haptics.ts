"use client";

/**
 * Hafif dokunma geri bildirimi (haptic).
 * - Android/Chrome: `navigator.vibrate`.
 * - iPhone (iOS 18+): Safari titreşim API'si vermez; ama `<input type="checkbox" switch>` bir dokunuşla
 *   değiştiğinde sistem kısa bir "tık" titreşimi üretir. Gizli bir anahtarın etiketine tıklayarak bunu tetikleriz.
 *   Yalnızca kullanıcının dokunuşu sırasında çağrıldığında çalışır; desteklenmeyen cihazda sessizce hiçbir şey olmaz.
 */
let label: HTMLLabelElement | null = null;

function iosSwitch(): HTMLLabelElement | null {
  if (typeof document === "undefined") return null;
  if (label?.isConnected) return label;
  const l = document.createElement("label");
  l.setAttribute("aria-hidden", "true");
  l.style.cssText = "position:fixed;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none;left:-9999px;top:0";
  const input = document.createElement("input");
  input.type = "checkbox";
  input.setAttribute("switch", "");
  input.tabIndex = -1;
  l.appendChild(input);
  document.body.appendChild(l);
  label = l;
  return l;
}

const reduce = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export function haptic(kind: "light" | "success" | "warning" = "light") {
  if (typeof window === "undefined" || reduce()) return;
  try {
    if (typeof navigator.vibrate === "function") {
      navigator.vibrate(kind === "success" ? [12, 40, 18] : kind === "warning" ? [20, 60, 20] : 10);
      return;
    }
    iosSwitch()?.click();
  } catch { /* desteklenmiyor */ }
}
