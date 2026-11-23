import type { BadgeKey } from "@mesai/core/badges";
import type { ReactNode } from "react";
import { Text, View } from "react-native";
import Svg, { Circle, G, Path } from "react-native-svg";

/** Başarı rozeti (web'deki BadgeIcon ile aynı çizimler): renkli daire üzerinde beyaz glif; kazanılmadıysa soluk gri. */
const COLORS: Record<BadgeKey, string> = {
  first: "#2f9e6e", streak3: "#e0603c", streak7: "#d9a514", goal: "#5b91a3", steady: "#3b9ad9", h50: "#7a6fd6", h100: "#d86a9a",
};
const W = "#ffffff";

/** Başarı rozeti: renkli daire üzerinde beyaz çizim glif. Kazanılmadıysa soluk ve gri. */
export function BadgeIcon({ badge, earned, size = 56 }: { badge: BadgeKey; earned: boolean; size?: number }) {
  const c = earned ? COLORS[badge] : "#9aa8b3";
  const glyph: Record<BadgeKey, ReactNode> = {
    first: <Path d="M12 6.2l1.7 3.6 3.9.5-2.9 2.7.8 3.9L12 15l-3.5 1.9.8-3.9-2.9-2.7 3.9-.5z" fill={W} />,
    streak3: <Path d="M12.2 5c.5 2.3-1.1 3.5-2.4 5-1.1 1.3-2 2.6-2 4.3a4.2 4.2 0 0 0 8.4 0c0-1.6-.6-2.8-1.6-3.8-.2 1.1-.7 1.7-1.4 2 .4-2.7-.3-5.4-1-7.5z" fill={W} />,
    streak7: <Path d="M13.2 4.5 7.6 12.6h3.9l-.7 6.9 5.6-8.4h-3.8z" fill={W} />,
    goal: (
      <G fill="none" stroke={W} strokeWidth="1.6" strokeLinecap="round">
        <Circle cx="12" cy="12" r="6.4" /><Circle cx="12" cy="12" r="3.2" /><Circle cx="12" cy="12" r="0.6" fill={W} />
      </G>
    ),
    steady: <Path d="M7.4 12.4l3 3 6.2-6.6" fill="none" stroke={W} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />,
    // Sayılar SVG yerine sistem fontlu metin olarak üstte çizilir (SVG metni Times'a düşüyordu)
    h50: null,
    h100: null,
  };
  const label = badge === "h50" ? "50" : badge === "h100" ? "100" : null;
  return (
    <View style={{ width: size, height: size, opacity: earned ? 1 : 0.6 }}>
      <Svg viewBox="0 0 24 24" width={size} height={size}>
        <Circle cx="12" cy="12" r="11" fill={c} />
        <Circle cx="12" cy="12" r="9.2" fill="none" stroke={W} strokeOpacity="0.35" strokeWidth="0.8" />
        {glyph[badge]}
      </Svg>
      {label ? (
        <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: W, fontWeight: "800", fontSize: (size / 24) * (label.length > 2 ? 7.4 : 8.6), letterSpacing: -0.2 }}>{label}</Text>
        </View>
      ) : null}
    </View>
  );
}
