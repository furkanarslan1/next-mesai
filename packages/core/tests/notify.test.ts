import { describe, expect, it } from "vitest";
import { planReminders } from "../src/notify";
import { SETTINGS as S, entry as E } from "./helpers";

// 2026-11-25 çarşamba 10:00
const now = new Date(2026, 10, 25, 10, 0);
const O = { evening: true, eveningHour: 20, dismissed: "", exit: true };
const ids = (p: { id: string }[]) => p.map((x) => x.id);

describe("bildirim planı", () => {
  it("bugün: çıkış (16:00) ve akşam (20:00)", () => {
    const p = planReminders(now, O, S, [], 1);
    expect(ids(p)).toEqual(["exit-2026-11-25", "evening-2026-11-25"]);
    expect(p[0].at).toEqual(new Date(2026, 10, 25, 16, 0));
  });
  it("geçmiş saat kurulmaz", () => {
    expect(ids(planReminders(new Date(2026, 10, 25, 17, 0), O, S, [], 1))).toEqual(["evening-2026-11-25"]);
  });
  it("mesai girilen günde ikisi de yok, izinli günde çıkış yok", () => {
    const p = planReminders(now, O, S, [E("2026-11-25", "overtime", 2), E("2026-11-26", "paid_leave")], 2);
    expect(ids(p)).toEqual([]);
  });
  it("hafta sonu çıkış yok, akşam var; cumartesi iş günüyse çıkış da var", () => {
    const sat = new Date(2026, 10, 28, 9, 0);
    expect(ids(planReminders(sat, O, S, [], 1))).toEqual(["evening-2026-11-28"]);
    expect(ids(planReminders(sat, O, { ...S, saturday_off: false }, [], 1))).toEqual(["exit-2026-11-28", "evening-2026-11-28"]);
  });
  it("'Yapmadım' denilen akşam yok; kapalı seçenekler yok", () => {
    expect(ids(planReminders(now, { ...O, dismissed: "2026-11-25" }, S, [], 1))).toEqual(["exit-2026-11-25"]);
    expect(planReminders(now, { ...O, evening: false, exit: false }, S, [])).toEqual([]);
  });
  it("resmi tatilde çıkış yok (29 Ekim)", () => {
    expect(ids(planReminders(new Date(2026, 9, 29, 8, 0), { ...O, evening: false }, S, [], 1))).toEqual([]);
  });
  it("14 gün, sıralı", () => {
    const p = planReminders(now, O, S, []);
    expect(p.length).toBe(14 + 10); // 14 akşam + 10 iş günü (25.11–08.12)
    expect(p.every((x, i) => i === 0 || p[i - 1].at <= x.at)).toBe(true);
  });
  it("akşam vardiyası (16–00) çıkışı gece yarısı; döngüde o haftanın vardiyası", () => {
    const ev = { ...S, work_start: "16:00", work_end: "00:00" };
    expect(planReminders(now, { ...O, evening: false }, ev, [], 1)[0].at).toEqual(new Date(2026, 10, 26, 0, 0));
    const rot = { ...S, shift_rotation: { start: "2026-11-23", weeks: 1, steps: [{ type: "day" as const, start: "08:00", end: "16:00" }, { type: "evening" as const, start: "16:00", end: "00:00" }] } };
    const p = planReminders(new Date(2026, 10, 30, 9, 0), { ...O, evening: false }, rot, [], 1);
    expect(p[0].at).toEqual(new Date(2026, 11, 1, 0, 0));
  });
});
