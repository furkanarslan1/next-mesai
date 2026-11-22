import { afterEach, describe, expect, it, vi } from "vitest";
import { errorText, OFFLINE_TEXT } from "../lib/errors";

afterEach(() => vi.unstubAllGlobals());

describe("hata metinleri", () => {
  it("ağ hataları anlaşılır Türkçe olur", () => {
    for (const m of ["Failed to fetch", "TypeError: Failed to fetch", "Load failed", "NetworkError when attempting to fetch resource.", "fetch failed"]) {
      expect(errorText(new Error(m))).toBe(OFFLINE_TEXT);
    }
  });
  it("tarayıcı çevrimdışıysa her hata çevrimdışı mesajı olur", () => {
    vi.stubGlobal("navigator", { onLine: false });
    expect(errorText(new Error("whatever"))).toBe(OFFLINE_TEXT);
  });
  it("Supabase hata kodları çevrilir (Error olmayan nesne de olsa)", () => {
    expect(errorText({ code: "42501", message: "new row violates row-level security policy" })).toBe("Bu işlem için yetkin yok.");
    expect(errorText({ code: "23505", message: "duplicate key value violates unique constraint" })).toBe("Bu kayıt zaten var.");
    expect(errorText({ code: "23514", message: "new row violates check constraint" })).toBe("Girilen değer geçersiz.");
  });
  it("oturum ve sunucu hataları", () => {
    expect(errorText(new Error("JWT expired"))).toMatch(/Oturumun süresi doldu/);
    expect(errorText(new Error("503 Service Unavailable"))).toMatch(/Sunucuya şu an ulaşılamıyor/);
    expect(errorText(new Error("Request timed out"))).toMatch(/geç cevap verdi/);
    expect(errorText(new Error("Too many requests"))).toMatch(/Çok fazla deneme/);
  });
  it("kendi Türkçe mesajlarımız korunur", () => {
    expect(errorText(new Error("Hesap bilgileri yükleniyor, birkaç saniye sonra tekrar dene"))).toMatch(/^Hesap bilgileri/);
  });
  it("bilinmeyen İngilizce hata yerine verilen metin gösterilir", () => {
    expect(errorText(new Error("some weird internal thing"), "Kaydedilemedi")).toBe("Kaydedilemedi");
    expect(errorText(null, "Silinemedi")).toBe("Silinemedi");
    expect(errorText(undefined)).toBe("İşlem başarısız, tekrar dene");
  });
});
