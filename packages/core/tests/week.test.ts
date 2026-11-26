import { describe, expect, it } from "vitest";
import { weekDays } from "../src/week";
import type { Entry } from "../src/types";

const e = (work_date: string, type: Entry["type"], hours = 0): Entry => ({ id: `${work_date}-${type}`, work_date, type, hours, note: null } as Entry);

describe("weekDays", () => {
  it("pazartesi başlar, ay geçişinde iki ay döner", () => {
    const w = weekDays("2026-12-02", []); // Çarşamba
    expect(w.days[0].date).toBe("2026-11-30");
    expect(w.days[6].date).toBe("2026-12-06");
    expect(w.months).toEqual(["2026-11", "2026-12"]);
    expect(w.days.map((d) => d.label)).toEqual(["Pt", "Sa", "Ça", "Pe", "Cu", "Ct", "Pz"]);
  });
  it("mesai saatleri, durumlar ve tatiller", () => {
    const w = weekDays("2026-10-28", [
      e("2026-10-26", "overtime", 2.5), e("2026-10-27", "sick"), e("2026-10-29", "holiday", 8), e("2026-11-01", "overtime", 1),
    ]);
    expect(w.total).toBe(11.5);
    expect(w.max).toBe(8);
    expect(w.days[1].status).toBe("sick");
    expect(w.days[3]).toMatchObject({ hours: 8, workType: "holiday", holiday: true, status: null });
    expect(w.months).toEqual(["2026-10", "2026-11"]);
  });
});
