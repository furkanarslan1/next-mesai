"use client";

import { useSyncExternalStore } from "react";
import { Briefcase, CheckCircle2, Coffee, Moon, Plus, Sparkles, Sunrise } from "lucide-react";
import { hhmm, hrs, overtimeAfter } from "@/lib/calc";
import { TYPE_META, type Entry, type Settings } from "@/lib/types";

// Dakikada bir yenilenen "şimdi" (dakika numarası: aynı dakikada aynı değer, gereksiz çizim yok)
const subscribe = (cb: () => void) => {
  const id = window.setInterval(cb, 15_000);
  document.addEventListener("visibilitychange", cb);
  return () => { window.clearInterval(id); document.removeEventListener("visibilitychange", cb); };
};
const minuteNow = () => Math.floor(Date.now() / 60_000);

const toMin = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
const dur = (mins: number) => {
  const h = Math.floor(mins / 60), m = mins % 60;
  return h > 0 ? (m > 0 ? `${h} sa ${m} dk` : `${h} sa`) : `${m} dk`;
};

/**
 * Kilit ekranı widget'ı gibi canlı "Bugün" kartı: işe kalan süre, çıkışa geri sayım ve iş günü ilerlemesi;
 * normal çıkıştan sonra "şu ana kadarki mesaiyi ekle" kısayolu. Gece vardiyası (gün aşan) desteklenir.
 */
export function TodayCard({ settings, entries, holiday, onAddUntil }: {
  settings: Settings; entries: Entry[]; holiday: string | null;
  /** Normal çıkıştan sonra: verilen çıkış saatine (HH:MM) kadar mesai ekle */
  onAddUntil: (exit: string, hours: number) => void;
}) {
  const minute = useSyncExternalStore(subscribe, minuteNow, () => 0);
  if (!minute || !settings.work_start || !settings.work_end) return null;

  const now = new Date(minute * 60_000);
  const clock = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const start = hhmm(settings.work_start), end = hhmm(settings.work_end);
  const work = entries.find((e) => (e.type === "overtime" || e.type === "holiday") && Number(e.hours) > 0);
  const off = entries.find((e) => ["paid_leave", "unpaid_leave", "sick", "absent"].includes(e.type));
  // Yalnızca pazar dinlenme günü sayılır (birçok iş yerinde cumartesi çalışılır)
  const weekend = now.getDay() === 0;

  let icon = Briefcase, title = "", sub = "", progress: number | null = null, action: React.ReactNode = null, tone = "var(--teal)";

  if (work) {
    icon = CheckCircle2; title = `Bugün ${hrs(Number(work.hours))} mesai`; sub = "Kaydedildi. Eline sağlık!";
  } else if (off) {
    icon = Coffee; title = `Bugün ${TYPE_META[off.type].label.toLocaleLowerCase("tr")}`; sub = "İyi dinlenmeler."; tone = "#7f8f9c";
  } else if (holiday || weekend) {
    icon = Sparkles; title = holiday ?? "Bugün pazar"; sub = "Çalıştıysan mesaini aşağıdan ekle."; tone = "#d9a514";
  } else {
    const s = toMin(start);
    let e = toMin(end);
    if (e <= s) e += 1440; // gece vardiyası
    let n = now.getHours() * 60 + now.getMinutes();
    if (e > 1440 && n < e - 1440) n += 1440;
    if (n < s) {
      icon = Sunrise; title = `İşe ${dur(s - n)} kaldı`; sub = `Giriş ${start} · Çıkış ${end}`; progress = 0;
    } else if (n < e) {
      icon = Briefcase; title = `Çıkışa ${dur(e - n)} kaldı`; sub = `${start}–${end} · günün %${Math.round(((n - s) / (e - s)) * 100)}'i bitti`;
      progress = (n - s) / (e - s);
    } else {
      const extra = overtimeAfter(end, clock);
      const rounded = Math.floor(extra * 4) / 4; // çeyrek saate yuvarla
      icon = Moon; tone = "#7a6fd6";
      title = extra > 0 && extra < 12 ? `Çıkış saatinden ${dur(n - e)} geçti` : "Normal mesai bitti";
      sub = rounded > 0 ? "Hâlâ işteysen mesaini tek dokunuşla ekle." : "Bugün mesai yaptıysan eklemeyi unutma.";
      if (rounded > 0 && rounded <= 12) {
        action = (
          <button type="button" onClick={() => onAddUntil(clock, rounded)}
            className="glass-navy flex h-10 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold">
            <Plus className="size-4" />{hrs(rounded)}
          </button>
        );
      }
    }
  }
  const Icon = icon;

  return (
    <section className="glass flex flex-col gap-3 p-4" aria-label="Bugün">
      <div className="flex items-center gap-3.5">
        <span className="grid size-11 shrink-0 place-items-center rounded-full text-white shadow-sm" style={{ background: tone }}>
          <Icon className="size-5.5" strokeWidth={2.2} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Bugün · <span className="tabular-nums">{clock}</span></p>
          <p className="truncate text-[17px] font-semibold leading-snug">{title}</p>
          <p className="truncate text-[13px] text-muted-foreground">{sub}</p>
        </div>
        {action}
      </div>
      {progress !== null && (
        <div className="h-1.5 overflow-hidden rounded-full bg-[var(--ring-track)]" aria-hidden>
          <div className="h-full rounded-full bg-gradient-to-r from-[var(--ring-a)] to-[var(--ring-b)] transition-[width] duration-700" style={{ width: `${Math.max(2, progress * 100)}%` }} />
        </div>
      )}
    </section>
  );
}
