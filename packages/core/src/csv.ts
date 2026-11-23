/** Satırları CSV metnine çevirir (Excel'de Türkçe karakterler için BOM ile; formül enjeksiyonuna karşı korumalı). */
export function toCSV(rows: Record<string, unknown>[]) {
  if (!rows.length) return "";
  const cols = Object.keys(rows[0]);
  const esc = (v: unknown) => {
    const t = v !== null && typeof v === "object" ? JSON.stringify(v) : String(v ?? "");
    // Excel'de "=, +, -, @" ile başlayan hücreler formül sayılır: metnin başına ' eklenir
    return `"${(/^[=+\-@]/.test(t) && Number.isNaN(Number(t)) ? `'${t}` : t).replace(/"/g, '""')}"`;
  };
  return "﻿" + [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n");
}
