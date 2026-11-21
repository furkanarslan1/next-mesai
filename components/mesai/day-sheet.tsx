"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import { tr } from "date-fns/locale";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { mutate } from "@/lib/store";
import { hhmm, hrs } from "@/lib/calc";
import { TYPE_META, type Entry, type EntryType } from "@/lib/types";
import { StatusIcon } from "@/components/mesai/status-icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";

const STATUS: EntryType[] = ["paid_leave", "unpaid_leave", "sick", "absent", "holiday"];
const isStatusRow = (e: Entry) => STATUS.includes(e.type) && !(e.type === "holiday" && Number(e.hours) > 0);
const isWork = (e: Entry) => e.type === "overtime" || e.type === "holiday";

/** Günün notu: günün ana kaydına (mesai varsa o, yoksa ilk kayıt) yazılır. */
function NoteEditor({ entry }: { entry: Entry | undefined }) {
  const [text, setText] = useState(entry?.note ?? "");
  const [busy, setBusy] = useState(false);
  const dirty = (text.trim() || null) !== (entry?.note ?? null);
  async function save() {
    if (!entry) return;
    setBusy(true);
    try { await mutate.updateEntry(entry, { note: text.trim() || null }); toast.success("Not kaydedildi"); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Kaydedilemedi"); }
    finally { setBusy(false); }
  }
  return (
    <section className="space-y-2">
      <p className="text-sm font-semibold">Not</p>
      <div className="flex gap-2">
        <Input placeholder={entry ? "Örn. acil sevkiyat, fazla yoğundu" : "Not için önce bir kayıt ekle"} value={text} maxLength={200} disabled={!entry}
          onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (dirty) void save(); } }} aria-label="Gün notu" />
        <Button variant="secondary" disabled={!entry || !dirty || busy} onClick={save}>Kaydet</Button>
      </div>
    </section>
  );
}

type Pending = { title: string; desc: string; yes: string; run: () => Promise<unknown> };

/** Takvimde seçilen günün kayıtlarını gösterir; mesai ekleme/değiştirme/silme ve gün durumunu burada yönetirsin. Her değişiklik onay ister. */
export function DaySheet({ date, entries, userId, onClose }: {
  date: string | null; entries: Entry[]; userId: string; onClose: () => void;
}) {
  const [pending, setPending] = useState<Pending | null>(null);
  const [busy, setBusy] = useState(false);
  const [newHours, setNewHours] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editHours, setEditHours] = useState("");

  const day = date ? entries.filter((e) => e.work_date === date) : [];
  const status = day.find(isStatusRow);
  // Günde tek mesai kaydı: varsa yeni eklenemez, saati kalemle değiştirilir ya da silinir
  const hasWork = day.some((e) => isWork(e) && Number(e.hours) > 0);
  const primary = day.find((e) => isWork(e) && Number(e.hours) > 0) ?? day[0];
  const label = date ? format(parseISO(date), "d MMMM EEEE", { locale: tr }) : "";
  const valid = (v: string) => { const h = parseFloat(v.replace(",", ".")); return h > 0 && h <= 24 ? h : 0; };

  async function confirmYes() {
    if (!pending) return;
    setBusy(true);
    try { await pending.run(); setPending(null); }
    catch (e) { toast.error(e instanceof Error ? e.message : "İşlem başarısız"); }
    finally { setBusy(false); }
  }
  const row = (type: EntryType, hours: number) => ({ user_id: userId, work_date: date!, type, hours, note: null, start_time: null, end_time: null });

  function askAddHours() {
    const h = valid(newHours);
    if (!h) return;
    setPending({
      title: "Mesai eklensin mi?", desc: `${label} gününe ${hrs(h)} mesai eklenecek.`, yes: "Evet, ekle",
      run: async () => { await mutate.addEntry(row("overtime", h)); setNewHours(""); toast.success("Mesai eklendi"); },
    });
  }
  function askEdit(e: Entry) {
    const h = valid(editHours);
    if (!h || h === Number(e.hours)) { setEditId(null); return; }
    setPending({
      title: "Saat değişsin mi?", desc: `${hrs(Number(e.hours))} yerine ${hrs(h)} olarak kaydedilecek.`, yes: "Evet, değiştir",
      run: async () => { await mutate.updateEntry(e, { hours: h }); setEditId(null); toast.success("Güncellendi"); },
    });
  }
  function askRemove(e: Entry) {
    const name = isWork(e) && Number(e.hours) > 0 ? `${hrs(Number(e.hours))} ${TYPE_META[e.type].label.toLowerCase()}` : TYPE_META[e.type].label;
    setPending({
      title: "Kayıt silinsin mi?", desc: `${label} gününden "${name}" kaydı silinecek.`, yes: "Evet, sil",
      run: async () => { await mutate.removeEntry(e); toast.success("Silindi"); },
    });
  }
  function askStatus(t: EntryType) {
    const existing = day.find((e) => e.type === t && isStatusRow(e));
    if (existing) return askRemove(existing);
    if (status) return;
    setPending({
      title: `${TYPE_META[t].label} olarak işaretlensin mi?`, desc: `${label} günü "${TYPE_META[t].label}" olarak kaydedilecek. Bir gün için tek durum seçilebilir.`, yes: "Evet, işaretle",
      run: async () => { await mutate.addEntry(row(t, 0)); toast.success(`${TYPE_META[t].label} eklendi`); },
    });
  }

  return (
    <Sheet open={!!date} onOpenChange={(o) => { if (!o) { setPending(null); setEditId(null); setNewHours(""); onClose(); } }}>
      <SheetContent side="bottom" className="mx-auto max-h-[88dvh] max-w-lg overflow-y-auto rounded-t-[2rem] p-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
        <SheetHeader className="p-0">
          <SheetTitle className="text-lg">{label}</SheetTitle>
          <SheetDescription>Bu günün kayıtları. Her değişiklikten önce onay istenir.</SheetDescription>
        </SheetHeader>

        {pending ? (
          <div className="space-y-6 rounded-[1.75rem] bg-muted p-6">
            <div className="space-y-2">
              <p className="text-xl font-semibold leading-snug">{pending.title}</p>
              <p className="text-base leading-relaxed text-muted-foreground">{pending.desc}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="secondary" autoFocus disabled={busy} className="h-14 bg-background text-base font-semibold" onClick={() => setPending(null)}>Hayır</Button>
              <Button disabled={busy} className="h-14 text-base font-semibold" onClick={confirmYes}>{pending.yes}</Button>
            </div>
          </div>
        ) : (
          <>
            <section className="space-y-2" aria-label="Kayıtlar">
              {day.length === 0 && <p className="r-lg bg-muted px-4 py-3 text-sm text-muted-foreground">Bu güne ait kayıt yok.</p>}
              {day.map((e) => (
                <div key={e.id} className="r-lg flex items-center gap-3 bg-muted px-4 py-2.5 text-sm">
                  {isStatusRow(e) ? <StatusIcon type={e.type} className="size-7 shrink-0" /> : <span className="size-2.5 shrink-0 rounded-full bg-primary" aria-hidden />}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{TYPE_META[e.type].label}</p>
                    {e.note && <p className="truncate text-xs italic text-muted-foreground">{e.note}</p>}
                    {isWork(e) && Number(e.hours) > 0 && (
                      <p className="text-xs text-muted-foreground tabular-nums">
                        {editId === e.id ? "" : hrs(Number(e.hours))}{e.start_time ? ` · ${hhmm(e.start_time)}–${hhmm(e.end_time)}` : ""}
                      </p>
                    )}
                  </div>
                  {editId === e.id ? (
                    <>
                      <Input type="number" inputMode="decimal" step="0.25" min="0" max="24" value={editHours} onChange={(ev) => setEditHours(ev.target.value)} className="w-20" aria-label="Saat" />
                      <Button size="sm" onClick={() => askEdit(e)} disabled={!valid(editHours)}>Kaydet</Button>
                    </>
                  ) : (
                    <>
                      {isWork(e) && Number(e.hours) > 0 && (
                        <Button size="icon" variant="ghost" aria-label="Saati değiştir" onClick={() => { setEditId(e.id); setEditHours(String(Number(e.hours))); }}><Pencil className="size-4" /></Button>
                      )}
                      <Button size="icon" variant="ghost" aria-label="Kaydı sil" className="text-destructive" onClick={() => askRemove(e)}><Trash2 className="size-4" /></Button>
                    </>
                  )}
                </div>
              ))}
            </section>

            <section className="space-y-2">
              <p className="text-sm font-semibold">Mesai ekle</p>
              {hasWork ? (
                <p className="text-xs text-muted-foreground">Günde tek mesai kaydı olur. Saati kalem ikonuyla değiştirebilir ya da kaydı silip yenisini ekleyebilirsin.</p>
              ) : (
              <div className="flex gap-2">
                <Input type="number" inputMode="decimal" step="0.25" min="0" max="24" placeholder="Örn. 2.5" value={newHours} onChange={(e) => setNewHours(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); askAddHours(); } }} aria-label="Mesai saati" />
                <Button onClick={askAddHours} disabled={!valid(newHours)}><Plus className="size-4" />Ekle</Button>
              </div>
              )}
            </section>

            <NoteEditor key={primary?.id ?? "none"} entry={primary} />

            <section className="space-y-2">
              <p className="text-sm font-semibold">Gün durumu</p>
              <div className="grid grid-cols-2 gap-2">
                {STATUS.map((t) => {
                  const on = day.some((e) => e.type === t && isStatusRow(e));
                  const locked = !on && !!status;
                  return (
                    <button key={t} type="button" disabled={locked} aria-pressed={on} onClick={() => askStatus(t)}
                      className={`r-lg flex items-center gap-2.5 px-3 py-2.5 text-left text-sm font-medium transition active:scale-[0.97] disabled:opacity-45 ${on ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                      <StatusIcon type={t} className="size-6 shrink-0" />{TYPE_META[t].label}
                    </button>
                  );
                })}
              </div>
              {status && <p className="text-xs text-muted-foreground">Bir gün için tek durum seçilebilir; değiştirmek için önce seçili olanı geri al.</p>}
            </section>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
