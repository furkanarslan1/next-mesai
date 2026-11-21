import { describe, expect, it } from "vitest";
import { categoryKey, financeSummary } from "../lib/finance";
import { earnedBadges, streaks } from "../lib/badges";
import { fetchAll, monthSpan, PAGE } from "../lib/fetch-all";
import { SETTINGS as S, day, entry as E, financeItem as F } from "./helpers";

describe("gelir-gider özeti", () => {
  const entries = [E("2026-11-03", "overtime", 2), E("2026-11-04", "absent")];
  const items = [
    F({ kind: "expense", category: "Kira", amount: 10000, recurring: true }),
    F({ kind: "expense", category: "Market", amount: 3000 }),
    F({ kind: "income", category: "Prim", amount: 1000 }),
  ];
  it("maaş (kesintili) ve mesai otomatik gelirdir", () => {
    const f = financeSummary(items, entries, S);
    expect(f.income).toBe(29000 + 200 + 1000);
    expect(f.expense).toBe(13000);
    expect(f.left).toBe(30200 - 13000);
    expect(f.savingRate).toBeCloseTo(((30200 - 13000) / 30200) * 100, 5);
  });
  it("gider dağılımı büyükten küçüğe", () => {
    expect(financeSummary(items, entries, S).breakdown.map((b) => b.category)).toEqual(["Kira", "Market"]);
  });
  it("gelir sıfırken tasarruf oranı 0", () => {
    expect(financeSummary([], [], { ...S, monthly_salary: 0 }).savingRate).toBe(0);
  });
  it("kategori adı eşlemesi (Türkçe karakter ve büyük harf)", () => {
    expect(["Yakıt", "KİRA", "Kredi/Kart", "Maaş", "bilinmeyen"].map(categoryKey)).toEqual(["yakit", "kira", "kredi", "ekgelir", "diger"]);
  });
});

describe("seri ve rozetler", () => {
  const run = ["2026-11-15", "2026-11-16", "2026-11-17", "2026-11-19", "2026-11-20", "2026-11-21"].map((d) => E(d, "overtime", 2));
  it("bugün dahil seri", () => expect(streaks(run, day("2026-11-21"))).toEqual({ current: 3, best: 3 }));
  it("bugün girilmediyse dünden sayılır", () => expect(streaks(run.slice(0, 5), day("2026-11-21"))).toEqual({ current: 2, best: 3 }));
  it("iki gün boşluk seriyi sıfırlar", () => expect(streaks(run.slice(0, 3), day("2026-11-21")).current).toBe(0));
  it("durum günleri ve 0 saatlik kayıtlar seriyi artırmaz", () => {
    expect(streaks([E("2026-11-20", "sick"), E("2026-11-21", "overtime", 0)], day("2026-11-21"))).toEqual({ current: 0, best: 0 });
  });
  it("rozetler", () => {
    const got = earnedBadges({ "2026-10": [E("2026-10-05", "overtime", 5)], "2026-11": run }, { ...S, goal_mode: "hours", monthly_goal_hours: 10 }, 120, day("2026-11-21"));
    expect([...got].sort()).toEqual(["first", "goal", "h100", "h50", "steady", "streak3"].sort());
  });
  it("devamsızlıkta 'Devamlı', hedefsizken 'Hedef' rozeti yok", () => {
    const got = earnedBadges({ "2026-10": [E("2026-10-05", "overtime", 5), E("2026-10-06", "absent")] }, S, 3, day("2026-11-21"));
    expect([...got]).toEqual(["first"]);
  });
});

describe("sayfalı okuma (1000 satır sınırı)", () => {
  it("tüm sayfaları birleştirir", async () => {
    const total = PAGE * 2 + 37;
    const rows = Array.from({ length: total }, (_, i) => i);
    const calls: number[] = [];
    const out = await fetchAll<number>(async (from, to) => { calls.push(from); return { data: rows.slice(from, to + 1), error: null }; });
    expect(out).toHaveLength(total);
    expect(calls).toEqual([0, PAGE, PAGE * 2]);
  });
  it("tam sayfa sonrası boş sayfada durur", async () => {
    const rows = Array.from({ length: PAGE }, (_, i) => i);
    const out = await fetchAll<number>(async (from, to) => ({ data: rows.slice(from, to + 1), error: null }));
    expect(out).toHaveLength(PAGE);
  });
  it("hata olursa null döner", async () => {
    expect(await fetchAll<number>(async () => ({ data: null, error: new Error("x") }))).toBeNull();
  });
  it("ay aralığı yıl sınırını geçer", () => {
    expect(monthSpan(["2026-02", "2025-11", "2026-01"])).toEqual(["2025-11", "2025-12", "2026-01", "2026-02"]);
    expect(monthSpan(["2026-05"])).toEqual(["2026-05"]);
  });
});
