import { describe, expect, it } from "vitest";
import { bulkPlan, dayRules } from "../src/day";
import { addHours } from "../src/timesheet";
import { entry } from "./helpers";
const E = entry;

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

describe("toplu durum planı", () => {
  // 2026-11-23 pzt … 29 paz
  const days = ["2026-11-23", "2026-11-24", "2026-11-25", "2026-11-26", "2026-11-27", "2026-11-28", "2026-11-29"];
  const ents = [E("2026-11-24", "overtime", 2), E("2026-11-25", "sick")];
  it("yıllık izin: mesai, durum ve hafta sonu atlanır", () => {
    const p = bulkPlan(days, "paid_leave", ents, { saturday_off: true });
    expect(p.add).toEqual(["2026-11-23", "2026-11-26", "2026-11-27"]);
    expect(p.skipped.map((x) => x.reason)).toEqual(["work", "status", "rest", "rest"]);
  });
  it("rapor hafta sonuna da yazılır", () => {
    expect(bulkPlan(days, "sick", ents, { saturday_off: true }).add).toEqual(["2026-11-23", "2026-11-26", "2026-11-27", "2026-11-28", "2026-11-29"]);
  });
  it("resmi tatil işareti mesai olan güne de konur; yinelenen gün tek", () => {
    expect(bulkPlan(["2026-11-24", "2026-11-24"], "holiday", ents, { saturday_off: true }).add).toEqual(["2026-11-24"]);
  });
  it("29 Ekim yıllık izinden sayılmaz", () => {
    expect(bulkPlan(["2026-10-29"], "paid_leave", [], { saturday_off: true }).skipped[0].reason).toBe("rest");
  });
});
