import { describe, expect, it } from "vitest";
import { dayRules } from "../src/day";
import { addHours } from "../src/timesheet";
import { entry } from "./helpers";

describe("dayRules", () => {
  it("resmi tatilde mesai türü holiday olur", () => {
    expect(dayRules([], "2026-10-29").workType).toBe("holiday");
    expect(dayRules([], "2026-11-03").workType).toBe("overtime");
  });
  it("elle tatil işaretlenmiş gün de tatil sayılır", () => {
    expect(dayRules([entry("2026-11-03", "holiday", 0)], "2026-11-03").workType).toBe("holiday");
  });
  it("izin ve mesai kayıtlarını ayırır", () => {
    const r = dayRules([entry("2026-11-03", "sick"), entry("2026-11-03", "overtime", 2)], "2026-11-03");
    expect(r.off?.type).toBe("sick");
    expect(r.work?.hours).toBe(2);
  });
  it("addHours gece yarısını sarar", () => {
    expect(addHours("22:30", 3)).toBe("01:30");
  });
});
