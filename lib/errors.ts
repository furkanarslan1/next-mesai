/**
 * Kullanıcıya gösterilecek hata metni. Supabase/tarayıcı hataları İngilizce ve teknik gelir
 * ("Failed to fetch", "row-level security..."): bilinen durumlar anlaşılır Türkçeye çevrilir.
 * Bizim kendi yazdığımız Türkçe mesajlar aynen korunur; bilinmeyen İngilizce hatalar `fallback` ile değişir.
 */
function messageOf(e: unknown): string {
  if (typeof e === "string") return e;
  if (e && typeof e === "object" && "message" in e && typeof (e as { message: unknown }).message === "string") return (e as { message: string }).message;
  return "";
}
const codeOf = (e: unknown): string => (e && typeof e === "object" && "code" in e ? String((e as { code: unknown }).code) : "");

export const OFFLINE_TEXT = "İnternet bağlantısı yok. Bağlantı gelince tekrar dene.";

export function errorText(e: unknown, fallback = "İşlem başarısız, tekrar dene"): string {
  const msg = messageOf(e);
  const code = codeOf(e);
  const m = msg.toLowerCase();
  const offline = typeof navigator !== "undefined" && navigator.onLine === false;

  if (offline || /failed to fetch|networkerror|network request failed|load failed|fetch failed|network error/.test(m)) return OFFLINE_TEXT;
  if (/timeout|timed out|aborted/.test(m)) return "Sunucu geç cevap verdi, tekrar dene.";
  if (/jwt|invalid refresh token|not authenticated|session.*(expired|missing)/.test(m)) return "Oturumun süresi doldu. Çıkış yapıp tekrar giriş yap.";
  if (code === "42501" || /row-level security|permission denied/.test(m)) return "Bu işlem için yetkin yok.";
  if (code === "23505" || /duplicate key|already exists/.test(m)) return "Bu kayıt zaten var.";
  if (code === "23514" || /violates check constraint/.test(m)) return "Girilen değer geçersiz.";
  if (code === "23503" || /foreign key/.test(m)) return "İlişkili kayıt bulunamadı.";
  if (/rate limit|too many requests/.test(m) || code === "429") return "Çok fazla deneme yapıldı, biraz bekleyip tekrar dene.";
  if (/bad gateway|service unavailable|gateway timeout|internal server error|\b50[234]\b/.test(m)) return "Sunucuya şu an ulaşılamıyor, biraz sonra tekrar dene.";
  // Bizim yazdığımız Türkçe mesajlar olduğu gibi gösterilir
  if (/[çğıöşüÇĞİÖŞÜ]/.test(msg)) return msg;
  return fallback;
}
