/**
 * Uygulama ikonu ve iOS açılış ekranlarını (apple-touch-startup-image) üretir.
 * Çalıştır: node scripts/generate-assets.mjs  → public/icons/*, public/splash/*, app/apple-icon.png
 * Tasarım: lacivert zemin üzerinde hedef halkası (uygulamanın imza öğesi) ve saat ibreleri.
 */
import { createRequire } from "node:module";
import { writeFileSync, mkdirSync } from "node:fs";

const require = createRequire(`${process.cwd()}/package.json`);
const { ImageResponse } = require("next/og");
const React = require("react");
const h = React.createElement;

const NAVY_A = "#1d2a44", NAVY_B = "#0a1220", TEAL = "#5b91a3", MINT = "#cfeae0";

/** Halka + ibreler (viewBox 0..100). */
function markSvg() {
  const r = 34, c = 2 * Math.PI * r, p = 0.72;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${MINT}"/><stop offset="1" stop-color="${TEAL}"/></linearGradient>
    <filter id="f" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2.2"/></filter>
  </defs>
  <circle cx="50" cy="50" r="${r}" fill="none" stroke="${TEAL}" stroke-opacity="0.22" stroke-width="9"/>
  <circle cx="50" cy="50" r="${r}" fill="none" stroke="url(#g)" stroke-width="9" stroke-linecap="round" stroke-dasharray="${c * p} ${c}" transform="rotate(-90 50 50)" filter="url(#f)" opacity="0.55"/>
  <circle cx="50" cy="50" r="${r}" fill="none" stroke="url(#g)" stroke-width="9" stroke-linecap="round" stroke-dasharray="${c * p} ${c}" transform="rotate(-90 50 50)"/>
  <path d="M50 31 V50 L62 57" fill="none" stroke="${MINT}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="50" cy="50" r="4.2" fill="${MINT}"/>
</svg>`;
}
const markUri = `data:image/svg+xml;base64,${Buffer.from(markSvg()).toString("base64")}`;

async function png(el, width, height) {
  return Buffer.from(await new ImageResponse(el, { width, height }).arrayBuffer());
}

function icon(size, pad = 0.16) {
  return h("div", { style: { width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: `linear-gradient(150deg, ${NAVY_A}, ${NAVY_B})` } },
    h("img", { src: markUri, width: size * (1 - pad * 2), height: size * (1 - pad * 2) }));
}

function splash(w, h_) {
  const s = Math.min(w, h_) * 0.3;
  return h("div", { style: { width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: `linear-gradient(170deg, ${NAVY_A}, ${NAVY_B})` } },
    h("img", { src: markUri, width: s, height: s }),
    h("div", { style: { marginTop: s * 0.18, fontSize: s * 0.26, fontWeight: 700, color: MINT, letterSpacing: -1 } }, "Mesai"));
}

// [cihaz genişliği, yüksekliği (pt), piksel oranı]
export const SPLASH = [
  [440, 956, 3], [402, 874, 3], [430, 932, 3], [393, 852, 3], [428, 926, 3],
  [390, 844, 3], [375, 812, 3], [414, 896, 3], [414, 896, 2], [375, 667, 2], [320, 568, 2],
];

mkdirSync("public/icons", { recursive: true });
mkdirSync("public/splash", { recursive: true });
writeFileSync("public/icons/icon-192.png", await png(icon(192), 192, 192));
writeFileSync("public/icons/icon-512.png", await png(icon(512), 512, 512));
// Maskable: Android ikonu daire/kare kırpar, güvenli alan için daha çok boşluk
writeFileSync("public/icons/icon-maskable-512.png", await png(icon(512, 0.24), 512, 512));
writeFileSync("app/apple-icon.png", await png(icon(180), 180, 180));
for (const [w, hh, d] of SPLASH) {
  writeFileSync(`public/splash/${w * d}x${hh * d}.png`, await png(splash(w * d, hh * d), w * d, hh * d));
}
console.log("ikonlar ve açılış ekranları üretildi");
