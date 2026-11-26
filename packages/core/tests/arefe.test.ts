import { describe, expect, it } from "vitest";
import { dayRules } from "../src/day";
import { arefeName } from "../src/holidays";

describe("arife", () => {
  it("28 Ekim ve bayram arifeleri", () => {
    expect(arefeName("2026-10-28")).toBe("Cumhuriyet Bayramı arifesi");
    expect(arefeName("2026-03-19")).toBe("Ramazan Bayramı arifesi");
    expect(arefeName("2026-05-26")).toBe("Kurban Bayramı arifesi");
    expect(arefeName("2028-02-25")).toBe("Ramazan Bayramı arifesi");
    expect(arefeName("2026-03-20")).toBeNull(); // bayramın kendisi arife değil
    expect(arefeName("2026-11-26")).toBeNull();
  });
  it("13:00 sonrası başlayan mesai tatil oranıyla", () => {
    expect(dayRules([], "2026-10-28", "16:00").workType).toBe("holiday");
    expect(dayRules([], "2026-10-28", "16:00").arefe).toBe("Cumhuriyet Bayramı arifesi");
    // gece vardiyası: normal çıkış sabah 08:00 → mesai 13:00 öncesi, normal oran
    expect(dayRules([], "2026-10-28", "08:00").workType).toBe("overtime");
    // kısayolun kendi başlangıç saati varsa o esas alınır
    expect(dayRules([], "2026-10-28", "16:00").workTypeAt("06:00")).toBe("overtime");
    expect(dayRules([], "2026-10-28", "08:00").workTypeAt("14:30:00")).toBe("holiday");
  });
  it("normal günde ve tam gün tatilde değişiklik yok", () => {
    expect(dayRules([], "2026-11-26", "16:00").workType).toBe("overtime");
    expect(dayRules([], "2026-10-29", "08:00").workType).toBe("holiday");
    expect(dayRules([], "2026-10-29").arefe).toBeNull();
  });
});
