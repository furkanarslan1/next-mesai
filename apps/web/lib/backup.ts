/**
 * Dosya indirir. Bağlantı adresi hemen iptal edilirse Safari/Firefox indirmeyi başlatamayabiliyor;
 * bu yüzden bir süre sonra serbest bırakılır.
 */
export function download(name: string, content: string, mime: string) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const a = document.createElement("a");
  a.href = url; a.download = name; a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
/** Art arda birden çok dosya indirirken tarayıcı engellemesin diye aralarına kısa bekleme koyar. */
export const nextDownload = () => new Promise<void>((r) => window.setTimeout(r, 400));

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
