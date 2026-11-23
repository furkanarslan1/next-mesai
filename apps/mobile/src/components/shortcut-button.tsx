import { Check, Undo2 } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Pressable, StyleSheet, View } from "react-native";
import { alpha, radius, useColors } from "@/theme";
import { Txt } from "./ui";

/**
 * Web'deki mesai kısayolunun aynısı: 96px yükseklik, 1.5rem köşe, dolu ana renk ve gölge.
 * Eklenince açık zemin + ince çerçeve + parıltı, tik ve "Geri al". Eklemede basılma, yayılan halka ve
 * yukarı uçan "+X sa" animasyonu.
 */
export function ShortcutButton({ label, hint, hoursText, active, disabled, onPress }: {
  label: string; hint: string; hoursText: string; active: boolean; disabled?: boolean; onPress: () => void;
}) {
  const c = useColors();
  const [press] = useState(() => new Animated.Value(1));
  const [burst] = useState(() => new Animated.Value(0));
  const [bursting, setBursting] = useState(false);
  const wasActive = useRef(active);
  // Pasiften aktife geçince: basılma + halka + "+X sa" (web: shortcut-press / ring / float)
  useEffect(() => {
    if (active && !wasActive.current) {
      setBursting(true);
      burst.setValue(0);
      Animated.sequence([
        Animated.timing(press, { toValue: 0.94, duration: 120, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(press, { toValue: 1, duration: 230, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      ]).start();
      Animated.timing(burst, { toValue: 1, duration: 900, easing: Easing.out(Easing.quad), useNativeDriver: true }).start(() => setBursting(false));
    }
    wasActive.current = active;
  }, [active, burst, press]);

  const off = disabled && !active;
  const bg = off ? c.muted : active ? alpha(c.primary, 0.1) : c.primary;
  const fg = off ? c.mutedForeground : active ? c.primary : c.primaryForeground;
  return (
    <Pressable disabled={disabled} onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: active, disabled }}
      onPressIn={() => Animated.timing(press, { toValue: 0.96, duration: 90, useNativeDriver: true }).start()}
      onPressOut={() => Animated.timing(press, { toValue: 1, duration: 150, useNativeDriver: true }).start()}>
      <Animated.View style={[styles.btn, {
        backgroundColor: bg, borderColor: active ? alpha(c.primary, 0.5) : "transparent",
        boxShadow: off ? undefined : active ? c.shadow.primaryGlow : c.shadow.primary,
        transform: [{ scale: press }],
      }]}>
        {bursting ? (
          <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.ring, {
            borderColor: c.teal,
            opacity: burst.interpolate({ inputRange: [0, 0.66, 1], outputRange: [0.7, 0, 0] }),
            transform: [{ scale: burst.interpolate({ inputRange: [0, 0.66, 1], outputRange: [0.6, 1.5, 1.5] }) }],
          }]} />
        ) : null}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          {active ? <Check size={20} color={fg} /> : null}
          <Txt style={{ fontSize: 18, lineHeight: 28, fontWeight: "600", color: fg }}>{label}</Txt>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4, opacity: 0.8 }}>
          {active ? <Undo2 size={12} color={fg} /> : null}
          <Txt style={{ fontSize: 12, lineHeight: 16, color: fg }}>{active ? "Geri al" : hint}</Txt>
        </View>
        {bursting ? (
          <Animated.View pointerEvents="none" style={[styles.float, {
            backgroundColor: c.background, borderColor: alpha(c.primary, 0.6),
            opacity: burst.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 1, 0] }),
            transform: [
              { translateY: burst.interpolate({ inputRange: [0, 1], outputRange: [8, -56] }) },
              { scale: burst.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.15] }) },
            ],
          }]}>
            <Check size={16} color={c.primary} /><Txt style={{ fontSize: 16, fontWeight: "700", color: c.primary }}>+{hoursText}</Txt>
          </Animated.View>
        ) : null}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { height: 96, borderRadius: radius.lg, borderWidth: 1, alignItems: "center", justifyContent: "center", gap: 2 },
  ring: { borderRadius: radius.lg, borderWidth: 2 },
  float: {
    position: "absolute", top: "35%", flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 10, paddingVertical: 2, borderRadius: radius.pill, borderWidth: 1,
  },
});
