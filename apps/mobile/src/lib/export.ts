import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

/**
 * Telefonda dışa aktarma: web'deki "indir" yerine dosya önbellek klasörüne yazılır ve telefonun paylaş
 * menüsü açılır (Dosyalar'a kaydet, WhatsApp, e-posta…).
 */
async function share(file: File, mimeType: string, uti: string) {
  if (!(await Sharing.isAvailableAsync())) throw new Error("Bu cihazda paylaşım kullanılamıyor");
  await Sharing.shareAsync(file.uri, { mimeType, UTI: uti, dialogTitle: file.name });
}

function writeFile(name: string, content: string | Uint8Array) {
  const file = new File(Paths.cache, name);
  file.create({ overwrite: true });
  file.write(content);
  return file;
}

/** CSV (metin `@mesai/core/csv` toCSV ile üretilir, BOM dahil) */
export async function shareCsv(name: string, csv: string) {
  await share(writeFile(name, csv), "text/csv", "public.comma-separated-values-text");
}

/** JSON (tam yedek) */
export async function shareJson(name: string, json: string) {
  await share(writeFile(name, json), "application/json", "public.json");
}

/** Seçilen dosyanın metni (yedekten geri yükleme) */
export const readText = (uri: string) => new File(uri).text();

/**
 * .xlsx dosyası: web ile aynı `write-excel-file` sayfa verisi. Kütüphanenin evrensel sürümü sonucu `Blob`
 * olarak verir; React Native ikili veriden Blob oluşturamadığı için Blob kurucusu bir anlığına baytları
 * yakalayan bir sarmalayıcıyla değiştirilir.
 */
export async function shareXlsx(name: string, data: unknown, options: unknown) {
  const Original = globalThis.Blob;
  let bytes: Uint8Array | null = null;
  class Capture {
    constructor(parts: (ArrayBuffer | Uint8Array)[]) {
      const p = parts[0];
      bytes = p instanceof Uint8Array ? p : new Uint8Array(p);
    }
  }
  try {
    // Excel kütüphanesi yalnızca dışa aktarırken yüklenir (açılışta paket/başlatma yükü olmasın)
    const { default: writeXlsxFile } = await import("write-excel-file/universal");
    (globalThis as { Blob: unknown }).Blob = Capture;
    await writeXlsxFile(data as any, options as any).toBlob();
  } finally {
    globalThis.Blob = Original;
  }
  if (!bytes) throw new Error("Excel dosyası oluşturulamadı");
  await share(writeFile(name, bytes), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "org.openxmlformats.spreadsheetml.sheet");
}

/** HTML'den PDF (yazdırma modülü) ve paylaşım */
export async function sharePdf(name: string, html: string, landscape = false) {
  const Print = await import("expo-print");
  const { uri } = await Print.printToFileAsync({ html, ...(landscape ? { width: 842, height: 595 } : {}) });
  const src = new File(uri);
  const dest = new File(Paths.cache, name);
  if (dest.exists) dest.delete();
  src.move(dest);
  await share(dest, "application/pdf", "com.adobe.pdf");
}

/** HTML'de güvenli metin */
export const esc = (s: string | number) => String(s).replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch]!);
