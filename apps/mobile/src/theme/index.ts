import { useColorScheme } from "react-native";

/**
 * Web'deki palet (apps/web/app/globals.css) ile aynı:
 * 071B2B mürekkep · 131B2B lacivert (ana renk) · 5B91A3 teal (vurgu) · CFEAE0 nane.
 * Web'de color-mix ile türetilen tonlar burada hesaplanmış hex değerleridir.
 */
const palette = { ink: "#071b2b", navy: "#131b2b", teal: "#5b91a3", mint: "#cfeae0" };

const light = {
  background: "#f1f9f6",
  foreground: palette.ink,
  card: "#ffffff",
  primary: palette.navy,
  primaryForeground: "#fcfcfc",
  muted: "#edf7f3",
  mutedForeground: "#5b6973",
  border: "#dbe7eb",
  tint: "#487789",
  ring: palette.teal,
  destructive: "#d4183d",
  shadow: "rgba(7, 27, 43, 0.09)",
  /** Takvimde kayıtlı gün dolgusu */
  fill: palette.navy,
  /** Hedef halkası: nane → teal geçiş, iz rengi */
  ringA: "#8fb9be",
  ringB: palette.teal,
  ringTrack: "rgba(91, 145, 163, 0.16)",
};

const dark: typeof light = {
  background: palette.ink,
  foreground: "#d5ece3",
  card: palette.navy,
  primary: palette.mint,
  primaryForeground: palette.ink,
  muted: "#1c2a3b",
  mutedForeground: "#889b9b",
  border: "#263a4a",
  tint: palette.mint,
  ring: palette.teal,
  destructive: "#f0707a",
  shadow: "rgba(0, 0, 0, 0.35)",
  fill: "#314d5d",
  ringA: palette.mint,
  ringB: palette.teal,
  ringTrack: "rgba(91, 145, 163, 0.22)",
};

export type Colors = typeof light;
export const colors = { light, dark };
export { palette };

/** Yuvarlaklık ölçeği (web: --r-xl / --r-lg / --r-md) */
export const radius = { xl: 32, lg: 24, md: 18, pill: 999 };

export function useColors(): Colors {
  return useColorScheme() === "dark" ? dark : light;
}
