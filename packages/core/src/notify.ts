import { addDays } from "date-fns/addDays";
import { format } from "date-fns/format";
import { isRestDay, OFF_TYPES } from "./day";
import { holidayName } from "./holidays";
import type { Entry, Settings } from "./types";

export interface ReminderPlan { id: string; at: Date; title: string; body: string }
export interface ReminderOptions {
  /** Akşam hatırlatıcısı: o güne kayıt yoksa ayarlanan saatte */
  evening: boolean; eveningHour: number;
  /** "Yapmadım" denilen gün (yyyy-MM-dd): o akşam bildirim gelmez */
  dismissed: string;
  /** Çıkış saati: iş günlerinde normal çıkış saatinde "mesaiye kaldıysan ekle" */
  exit: boolean;
}

/** Telefonda önceden kurulacak bildirim sayısı sınırlı (iOS en çok 64); 14 gün × 2 yeter, her açılışta yenilenir. */
export const REMINDER_DAYS = 14;

/**
 * Önümüzdeki günlerin hatırlatma planı. Bildirim anında uygulama çalışmadığı için "bugün kayıt var mı" kontrolü
 * burada yapılır: kaydı olan günler atlanır, plan her kayıt değişikliğinde ve uygulama açılışında yeniden kurulur.
 * - Akşam: kayıt girilmemiş her gün (hafta sonu dahil; pazar mesaisi de girilir).
 * - Çıkış: hafta tatili, resmi tatil ve izin/rapor günleri hariç iş günlerinde, çıkış saatinde; o güne mesai girildiyse yok.
 */
export function planReminders(now: Date, o: ReminderOptions, s: Pick<Settings, "work_end" | "saturday_off">, entries: Entry[], days = REMINDER_DAYS): ReminderPlan[] {
  const byDate = new Map<string, Entry[]>();
  entries.forEach((e) => byDate.set(e.work_date, [...(byDate.get(e.work_date) ?? []), e]));
  const out: ReminderPlan[] = [];
  const [eh, em] = (s.work_end ?? "").split(":").map(Number);
  const hasExit = Number.isFinite(eh) && Number.isFinite(em) && !!s.work_end;
  for (let i = 0; i < days; i++) {
    const d = addDays(new Date(now.getFullYear(), now.getMonth(), now.getDate()), i);
    const key = format(d, "yyyy-MM-dd");
    const list = byDate.get(key) ?? [];
    const worked = list.some((e) => (e.type === "overtime" || e.type === "holiday") && Number(e.hours) > 0);
    const off = list.some((e) => OFF_TYPES.includes(e.type) || (e.type === "holiday" && Number(e.hours) === 0));
    if (o.exit && hasExit && !worked && !off && !isRestDay(d, s) && !holidayName(key)) {
      const at = new Date(d.getFullYear(), d.getMonth(), d.getDate(), eh, em);
      if (at > now) out.push({ id: `exit-${key}`, at, title: "Çıkış saatin geldi", body: "Mesaiye kalıyorsan çıkarken eklemeyi unutma: tek dokunuşla kaydet." });
    }
    if (o.evening && list.length === 0 && o.dismissed !== key) {
      const at = new Date(d.getFullYear(), d.getMonth(), d.getDate(), o.eveningHour, 0);
      if (at > now) out.push({ id: `evening-${key}`, at, title: "Bugün mesai yaptın mı?", body: "Yaptıysan eklemeyi unutma; yapmadıysan bir şey girmen gerekmez." });
    }
  }
  return out.sort((a, b) => +a.at - +b.at);
}
