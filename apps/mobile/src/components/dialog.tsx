import { BlurView } from "expo-blur";
import { X } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Animated, Easing, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, View } from "react-native";
import { haptic } from "@/lib/haptics";
import { radius, useColors, useIsDark } from "@/theme";
import { Button, Txt } from "./ui";

/**
 * Web'deki Evet/Hayır penceresinin aynısı: ortada yuvarlak kart (2rem köşe, 28px iç boşluk),
 * başlık 20px, açıklama 16px, altta yan yana iki büyük hap düğme (Hayır / Evet).
 * Arka plan hafif kararır ve bulanıklaşır; pencere yumuşak büyüyerek açılır.
 */
export interface ConfirmOptions { title: string; desc?: string; yes: string; no?: string; run: () => void }

let open: ((o: ConfirmOptions) => void) | null = null;
export function confirm(o: ConfirmOptions) { open?.(o); }

export function ConfirmHost() {
  const c = useColors();
  const dark = useIsDark();
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const [visible, setVisible] = useState(false);
  const [anim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    open = (o) => {
      setOpts(o);
      setVisible(true);
      anim.setValue(0);
      Animated.timing(anim, { toValue: 1, duration: 180, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    };
    return () => { open = null; };
  }, [anim]);

  const close = (then?: () => void) => {
    Animated.timing(anim, { toValue: 0, duration: 140, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(({ finished }) => {
      if (finished) setVisible(false);
      then?.();
    });
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={() => close()} statusBarTranslucent navigationBarTranslucent>
      <BlurView intensity={20} tint={dark ? "dark" : "light"} style={StyleSheet.absoluteFill} pointerEvents="none" />
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: anim }]}>
        <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.10)" }]} onPress={() => close()} accessibilityLabel="Kapat" />
      </Animated.View>
      <View pointerEvents="box-none" style={styles.center}>
        <Animated.View accessibilityRole="alert" style={[styles.card, {
          backgroundColor: c.card, borderColor: c.dialogBorder, boxShadow: c.shadow.dialog,
          opacity: anim, transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) }],
        }]}>
          <View style={{ gap: 10 }}>
            <Txt style={{ fontSize: 20, lineHeight: 27.5, fontWeight: "500" }}>{opts?.title}</Txt>
            {opts?.desc ? <Txt muted style={{ fontSize: 16, lineHeight: 26 }}>{opts.desc}</Txt> : null}
          </View>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <Button title={opts?.no ?? "Hayır"} variant="secondary" size="xl" style={{ flex: 1 }} onPress={() => close()} />
            <Button title={opts?.yes ?? "Evet"} size="xl" style={{ flex: 1 }}
              onPress={() => { const run = opts?.run; haptic(); close(run); }} />
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  card: { width: "100%", maxWidth: 448, borderRadius: radius.xl, borderWidth: 1, padding: 28, gap: 28 },
});

/**
 * Ortada açılan pencere (web'deki shadcn Dialog): kart zemin, 2rem köşe, ince çerçeve, sağ üstte X.
 * `padding`/`gap` web'deki sınıflara göre: varsayılan p-4 gap-4, "Farklı mesai" p-5 gap-5.
 */
export function Dialog({ open, onClose, title, titleSize = 16, padding = 16, gap = 16, children }: {
  open: boolean; onClose: () => void; title: string; titleSize?: number; padding?: number; gap?: number; children: React.ReactNode;
}) {
  const c = useColors();
  const dark = useIsDark();
  const [visible, setVisible] = useState(open);
  const [anim] = useState(() => new Animated.Value(0));
  const [shown, setShown] = useState(open);
  if (open !== shown) {
    setShown(open);
    if (open) setVisible(true);
  }
  useEffect(() => {
    if (open) {
      anim.setValue(0);
      Animated.timing(anim, { toValue: 1, duration: 150, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
      return;
    }
    // Kapanma animasyonu yalnızca açık bir pencere kapanırken; bitiş adımı yarıda kesilirse (yeniden açıldıysa) gizlemez
    if (!visible) return;
    Animated.timing(anim, { toValue: 0, duration: 120, easing: Easing.in(Easing.cubic), useNativeDriver: true })
      .start(({ finished }) => { if (finished) setVisible(false); });
  }, [open, anim]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
      <BlurView intensity={20} tint={dark ? "dark" : "light"} style={StyleSheet.absoluteFill} pointerEvents="none" />
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: anim }]}>
        <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.10)" }]} onPress={onClose} accessibilityLabel="Kapat" />
      </Animated.View>
      <KeyboardAvoidingView pointerEvents="box-none" style={styles.center} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <Animated.View accessibilityViewIsModal style={[styles.card, {
          padding, gap, backgroundColor: c.card, borderColor: c.dialogBorder, boxShadow: c.shadow.dialog,
          opacity: anim, transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) }],
        }]}>
          <Txt style={{ fontSize: titleSize, lineHeight: titleSize === 16 ? 16 : 28, fontWeight: "500", paddingRight: 28 }}>{title}</Txt>
          {children}
          <Pressable onPress={onClose} accessibilityLabel="Kapat" hitSlop={8}
            style={({ pressed }) => ({ position: "absolute", top: 8, right: 8, width: 28, height: 28, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: pressed ? c.muted : "transparent" })}>
            <X size={16} color={c.foreground} />
          </Pressable>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
