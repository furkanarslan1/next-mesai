import type { Entry, FinanceItem, Settings } from "./types";
import { monthSummary, salaryDeduction } from "./calc";

export type FinanceKind = FinanceItem["kind"];
export type CategoryKey =
  | "kira" | "market" | "yakit" | "elektrik" | "su" | "dogalgaz" | "internet" | "telefon" | "kredi" | "diger"
  | "ekgelir" | "prim" | "harclik";

/** Kategori adı -> ikon anahtarı ve renk. Bilinmeyen (elle yazılmış) kategoriler "diger" olur. */
export const CATEGORY_META: Record<CategoryKey, { label: string; color: string }> = {
  kira: { label: "Kira", color: "#5b91a3" },
  market: { label: "Market", color: "#2f9e6e" },
  yakit: { label: "Yakıt", color: "#e08a3c" },
  elektrik: { label: "Elektrik", color: "#d9a514" },
  su: { label: "Su", color: "#3b9ad9" },
  dogalgaz: { label: "Doğalgaz", color: "#e0603c" },
  internet: { label: "İnternet", color: "#7a6fd6" },
  telefon: { label: "Telefon", color: "#d86a9a" },
  kredi: { label: "Kredi/Kart", color: "#4a5d78" },
  diger: { label: "Diğer", color: "#7f8f9c" },
  ekgelir: { label: "Ek gelir", color: "#2f9e6e" },
  prim: { label: "Prim", color: "#d9a514" },
  harclik: { label: "Harçlık", color: "#5b91a3" },
};

export const EXPENSE_CATEGORIES: CategoryKey[] = ["kira", "market", "yakit", "elektrik", "su", "dogalgaz", "internet", "telefon", "kredi", "diger"];
export const INCOME_CATEGORIES: CategoryKey[] = ["ekgelir", "prim", "harclik", "diger"];

const norm = (s: string) => s.toLocaleLowerCase("tr").replace(/ı/g, "i").replace(/[ğ]/g, "g").replace(/[ş]/g, "s").replace(/[ç]/g, "c").replace(/[ö]/g, "o").replace(/[ü]/g, "u").replace(/\s+/g, "");
const ALIASES: Record<string, CategoryKey> = {
  kira: "kira", market: "market", yakit: "yakit", elektrik: "elektrik", su: "su", dogalgaz: "dogalgaz", internet: "internet",
  telefon: "telefon", "kredi/kart": "kredi", kredi: "kredi", kart: "kredi", diger: "diger",
  ekgelir: "ekgelir", prim: "prim", harclik: "harclik", maas: "ekgelir",
};
export const categoryKey = (name: string): CategoryKey => ALIASES[norm(name)] ?? "diger";

/** Bir ayın gelir-gider özeti. Maaş (kesinti düşülmüş) ve mesai kazancı otomatik gelirdir. */
export function financeSummary(items: FinanceItem[], entries: Entry[], s: Settings) {
  const ded = salaryDeduction(entries, s);
  const salary = Math.max(0, s.monthly_salary - ded.amount);
  const overtime = monthSummary(entries, s).earned;
  const extra = items.filter((i) => i.kind === "income").reduce((a, i) => a + i.amount, 0);
  const expense = items.filter((i) => i.kind === "expense").reduce((a, i) => a + i.amount, 0);
  const income = salary + overtime + extra;
  const left = income - expense;
  const byCategory = new Map<string, number>();
  items.filter((i) => i.kind === "expense").forEach((i) => byCategory.set(i.category, (byCategory.get(i.category) ?? 0) + i.amount));
  const breakdown = [...byCategory.entries()].map(([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount);
  return {
    salary, deduction: ded.amount, overtime, extra, income, expense, left,
    savingRate: income > 0 ? (left / income) * 100 : 0,
    breakdown,
  };
}
