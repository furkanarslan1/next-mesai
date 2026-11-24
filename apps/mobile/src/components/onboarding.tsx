import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import { Animated, Easing, Modal, Pressable, ScrollView, StyleSheet, View, useWindowDimensions, type ScrollViewInstance } from "react-native";
import Reanimated, { Easing as REasing, useAnimatedProps, useAnimatedStyle, useSharedValue, withDelay, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Defs, G, LinearGradient, Path, Rect, Stop, Text as SvgText } from "react-native-svg";
import { haptic } from "@/lib/haptics";
import { useReduceMotion } from "@/lib/motion";
import { alpha, useColors } from "@/theme";
import { Button, Txt } from "./ui";

const KEY = "mesai.onboarded";
const MINT = "#cfeae0";
const NAVY = "#131b2b";
const AnimatedCircle = Reanimated.createAnimatedComponent(Circle);
const AnimatedRect = Reanimated.createAnimatedComponent(Rect);
const REASE = REasing.bezier(0.2, 0.9, 0.3, 1);

/** Yukarı aşağı süzülme (web: ob-float, 3 sn, 6px): ayrı bir katmanda aynı viewBox ile çizilir */
function useFloat(reduce: boolean) {
  const [v] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (reduce) return;
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(v, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(v, { toValue: 0, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [v, reduce]);
  return v.interpolate({ inputRange: [0, 1], outputRange: [0, -6] });
}
/** 0 → 1 tek seferlik giriş animasyonu (halka çizimi, çubuklar); UI iş parçacığında (Reanimated) */
function useEnter(duration: number, delay = 0, reduce = false) {
  const v = useSharedValue(reduce ? 1 : 0);
  useEffect(() => {
    if (reduce) { v.set(1); return; }
    v.set(withDelay(delay, withTiming(1, { duration, easing: REASE })));
  }, [v, duration, delay, reduce]);
  return v;
}

/** Çizim + üstünde süzülen rozet katmanı (ikisi de 240×200 viewBox, aynı yerleşim) */
function Scene({ base, float, reduce }: { base: React.ReactNode; float: React.ReactNode; reduce: boolean }) {
  const y = useFloat(reduce);
  return (
    <View style={{ width: "100%", height: "100%" }}>
      <Svg viewBox="0 0 240 200" width="100%" height="100%">{base}</Svg>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { transform: [{ translateY: y }] }]}>
        <Svg viewBox="0 0 240 200" width="100%" height="100%">{float}</Svg>
      </Animated.View>
    </View>
  );
}

function RingArt({ reduce }: { reduce: boolean }) {
  const c = useColors();
  const r = 62, len = 2 * Math.PI * r * 0.7, circ = 2 * Math.PI * r;
  const p = useEnter(1200, 0, reduce);
  const draw = useAnimatedProps(() => ({ strokeDashoffset: len * (1 - p.get()) }));
  return (
    <Scene reduce={reduce}
      base={<>
        <Defs><LinearGradient id="ob1" x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor={MINT} /><Stop offset="1" stopColor={c.teal} /></LinearGradient></Defs>
        <Circle cx="120" cy="100" r="92" fill={c.teal} opacity={0.08} />
        <Circle cx="120" cy="100" r={r} fill="none" stroke={c.teal} strokeOpacity={0.2} strokeWidth={18} />
        <AnimatedCircle cx="120" cy="100" r={r} fill="none" stroke="url(#ob1)" strokeWidth={18} strokeLinecap="round"
          strokeDasharray={`${len} ${circ}`} animatedProps={draw} transform="rotate(-90 120 100)" />
        <SvgText x="120" y="108" textAnchor="middle" fontSize="30" fontWeight="700" fill={c.foreground}>%70</SvgText>
      </>}
      float={<G><Rect x="176" y="22" width="56" height="26" rx="13" fill={c.card} /><SvgText x="204" y="40" textAnchor="middle" fontSize="12" fontWeight="700" fill={c.teal}>+₺850</SvgText></G>} />
  );
}

const LIT = [3, 9, 10, 16, 17, 22];
function TapArt({ reduce }: { reduce: boolean }) {
  const c = useColors();
  return (
    <Scene reduce={reduce}
      base={<>
        <Circle cx="120" cy="100" r="92" fill={c.teal} opacity={0.08} />
        {[0, 1, 2, 3, 4, 5, 6].map((i) => [0, 1, 2, 3].map((j) => (
          <Rect key={`${i}${j}`} x={42 + i * 23} y={46 + j * 23} width="18" height="18" rx="5" fill={c.teal} opacity={LIT.includes(i + j * 7) ? 0.9 : 0.16} />
        )))}
      </>}
      float={<G><Rect x="70" y="146" width="100" height="40" rx="20" fill={NAVY} /><SvgText x="120" y="171" textAnchor="middle" fontSize="15" fontWeight="700" fill="#fff">+2,5 saat</SvgText></G>} />
  );
}

const BARS = [38, 56, 44, 72, 60, 90];
function Bar({ i, h, reduce }: { i: number; h: number; reduce: boolean }) {
  const c = useColors();
  const p = useEnter(700, i * 70, reduce);
  const grow = useAnimatedProps(() => ({ y: 150 - h * p.get(), height: h * p.get() }));
  return <AnimatedRect x={48 + i * 25} width="16" animatedProps={grow} rx="6" fill={c.teal} opacity={i === 5 ? 1 : 0.35} />;
}
function ReportArt({ reduce }: { reduce: boolean }) {
  const c = useColors();
  return (
    <Scene reduce={reduce}
      base={<>
        <Circle cx="120" cy="100" r="92" fill={c.teal} opacity={0.08} />
        {BARS.map((h, i) => <Bar key={i} i={i} h={h} reduce={reduce} />)}
      </>}
      float={<G>
        <Rect x="140" y="24" width="88" height="30" rx="15" fill={c.card} />
        <Circle cx="157" cy="39" r="8" fill={c.teal} />
        <Path d="M153 39 l3 3 l5 -6" stroke="#fff" strokeWidth={2} fill="none" strokeLinecap="round" />
        <SvgText x="194" y="44" textAnchor="middle" fontSize="12" fontWeight="700" fill={c.foreground}>Uyumlu</SvgText>
      </G>} />
  );
}

const SLIDES = [
  { art: RingArt, title: "Hedefini koy", text: "Aylık hedef maaşını ya da mesai saatini gir. Halka doldukça ne kadar kaldığını, günde kaç saat gerektiğini gör." },
  { art: TapArt, title: "Tek dokunuşla mesai", text: "Sık yaptığın mesaileri kısayol yap. Resmi tatilde tatil oranıyla, pazar günü pazar oranıyla otomatik hesaplanır." },
  { art: ReportArt, title: "Bordronu kontrol et", text: "Bordrodaki mesaiyi uygulamanın hesabıyla karşılaştır, aylık çizelgeni Excel ya da PDF olarak İK'ya ver." },
];

/** Sayfa noktası: seçili olan 24px genişler (web: 300 ms geçiş) */
function Dot({ on }: { on: boolean }) {
  const c = useColors();
  const w = useSharedValue(on ? 24 : 8);
  useEffect(() => { w.set(withTiming(on ? 24 : 8, { duration: 300, easing: REASE })); }, [on, w]);
  const style = useAnimatedStyle(() => ({ width: w.get() }));
  return <Reanimated.View style={[{ height: 8, borderRadius: 4, backgroundColor: on ? c.tint : alpha(c.mutedForeground, 0.3) }, style]} />;
}

/** İlk açılışta bir kez gösterilen 3 sayfalık tanıtım (web: Onboarding). Kaydırarak ya da düğmeyle ilerlenir. */
export function Onboarding() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const reduce = useReduceMotion();
  // Telefonda okunana kadar gösterilmez (bir an görünüp kaybolmasın)
  const [done, setDone] = useState(true);
  const [i, setI] = useState(0);
  const [track, setTrack] = useState<ScrollViewInstance | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(KEY).then((v) => setDone(v === "1")).catch(() => {});
  }, []);
  const finish = () => { setDone(true); void AsyncStorage.setItem(KEY, "1").catch(() => {}); };
  const go = (n: number) => { haptic(); track?.scrollTo({ x: width * n, animated: true }); setI(n); };
  const last = i === SLIDES.length - 1;

  return (
    <Modal visible={!done} animationType="fade" onRequestClose={finish} statusBarTranslucent navigationBarTranslucent>
      <View accessibilityViewIsModal accessibilityLabel="Mesai'ye hoş geldin"
        style={{ flex: 1, backgroundColor: c.background, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }}>
        <View style={{ flexDirection: "row", justifyContent: "flex-end", paddingHorizontal: 20 }}>
          <Pressable onPress={finish} hitSlop={8} style={({ pressed }) => ({ height: 40, paddingHorizontal: 8, justifyContent: "center", opacity: pressed ? 0.5 : 1 })}>
            <Txt style={{ fontSize: 17, color: c.tint }}>Geç</Txt>
          </Pressable>
        </View>
        <ScrollView ref={setTrack} horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={{ flex: 1 }} scrollEventThrottle={16}
          onScroll={(e) => { const n = Math.round(e.nativeEvent.contentOffset.x / width); if (n !== i) setI(n); }}>
          {SLIDES.map(({ art: Art, title, text }, n) => (
            <View key={title} accessibilityElementsHidden={n !== i} style={{ width, alignItems: "center", justifyContent: "center", gap: 32, paddingHorizontal: 32 }}>
              <View style={{ height: 224, width: "100%", maxWidth: 320 }}>{n === i ? <Art reduce={reduce} /> : null}</View>
              <View style={{ maxWidth: 384, gap: 12 }}>
                <Txt style={{ fontSize: 34, lineHeight: 40.8, fontWeight: "700", letterSpacing: -0.748, textAlign: "center" }}>{title}</Txt>
                <Txt muted style={{ fontSize: 17, lineHeight: 27.6, textAlign: "center" }}>{text}</Txt>
              </View>
            </View>
          ))}
        </ScrollView>
        <View style={{ width: "100%", maxWidth: 384, alignSelf: "center", gap: 24, paddingHorizontal: 24 }}>
          <View style={{ flexDirection: "row", justifyContent: "center", gap: 8 }}>
            {SLIDES.map((_, n) => <Dot key={n} on={n === i} />)}
          </View>
          <Button title={last ? "Başlayalım" : "Devam"} size="cta" onPress={() => { if (last) { haptic("success"); finish(); } else go(i + 1); }} />
        </View>
      </View>
    </Modal>
  );
}
