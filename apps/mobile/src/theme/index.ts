import { useColorScheme } from "react-native";
import { usePrefs } from "@/lib/prefs";

/**
 * Web'deki tema (apps/web/app/globals.css) ile birebir aynı: değerler web'in hesaplanmış CSS
 * değişkenlerinden okunmuştur (koyu ve açık tema). Gölgeler de web'deki `box-shadow` dizeleridir.
 */
const light = {
  background: "#f1f9f6",
  foreground: "#071b2b",
  card: "#ffffff",
  popover: "#ffffff",
  primary: "#131b2b",
  primaryForeground: "#fcfcfc",
  secondary: "#e2f2ec",
  secondaryForeground: "#131b2b",
  muted: "#edf7f3",
  mutedForeground: "#52606d",
  border: "#dae6ea",
  tint: "#477588",
  teal: "#5b91a3",
  ink: "#071b2b",
  destructive: "#e7000b",
  /** Takvimde kayıtlı gün dolgusu */
  fill: "#131b2b",
  /** Hedef halkası: geçiş renkleri ve iz */
  ringA: "#8cbabb",
  ringB: "#5b91a3",
  ringTrack: "rgba(93, 143, 162, 0.16)",
  ringTip: "#ffffff",
  /** Kart çerçevesi (açık temada yok, gölge var) */
  cardBorder: "transparent",
  dialogBorder: "transparent",
  /** Alt menü ve paneller: yarı saydam + bulanık */
  navBg: "rgba(255, 255, 255, 0.70)",
  sheetBg: "rgba(255, 255, 255, 0.92)",
  toastBg: "rgba(255, 255, 255, 0.82)",
  shieldTop: "rgba(241, 249, 246, 0)",
  shieldBottom: "rgba(241, 249, 246, 0.92)",
  /** Kaydırınca beliren küçük başlık şeridi */
  barBg: "rgba(242, 250, 246, 0.74)",
  hairline: "rgba(11, 22, 44, 0.09)",
  shadow: {
    card: "0px 1px 2px rgba(7, 27, 43, 0.07), 0px 12px 32px rgba(7, 27, 43, 0.09), 0px 0px 0px 0.5px rgba(7, 27, 43, 0.09)",
    nav: "0px 0px 0px 0.5px rgba(7, 27, 43, 0.09), 0px 2px 6px rgba(7, 27, 43, 0.06), 0px 18px 44px rgba(7, 27, 43, 0.16)",
    navActive: "0px 8px 20px rgba(19, 27, 43, 0.35)",
    primary: "0px 10px 24px rgba(19, 27, 43, 0.35)",
    primaryGlow: "0px 0px 28px rgba(19, 27, 43, 0.28)",
    navy: "0px 8px 20px rgba(19, 27, 43, 0.32)",
    toast: "0px 0px 0px 0.5px rgba(7, 27, 43, 0.09), 0px 12px 40px rgba(0, 0, 0, 0.18)",
    dialog: "0px 0px 0px 1px rgba(7, 27, 43, 0.1)",
  },
};

const dark: typeof light = {
  background: "#071b2b",
  foreground: "#d5ede4",
  card: "#131b2b",
  popover: "#131b2b",
  primary: "#cfeae0",
  primaryForeground: "#071b2b",
  secondary: "#202d40",
  secondaryForeground: "#cfeae0",
  muted: "#1c283a",
  mutedForeground: "#799699",
  border: "#25364a",
  tint: "#cfeae0",
  teal: "#5b91a3",
  ink: "#071b2b",
  destructive: "#ff6367",
  fill: "#30485d",
  ringA: "#cfeae0",
  ringB: "#5b91a3",
  ringTrack: "rgba(91, 146, 164, 0.22)",
  ringTip: "#ffffff",
  cardBorder: "rgba(91, 145, 163, 0.20)",
  dialogBorder: "rgba(92, 146, 163, 0.24)",
  navBg: "rgba(19, 26, 43, 0.72)",
  sheetBg: "rgba(20, 27, 43, 0.92)",
  toastBg: "rgba(19, 27, 43, 0.82)",
  shieldTop: "rgba(7, 27, 43, 0)",
  shieldBottom: "rgba(19, 27, 43, 0.92)",
  barBg: "rgba(7, 26, 43, 0.72)",
  hairline: "rgba(206, 230, 222, 0.12)",
  shadow: {
    card: "0px 1px 2px rgba(0, 0, 0, 0.4), 0px 14px 34px rgba(0, 0, 0, 0.35)",
    nav: "0px 2px 4px rgba(0, 0, 0, 0.45), 0px 18px 44px rgba(0, 0, 0, 0.55)",
    navActive: "0px 8px 20px rgba(0, 0, 0, 0.4)",
    primary: "0px 10px 24px rgba(207, 234, 224, 0.35)",
    primaryGlow: "0px 0px 28px rgba(207, 234, 224, 0.28)",
    navy: "0px 8px 20px rgba(0, 0, 0, 0.4)",
    toast: "0px 0px 0px 0.5px rgba(207, 230, 222, 0.12), 0px 12px 40px rgba(0, 0, 0, 0.18)",
    dialog: "0px 0px 0px 1px rgba(213, 237, 228, 0.1)",
  },
};

export type Colors = typeof light;
export const colors = { light, dark };

/** Yuvarlaklık ölçeği (web: --r-xl 2rem / --r-lg 1.5rem / --r-md 1.1rem) */
export const radius = { xl: 32, lg: 24, md: 17.6, pill: 9999 };

/** Sayfa boşlukları (web: px-4, space-y-5, üstte 1.5rem) */
export const space = { page: 16, section: 20, top: 24 };

/** Bir rengin saydam hali: alpha("#cfeae0", 0.1) */
export function alpha(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

/** Koyu tema mı: Ayarlar → Görünüm'deki seçim, "Sistem" ise telefonun ayarı. */
export function useIsDark() {
  const sys = useColorScheme();
  const { theme } = usePrefs();
  return theme === "system" ? sys === "dark" : theme === "dark";
}
export function useColors(): Colors {
  return useIsDark() ? dark : light;
}
