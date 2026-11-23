/**
 * CSS `color-mix(in oklch, A p%, B)` ile aynı sonucu veren karışım (web'deki takvim hücreleri bununla boyanır).
 * sRGB → OKLab → OKLCH; ton (hue) kısa yoldan karıştırılır; sonuç sRGB'ye kırpılarak döner.
 */
type Lch = [number, number, number];

const toLin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const fromLin = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

function hexToOklch(hex: string): Lch {
  const n = parseInt(hex.slice(1), 16);
  const r = toLin(((n >> 16) & 255) / 255), g = toLin(((n >> 8) & 255) / 255), b = toLin((n & 255) / 255);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return [L, Math.hypot(A, B), ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360];
}

function oklchToHex([L, C, H]: Lch): string {
  const a = C * Math.cos((H * Math.PI) / 180), b = C * Math.sin((H * Math.PI) / 180);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const rgb = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
  return "#" + rgb.map((v) => Math.round(Math.min(1, Math.max(0, fromLin(v))) * 255).toString(16).padStart(2, "0")).join("");
}

/** color-mix(in oklch, a p, b): p 0..1 a'nın payı */
export function mixOklch(a: string, b: string, p: number): string {
  const A = hexToOklch(a), B = hexToOklch(b);
  let d = B[2] - A[2];
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  // Gri (renksiz) uçta ton tanımsız: diğer rengin tonu kullanılır
  const hA = A[1] < 1e-4 ? B[2] : A[2], hB = B[1] < 1e-4 ? A[2] : B[2];
  if (A[1] < 1e-4 || B[1] < 1e-4) d = hB - hA;
  const q = 1 - p;
  return oklchToHex([A[0] * p + B[0] * q, A[1] * p + B[1] * q, (hA + d * q + 360) % 360]);
}
