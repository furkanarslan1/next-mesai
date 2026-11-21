"use client";

import { BellRing, X } from "lucide-react";
import { setPrefs, usePrefs } from "@/lib/prefs";
import { Button } from "@/components/ui/button";

/**
 * Akşam hatırlatıcısı (uygulama açıkken): bugüne bakılıyorsa, saat ayarlanan saati geçtiyse ve
 * o güne hiç kayıt girilmediyse görünür. Her gün kayıt girmek zorunlu değil: "Yapmadım" ya da kapatma, o gün için bir daha göstermez.
 * Gerçek (arka plan) bildirim sunucu tarafı altyapı gerektirir; bu kart uygulama açıkken çalışır.
 */
export function ReminderCard({ todayStr, now, hasRecords, isToday }: { todayStr: string; now: Date; hasRecords: boolean; isToday: boolean }) {
  const p = usePrefs();
  if (!p.reminderOn || !isToday || hasRecords || p.reminderDismissed === todayStr || now.getHours() < p.reminderHour) return null;
  const dismiss = () => setPrefs({ reminderDismissed: todayStr });
  return (
    <div className="glass r-lg flex items-center gap-3 px-4 py-3 text-sm" role="status">
      <BellRing className="size-5 shrink-0 text-[var(--teal)]" aria-hidden />
      <p className="flex-1"><b>Bugün mesai yaptın mı?</b> Yaptıysan eklemeyi unutma; yapmadıysan kayıt girmen gerekmez.</p>
      <Button size="sm" variant="secondary" onClick={dismiss}>Yapmadım</Button>
      <button type="button" aria-label="Kapat" onClick={dismiss} className="grid size-8 place-items-center rounded-full text-muted-foreground"><X className="size-4" /></button>
    </div>
  );
}
