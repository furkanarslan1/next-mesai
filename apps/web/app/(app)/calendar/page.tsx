"use client";

import { useRef, useState } from "react";
import { addMonths, eachDayOfInterval, endOfMonth, format, getDay, parseISO, startOfMonth } from "date-fns";
import { tr } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMesai } from "@/lib/use-data";
import { mutate, useProfile } from "@/lib/store";
import { toast } from "sonner";
import { errorText } from "@mesai/core/errors";
import { bulkPlan, SKIP_LABEL, type BulkType } from "@mesai/core/day";
import { haptic } from "@/lib/haptics";
import { DaySheet } from "@/components/mesai/day-sheet";
import { useToday } from "@/lib/now";
import { holidayName } from "@mesai/core/holidays";
import { goalProgress, hrs, money, monthSummary, num } from "@mesai/core/calc";
import { TYPE_META } from "@mesai/core/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Page } from "@/components/mesai/page";
import { AnimatedNumber } from "@/components/mesai/animated-number";

/** İzin/rapor gibi günlerin hücre rengi ve kısa etiketi (mesai olan günlerde saat yazar) */
const STATUS_CELL: Record<string, { bg: string; text: string; short: string }> = {
  paid_leave: { bg: "color-mix(in oklch, oklch(0.7 0.14 235) 38%, var(--fill))", text: "text-sky-200", short: "İzin" },
  unpaid_leave: { bg: "color-mix(in oklch, oklch(0.68 0.16 50) 38%, var(--fill))", text: "text-orange-200", short: "Ücretsiz" },
  sick: { bg: "color-mix(in oklch, oklch(0.7 0.14 340) 36%, var(--fill))", text: "text-pink-200", short: "Rapor" },
  absent: { bg: "color-mix(in oklch, oklch(0.62 0.2 20) 42%, var(--fill))", text: "text-rose-200", short: "Gelmedi" },
  holiday: { bg: "color-mix(in oklch, oklch(0.8 0.15 85) 36%, var(--fill))", text: "text-amber-200", short: "Tatil" },
};

export default function CalendarPage() {
  const today = useToday();
  if (!today) return <div className="glass min-h-[28rem] w-full animate-pulse" aria-busy />;
  return <CalendarView today={today} />;
}

function CalendarView({ today }: { today: Date }) {
  const [month, setMonth] = useState(today);
  // Ay değişiminin yönü: ızgara o yönden kayarak gelir (1 ileri, -1 geri)
  const [dir, setDir] = useState(0);
  const go = (n: number) => { setDir(n); setMonth(addMonths(month, n)); setPicked([]); setConfirming(false); };
  // Toplu işaretleme (ör. 5 günlük yıllık izin): "Seç" ile günler seçilir, tek seferde kaydedilir
  const [picking, setPicking] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [bulkType, setBulkType] = useState<BulkType>("paid_leave");
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const togglePick = (k: string) => { setConfirming(false); setPicked((p) => (p.includes(k) ? p.filter((x) => x !== k) : [...p, k])); };
  const stopPicking = () => { setPicking(false); setPicked([]); setConfirming(false); };
  // Dokunmatikte sağa/sola kaydırınca ay değişir (dikey kaydırma sayfayı kaydırmaya devam eder)
  const touch = useRef<{ x: number; y: number; t: number } | null>(null);
  const swipe = {
    onTouchStart: (e: React.TouchEvent) => { const p = e.touches[0]; touch.current = { x: p.clientX, y: p.clientY, t: e.timeStamp }; },
    onTouchEnd: (e: React.TouchEvent) => {
      const s = touch.current; touch.current = null;
      if (!s) return;
      const p = e.changedTouches[0];
      const dx = p.clientX - s.x, dy = p.clientY - s.y;
      const fast = Math.abs(dx) / Math.max(1, e.timeStamp - s.t) > 0.5;
      if (Math.abs(dx) > Math.abs(dy) * 1.5 && (Math.abs(dx) > 50 || (fast && Math.abs(dx) > 25))) go(dx < 0 ? 1 : -1);
    },
  };
  const [selected, setSelected] = useState<string | null>(null);
  const userId = useProfile()?.id ?? "";
  const { entries, settings } = useMesai(month);
  const days = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) });
  const offset = (getDay(startOfMonth(month)) + 6) % 7; // Pzt başlangıç
  const sum = monthSummary(entries, settings);
  const total = goalProgress(entries, settings); // income = maaş − kesinti + mesai kazancı
  // Yoğunluk, günün toplam mesaisine göre (bir güne birden çok kayıt düşmüş olabilir)
  const dayTotals = new Map<string, number>();
  entries.filter((e) => e.type === "overtime" || e.type === "holiday").forEach((e) => dayTotals.set(e.work_date, (dayTotals.get(e.work_date) ?? 0) + Number(e.hours)));
  const maxH = Math.max(1, ...dayTotals.values());

  return (
    <Page eyebrow="Takvim" title={<span className="capitalize">{format(month, "MMMM yyyy", { locale: tr })}</span>} actions={
        <div className="flex gap-2">
          <Button size="sm" variant={picking ? "default" : "secondary"} onClick={() => (picking ? stopPicking() : setPicking(true))}>{picking ? "Bitti" : "Seç"}</Button>
          <Button size="icon" variant="secondary" aria-label="Önceki ay" onClick={() => go(-1)}><ChevronLeft /></Button>
          <Button size="icon" variant="secondary" aria-label="Sonraki ay" onClick={() => go(1)}><ChevronRight /></Button>
        </div>
      }>
      <Card>
        <CardContent>
          <div key={format(month, "yyyy-MM")} className={`grid grid-cols-7 gap-1.5 text-center text-xs text-muted-foreground ${dir ? "month-slide" : ""}`}
            style={{ "--dir": dir, touchAction: "pan-y" } as React.CSSProperties} {...swipe}>
            {["Pt", "Sa", "Ça", "Pe", "Cu", "Ct", "Pz"].map((d) => <div key={d}>{d}</div>)}
            {Array.from({ length: offset }).map((_, i) => <div key={i} />)}
            {days.map((d) => {
              const key = format(d, "yyyy-MM-dd");
              const list = entries.filter((e) => e.work_date === key);
              const worked = list.filter((e) => e.type === "overtime" || e.type === "holiday").reduce((a, e) => a + Number(e.hours), 0);
              const status = list.find((e) => e.type !== "overtime" && e.type !== "holiday") ?? list.find((e) => e.type === "holiday" && Number(e.hours) === 0);
              const alpha = worked > 0 ? Math.min(1, 0.25 + 0.75 * (worked / maxH)) : 0;
              const strong = alpha > 0.6;
              const isToday = key === format(today, "yyyy-MM-dd");
              const st = status ? STATUS_CELL[status.type] : null;
              return (
                <button key={key} type="button" onClick={() => (picking ? togglePick(key) : setSelected(key))} aria-pressed={picking ? picked.includes(key) : undefined}
                  aria-label={picking ? `${format(d, "d MMMM", { locale: tr })} seç` : `${format(d, "d MMMM", { locale: tr })} kayıtlarını aç`} title={[holidayName(key), ...list.map((e) => TYPE_META[e.type].label)].filter(Boolean).join(", ")}
                  className={`relative flex aspect-square flex-col items-center justify-center r-md text-sm leading-none transition active:scale-95 ${picking && picked.includes(key) ? "ring-[3px] ring-primary ring-offset-2 ring-offset-card" : holidayName(key) ? "ring-2 ring-amber-400" : isToday ? "ring-2 ring-[var(--teal)] ring-offset-2 ring-offset-card" : ""}`}
                  style={{ background: worked > 0 ? `color-mix(in oklch, var(--teal) ${Math.round(alpha * 100)}%, var(--fill))` : st ? st.bg : "var(--muted)", color: worked > 0 || st ? (strong ? "var(--ink)" : "oklch(0.99 0 0)") : "var(--foreground)" }}>
                  <span className={isToday ? "font-bold" : ""}>{format(d, "d")}</span>
                  {worked > 0 ? (
                    // Hücre dar: sayı ve "saat" alt alta (kısaltma yok, her değer sığar)
                    <span className="mt-0.5 flex flex-col items-center text-[10px] font-semibold leading-[1.1] tabular-nums">
                      {num(worked)}<span className="text-[9px] font-medium opacity-80">saat</span>
                    </span>
                  ) : st ? (
                    <span className={`mt-1 text-[10px] font-medium ${st.text}`}>{st.short}</span>
                  ) : null}
                  {worked > 0 && status && <span className={`absolute right-1 top-1 size-1.5 rounded-full ${TYPE_META[status.type].color}`} />}
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-center text-xs text-muted-foreground">{picking ? "İzin/rapor işaretlemek istediğin günlere dokun." : "Bir güne dokun: kayıtlarını gör, ekle, değiştir veya sil. Ay değiştirmek için sağa sola kaydır. Birden çok güne izin için “Seç”."}</p>
        </CardContent>
      </Card>
      <div className="flex flex-wrap gap-3 text-xs">
        <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-[var(--teal)]" />Mesai (saat yazar)</span>
        {Object.values(TYPE_META).slice(1).map((m) => (
          <span key={m.label} className="flex items-center gap-1"><span className={`size-2 rounded-full ${m.color}`} />{m.label}</span>
        ))}
      </div>
      {days.some((d) => holidayName(format(d, "yyyy-MM-dd"))) && (
        <p className="text-xs text-muted-foreground">
          <span className="mr-1 inline-block size-2 rounded-full ring-2 ring-amber-400" />
          {days.filter((d) => holidayName(format(d, "yyyy-MM-dd"))).map((d) => `${format(d, "d")} ${holidayName(format(d, "yyyy-MM-dd"))}`).join(" · ")}
        </p>
      )}
      {picking && (
        <div className="sticky bottom-[calc(6.25rem+env(safe-area-inset-bottom))] z-20 md:bottom-4">
          <div className="glass space-y-3 p-4 shadow-lg">
            {confirming ? (() => {
              const plan = bulkPlan(picked, bulkType, entries, settings);
              const skipped = plan.skipped.map((x) => `${format(parseISO(x.date), "d MMM", { locale: tr })} (${SKIP_LABEL[x.reason]})`).join(", ");
              return (
                <>
                  <p className="text-sm">
                    <b>{plan.add.length} gün</b> “{TYPE_META[bulkType].label}” olarak işaretlenecek.
                    {plan.skipped.length > 0 && <span className="text-muted-foreground"> Atlanacak: {skipped}.</span>}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="secondary" disabled={busy} onClick={() => setConfirming(false)}>Hayır</Button>
                    <Button disabled={busy || !plan.add.length} onClick={async () => {
                      setBusy(true);
                      try {
                        await mutate.addEntries(plan.add.map((work_date) => ({ user_id: userId, work_date, type: bulkType, hours: 0, note: null, start_time: null, end_time: null })));
                        haptic("success");
                        toast.success(`${plan.add.length} gün işaretlendi`);
                        stopPicking();
                      } catch (e) { toast.error(errorText(e, "Kaydedilemedi")); }
                      finally { setBusy(false); }
                    }}>Evet, işaretle</Button>
                  </div>
                </>
              );
            })() : (
              <>
                <div className="flex flex-wrap gap-1.5">
                  {(["paid_leave", "unpaid_leave", "sick", "absent", "holiday"] as BulkType[]).map((t) => (
                    <button key={t} type="button" aria-pressed={bulkType === t} onClick={() => setBulkType(t)}
                      className={`r-pill px-3 py-1.5 text-xs font-medium ${bulkType === t ? "bg-primary text-primary-foreground" : "bg-muted"}`}>{TYPE_META[t].label}</button>
                  ))}
                </div>
                <Button className="h-11 w-full font-semibold" disabled={!picked.length} onClick={() => setConfirming(true)}>
                  {picked.length ? `${picked.length} günü işaretle` : "Gün seç"}
                </Button>
              </>
            )}
          </div>
        </div>
      )}
      <DaySheet date={selected} entries={entries} userId={userId} onClose={() => setSelected(null)} />
      <div className="grid grid-cols-2 gap-3">
        <Card className="r-lg"><CardContent className="text-center"><p className="text-xs text-muted-foreground">Toplam mesai</p><p className="text-xl font-bold tabular-nums">{hrs(sum.hours)}</p></CardContent></Card>
        <Card className="r-lg"><CardContent className="text-center"><p className="text-xs text-muted-foreground">Mesai kazancı</p><p className="text-xl font-bold tabular-nums">{money(sum.earned, settings.currency)}</p></CardContent></Card>
        <Card className="r-lg col-span-2"><CardContent className="text-center">
          <p className="text-xs text-muted-foreground">Toplam maaş</p>
          <AnimatedNumber value={total.income} format={(n) => money(n, settings.currency)} className="block text-2xl font-bold" />
          <p className="mt-1 text-xs text-muted-foreground tabular-nums">
            Maaş {money(settings.monthly_salary, settings.currency)}{total.deduction > 0 && <> − kesinti {money(total.deduction, settings.currency)}</>} + mesai {money(sum.earned, settings.currency)}
          </p>
        </CardContent></Card>
      </div>
    </Page>
  );
}
