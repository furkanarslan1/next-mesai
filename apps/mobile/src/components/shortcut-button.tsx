import { Check, Undo2 } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, View } from "react-native";
import { radius, useColors } from "@/theme";
import { Txt } from "./ui";

/**
 * Tek dokunuşla mesai ekleyen kısayol (web'deki ShortcutButton). Eklenince açık renkli + tik + "Geri al";
 * tekrar dokununca geri alınır. Eklemede küçük bir "+X sa" yükselme animasyonu oynar.
 */
export function ShortcutButton({ label, hint, hoursText, active, disabled, onPress }: {
  label: string; hint: string; hoursText: string; active: boolean; disabled?: boolean; onPress: () => void;
}) {
  const c = useColors();
  const [scale] = useState(() => new Animated.Value(1));
  const [float] = useState(() => new Animated.Value(0));
  const wasActive = useRef(active);
  // Pasiften aktife geçince "+X sa" balonu yükselir
  useEffect(() => {
    if (active && !wasActive.current) {
      float.setValue(0);
      Animated.timing(float, { toValue: 1, duration: 900, useNativeDriver: true }).start();
    }
    wasActive.current = active;
  }, [active, float]);

  const bg = disabled && !active ? c.muted : active ? `${c.ring}26` : c.primary;
  const fg = disabled && !active ? c.mutedForeground : active ? c.tint : c.primaryForeground;
  return (
    <Pressable disabled={disabled} onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: active, disabled }}
      onPressIn={() => Animated.spring(scale, { toValue: 0.95, useNativeDriver: true, speed: 50 }).start()}
      onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 30 }).start()}
      style={{ flex: 1 }}>
      <Animated.View style={[styles.btn, {
        backgroundColor: bg, borderColor: active ? `${c.ring}80` : "transparent", transform: [{ scale }],
        shadowColor: active ? c.ring : c.primary, shadowOpacity: disabled && !active ? 0 : 0.3,
      }]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          {active ? <Check size={20} color={fg} strokeWidth={2.5} /> : null}
          <Txt style={{ fontSize: 18, fontWeight: "700", color: fg }}>{label}</Txt>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 }}>
          {active ? <Undo2 size={12} color={fg} /> : null}
          <Txt style={{ fontSize: 12, color: fg, opacity: 0.8 }}>{active ? "Geri al" : hint}</Txt>
        </View>
        <Animated.View pointerEvents="none" style={[styles.float, {
          backgroundColor: c.background, borderColor: c.ring,
          opacity: float.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 1, 0] }),
          transform: [{ translateY: float.interpolate({ inputRange: [0, 1], outputRange: [8, -56] }) }],
        }]}>
          <Check size={14} color={c.tint} /><Txt style={{ fontWeight: "700", color: c.tint }}>+{hoursText}</Txt>
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    height: 96, borderRadius: radius.lg, alignItems: "center", justifyContent: "center", borderWidth: 1,
    shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 4,
  },
  float: {
    position: "absolute", top: "35%", flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 10, paddingVertical: 2, borderRadius: radius.pill, borderWidth: 1,
  },
});
