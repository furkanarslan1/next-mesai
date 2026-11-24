import { useNavigation } from "expo-router";
import { useEffect } from "react";
import { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from "react-native-reanimated";
import { useReduceMotion } from "@/lib/motion";

const EASE = Easing.bezier(0.2, 0.9, 0.3, 1);

/** Alt menüden en son sekme değiştirme anı: yükselme yalnızca bunun hemen ardından oynar */
let lastTabSwitch = 0;
/** Alt menü (TabBar) sekme değiştirirken çağırır. */
export function markTabSwitch() { lastTabSwitch = Date.now(); }

/**
 * Sekmeye geçince içerik hafifçe yükselir (web: view transition "nav-tab" → vt-rise, 60 ms gecikme,
 * 260 ms, 10 px). Yalnızca alt menüden sekme değiştirildiğinde oynar: uygulamanın açılışı, alt sayfadan
 * geri dönüş (orada sayfa zaten kayarak gelir) ya da yeniden yükleme tetiklemez. Kaydırma + saydamlık,
 * UI iş parçacığında.
 */
export function useTabRise() {
  const reduce = useReduceMotion();
  const nav = useNavigation();
  const t = useSharedValue(1);
  useEffect(() => {
    const play = () => {
      if (reduce || Date.now() - lastTabSwitch > 400) return;
      t.set(0);
      t.set(withDelay(60, withTiming(1, { duration: 260, easing: EASE })));
    };
    // Sekme ilk kez açılırken ekran o an yüklenir (odak olayı kaçmış olur)
    if (nav.isFocused()) play();
    return nav.addListener("focus", play);
  }, [nav, reduce, t]);
  return useAnimatedStyle(() => ({ opacity: t.get(), transform: [{ translateY: (1 - t.get()) * 10 }] }));
}
