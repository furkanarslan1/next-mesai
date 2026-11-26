import { Linking } from "react-native";

/** Yasal sayfalar web'de (herkese açık): mağaza kayıtları ve uygulama içi bağlantılar aynı adrese gider. */
const WEB = (process.env.EXPO_PUBLIC_WEB_URL ?? "https://next-mesai.vercel.app").replace(/\/$/, "");
export const LEGAL_URL = { privacy: `${WEB}/privacy`, terms: `${WEB}/terms`, deleteAccount: `${WEB}/delete-account`, support: `${WEB}/support` };
export const openLegal = (k: keyof typeof LEGAL_URL) => { void Linking.openURL(LEGAL_URL[k]); };
