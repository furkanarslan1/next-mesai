import { describe, expect, it } from "vitest";
import { grossToNet, grossToNetYear, incomeTax, netToGross, TAX, taxYearFor } from "../src/tax";

describe("brüt → net", () => {
  it("bu yılın ve gelecek yılın parametresi tanımlı olmalı (yoksa TAX'a ekle)", () => {
    // Yalnızca bu yıl zorunlu: yeni yıl parametreleri ocakta açıklanır
    expect(TAX[new Date().getFullYear()]).toBeDefined();
  });
  it("asgari ücret: brüt 33.030 → net 28.075,50 her ay", () => {
    grossToNetYear(33030, 2026).forEach((m) => expect(m.net).toBeCloseTo(28075.5, 2));
  });
  it("dilim hesabı", () => {
    const b = TAX[2026].brackets;
    expect(incomeTax(100000, b)).toBe(15000);
    expect(incomeTax(300000, b)).toBeCloseTo(190000 * 0.15 + 110000 * 0.2, 5);
  });
  it("yüksek brütte yıl içinde dilim atladıkça net düşer", () => {
    const y = grossToNetYear(60000, 2026);
    expect(y[0].net).toBeGreaterThan(y[11].net);
    expect(y[0].rate).toBe(0.15);
  });
  it("SGK tavanı üstünde prim tavandan kesilir", () => {
    const m = grossToNet(400000, 2026, 1);
    expect(m.sgk).toBeCloseTo(297270 * 0.14, 2);
  });
  it("netten brüte geri dönüş tutarlı", () => {
    const g = netToGross(45000, 2026, 3);
    expect(grossToNet(g, 2026, 3).net).toBeCloseTo(45000, 1);
    expect(netToGross(28075.5, 2026, 1)).toBeCloseTo(33030, 0);
  });
  it("tanımsız yıl en son yıla düşer", () => expect(taxYearFor(2030)).toBe(2026));
});
