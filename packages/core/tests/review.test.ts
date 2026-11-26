import { describe, expect, it } from "vitest";
import { EMPTY_REVIEW, markAsked, noteAdd, shouldAskReview, type ReviewState } from "../src/review";

const day = (n: number) => new Date(Date.UTC(2027, 0, 1) + n * 86_400_000);
const after = (adds: number, start = day(0)): ReviewState => {
  let s = EMPTY_REVIEW;
  for (let i = 0; i < adds; i++) s = noteAdd(s, start);
  return s;
};

describe("puan isteği", () => {
  it("10 mesai ve 7 gün dolmadan sorulmaz", () => {
    expect(shouldAskReview(after(9), day(30), "1.0.0")).toBe(false);
    expect(shouldAskReview(after(10), day(6), "1.0.0")).toBe(false);
    expect(shouldAskReview(after(10), day(7), "1.0.0")).toBe(true);
  });
  it("aynı sürümde bir kez, sonra en az 120 gün ara", () => {
    const asked = markAsked(after(10), day(10), "1.0.0");
    expect(shouldAskReview(asked, day(200), "1.0.0")).toBe(false);
    expect(shouldAskReview(asked, day(100), "1.1.0")).toBe(false);
    expect(shouldAskReview(asked, day(131), "1.1.0")).toBe(true);
  });
  it("ilk görülme ilk mesaide sabitlenir", () => {
    const s = noteAdd(noteAdd(EMPTY_REVIEW, day(0)), day(5));
    expect(s.firstSeen).toBe(day(0).toISOString());
    expect(s.adds).toBe(2);
  });
});
