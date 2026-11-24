import { describe, expect, it } from "vitest";
import { holidayName, religiousYears } from "../src/holidays";

describe("resmi tatiller", () => {
  it("2028 dini bayramları (Diyanet)", () => {
    expect(holidayName("2028-02-26")).toBe("Ramazan Bayramı 1. gün");
    expect(holidayName("2028-02-28")).toBe("Ramazan Bayramı 3. gün");
    expect(holidayName("2028-05-05")).toBe("Kurban Bayramı 1. gün");
    expect(holidayName("2028-05-08")).toBe("Kurban Bayramı 4. gün");
    expect(holidayName("2028-02-25")).toBeNull(); // arife tatil sayılmaz (yarım gün)
  });
  it("sabit tatiller her yıl", () => {
    expect(holidayName("2031-10-29")).toBe("Cumhuriyet Bayramı");
  });
  // Hatırlatma: bu yıl ve gelecek yılın dini bayramları tanımlı olmalı. Kırmızıya dönerse
  // Diyanet'in yeni yıl listesinden holidays.ts'e ekle (yoksa bayramda mesai tatil ücretiyle hesaplanmaz).
  it("bu yıl ve gelecek yıl için dini bayramlar girilmiş", () => {
    const y = new Date().getFullYear();
    expect(religiousYears()).toEqual(expect.arrayContaining([y, y + 1]));
  });
});
