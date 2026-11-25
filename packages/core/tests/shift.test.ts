import { describe, expect, it } from "vitest";
import { rotationLabel, rotationStartFor, scheduleFor, validRotation } from "../src/shift";
import { SETTINGS as S, day } from "./helpers";

const R = { start: "2026-11-23", weeks: 1, steps: [{ type: "day" as const, start: "08:00", end: "16:00" }, { type: "night" as const, start: "00:00", end: "08:00" }] };

describe("vardiya döngüsü", () => {
  it("döngü yoksa sabit saat", () => {
    expect(scheduleFor(day("2026-11-25"), S)).toMatchObject({ start: "08:00", end: "16:00", rotating: false, hours: 8 });
  });
  it("haftalık değişir; pazar o haftanın adımında kalır", () => {
    const s = { ...S, shift_rotation: R };
    expect(scheduleFor(day("2026-11-25"), s).type).toBe("day");
    expect(scheduleFor(day("2026-11-29"), s).type).toBe("day"); // pazar
    expect(scheduleFor(day("2026-11-30"), s)).toMatchObject({ type: "night", start: "00:00", end: "08:00", step: 1 });
    expect(scheduleFor(day("2026-12-07"), s).type).toBe("day");
  });
  it("2 haftada bir ve başlangıçtan önceki haftalar", () => {
    const s = { ...S, shift_rotation: { ...R, weeks: 2 } };
    expect(scheduleFor(day("2026-12-03"), s).type).toBe("day");
    expect(scheduleFor(day("2026-12-08"), s).type).toBe("night");
    expect(scheduleFor(day("2026-11-18"), s).type).toBe("night"); // 1 hafta önce → -1 hafta / 2 = -1 → son adım
  });
  it("bu hafta seçilen adımda olacak başlangıç", () => {
    const start = rotationStartFor(day("2026-11-25"), 1, 1);
    expect(start).toBe("2026-11-16");
    expect(scheduleFor(day("2026-11-25"), { ...S, shift_rotation: { ...R, start } }).type).toBe("night");
  });
  it("geçersiz döngü yok sayılır", () => {
    expect(validRotation({ ...R, steps: [R.steps[0]] })).toBeNull();
    expect(validRotation({ ...R, weeks: 9 })?.weeks).toBe(4);
    expect(validRotation("x")).toBeNull();
  });
  it("etiket", () => expect(rotationLabel(R)).toBe("Gündüz → Gece · haftalık"));
});
