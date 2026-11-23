import { describe, expect, it } from "vitest";
import { parseNum, parsePositive } from "../src/num";

describe("parseNum", () => {
  it.each([
    ["2,5", 2.5], ["2.5", 2.5], ["6,25", 6.25], ["10", 10], ["45.000", 45000], ["5.000", 5000],
    ["1.250,50", 1250.5], ["1,250.50", 1250.5], ["1.000.000", 1000000], ["0.125", 0.125],
    ["12.50", 12.5], ["9494.73", 9494.73], [" 3 ", 3], ["₺ 2.000", 2000], ["%150", 150], ["7.", 7],
  ])("%s → %d", (v, n) => expect(parseNum(v)).toBe(n));
  it.each(["", "abc", "1.2.3,4,5x", ".", ","])("%s → NaN", (v) => expect(parseNum(v)).toBeNaN());
  it("parsePositive boş/negatifte 0", () => {
    expect(parsePositive("")).toBe(0);
    expect(parsePositive("-3")).toBe(0);
    expect(parsePositive("2,5")).toBe(2.5);
  });
});
