/**
 * Yasal sayfalardaki (gizlilik, koşullar, hesap silme) sabitler. Mağaza kayıtlarındaki geliştirici adı ve
 * destek e-postasıyla AYNI olmalı (Google Play hesap silme bağlantısında uygulama/geliştirici adı aranır).
 * TODO(yayın öncesi): OWNER ve EMAIL doldurulmalı.
 */
export const LEGAL = {
  app: "Mesai",
  owner: "[Geliştirici adı soyadı]",
  email: "[destek e-postası]",
  site: "https://next-mesai.vercel.app",
  /** Veritabanı ve kimlik doğrulama sunucusunun bölgesi (Supabase) */
  dataRegion: "Singapur (AWS ap-southeast-1)",
  updated: "25 Kasım 2026",
};
