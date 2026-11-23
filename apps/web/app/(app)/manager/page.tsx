"use client";

import { useCallback, useEffect, useState } from "react";
import { addMonths, endOfMonth, format, parseISO, startOfMonth } from "date-fns";
import { tr } from "date-fns/locale";
import { ChevronDown, ChevronLeft, ChevronRight, Download, UserMinus, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { fetchAll } from "@mesai/core/fetch-all";
import { download, toCSV } from "@/lib/backup";
import { errorText } from "@mesai/core/errors";
import { useToday } from "@/lib/now";
import { hhmm, hrs } from "@mesai/core/calc";
import { TYPE_META, type Entry } from "@mesai/core/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Page } from "@/components/mesai/page";

interface Emp { id: string; linkId: string; full_name: string; entries: Entry[] }
interface Pending { id: string; name: string }

const isWork = (x: Entry) => x.type === "overtime" || x.type === "holiday";

export default function ManagerPage() {
  const today = useToday();
  if (!today) return <div className="glass min-h-[28rem] w-full animate-pulse" aria-busy />;
  return <ManagerView today={today} />;
}

function ManagerView({ today }: { today: Date }) {
  const [emps, setEmps] = useState<Emp[] | null>(null);
  const [pending, setPending] = useState<Pending[]>([]);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [month, setMonth] = useState(startOfMonth(today));
  const [removing, setRemoving] = useState<Emp | null>(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data: links, error } = await supabase.from("manager_links").select("id, employee_id, status").in("status", ["accepted", "pending"]);
    if (error) { toast.error(errorText(error, "Ekip yüklenemedi")); setEmps([]); return; }
    const all = links ?? [];
    const ids = [...new Set(all.map((l) => l.employee_id))];
    if (!ids.length) { setPending([]); setEmps([]); return; }
    const accepted = all.filter((l) => l.status === "accepted");
    const acceptedIds = accepted.map((l) => l.employee_id);
    const from = format(startOfMonth(month), "yyyy-MM-dd");
    const to = format(endOfMonth(month), "yyyy-MM-dd");
    // Ekip büyüdükçe 1000 satır sınırı aşılır: tüm sayfalar okunur
    const [{ data: ps }, es] = await Promise.all([
      supabase.from("profiles").select("id, full_name").in("id", ids),
      acceptedIds.length
        ? fetchAll<Entry>((a, b) => supabase.from("entries").select("*").in("user_id", acceptedIds).gte("work_date", from).lte("work_date", to).order("work_date").order("id").range(a, b))
        : Promise.resolve([] as Entry[]),
    ]);
    // Bekleyen isteklerde çalışan henüz onaylamadığı için adı görünmeyebilir (gizlilik)
    const nameOf = (id: string) => ps?.find((p) => p.id === id)?.full_name;
    setPending(all.filter((l) => l.status === "pending").map((l) => ({ id: l.id, name: nameOf(l.employee_id) || "Onay bekleyen çalışan" })));
    setEmps(accepted.map((l) => ({
      id: l.employee_id, linkId: l.id, full_name: nameOf(l.employee_id) || "Çalışan",
      entries: (es ?? []).filter((e) => e.user_id === l.employee_id),
    })).sort((a, b) => a.full_name.localeCompare(b.full_name, "tr")));
  }, [month]);
  useEffect(() => { void load(); }, [load]);

  async function invite() {
    const c = code.trim().toUpperCase();
    if (!c) return;
    setBusy(true);
    try {
      const { data, error } = await createClient().rpc("request_link", { code: c });
      if (error) throw error;
      const m: Record<string, string> = { ok: "İstek gönderildi. Çalışan onaylayınca ekibinde görünür.", not_found: "Bu davet kodu bulunamadı.", not_manager: "Bu işlem için yönetici hesabı gerekli." };
      if (data === "ok") { toast.success(m.ok); setCode(""); void load(); }
      else toast.error(m[data as string] ?? "İstek gönderilemedi");
    } catch (e) { toast.error(errorText(e, "İstek gönderilemedi")); }
    finally { setBusy(false); }
  }
  async function removeLink(emp: Emp) {
    const { error } = await createClient().from("manager_links").delete().eq("id", emp.linkId);
    setRemoving(null);
    if (error) { toast.error(errorText(error, "Kaldırılamadı")); return; }
    toast.success(`${emp.full_name} ekipten çıkarıldı`);
    void load();
  }
  function exportCSV() {
    const rows = (emps ?? []).flatMap((e) => [...e.entries].sort((a, b) => a.work_date.localeCompare(b.work_date)).map((x) => ({
      calisan: e.full_name, tarih: x.work_date, tur: TYPE_META[x.type].label, baslangic: hhmm(x.start_time), bitis: hhmm(x.end_time), saat: Number(x.hours),
    })));
    if (!rows.length) { toast.info("Bu ay için kayıt yok"); return; }
    download(`ekip-${format(month, "yyyy-MM")}.csv`, toCSV(rows), "text/csv");
  }

  const list = emps ?? [];
  const all = list.flatMap((e) => e.entries);
  const totalH = all.filter(isWork).reduce((a, x) => a + Number(x.hours), 0);
  const absentDays = new Set(all.filter((x) => x.type === "absent").map((x) => `${x.user_id}:${x.work_date}`)).size;

  return (
    <Page eyebrow={<span className="capitalize">{format(month, "LLLL yyyy", { locale: tr })}</span>} title="Ekip" onRefresh={load} actions={
      <div className="flex gap-2">
        <Button size="icon" variant="secondary" aria-label="Önceki ay" onClick={() => setMonth(addMonths(month, -1))}><ChevronLeft /></Button>
        <Button size="icon" variant="secondary" aria-label="Sonraki ay" onClick={() => setMonth(addMonths(month, 1))}><ChevronRight /></Button>
      </div>
    }>

      <Card><CardContent className="space-y-2">
        <p className="text-sm font-semibold">Ekibe çalışan ekle</p>
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); void invite(); }}>
          <Input placeholder="Davet kodu (örn. A1B2C3D4)" value={code} maxLength={8} autoCapitalize="characters" autoComplete="off"
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^0-9A-F]/g, ""))} aria-label="Çalışan davet kodu" className="font-mono tracking-widest" />
          <Button type="submit" disabled={busy || code.trim().length < 8}><UserPlus className="size-4" />İstek gönder</Button>
        </form>
        <p className="text-xs text-muted-foreground">Kod, çalışanın Profil sayfasında yazar. Çalışan onaylayınca yalnızca mesai ve izin kayıtlarını görürsün; ücret ve gelir bilgileri gizli kalır.</p>
        {pending.length > 0 && (
          <ul className="space-y-1 pt-1 text-sm">
            {pending.map((p) => <li key={p.id} className="r-md flex items-center justify-between bg-muted px-3 py-2"><span>{p.name}</span><span className="text-xs text-muted-foreground">Onay bekliyor</span></li>)}
          </ul>
        )}
      </CardContent></Card>

      <div className="grid grid-cols-3 gap-3 text-center">
        {[
          { label: "Çalışan", v: emps === null ? "–" : String(list.length) },
          { label: "Toplam mesai", v: hrs(totalH) },
          { label: "Devamsızlık", v: `${absentDays} gün` },
        ].map((t) => (
          <Card key={t.label} size="sm"><CardContent><p className="text-xs text-muted-foreground">{t.label}</p><p className="text-xl font-bold tabular-nums">{t.v}</p></CardContent></Card>
        ))}
      </div>

      {emps === null && <div className="glass h-28 animate-pulse" aria-busy />}
      {emps?.length === 0 && (
        <p className="glass r-lg px-4 py-6 text-center text-sm text-muted-foreground">Henüz ekibinde onaylı çalışan yok. Davet koduyla istek gönder; çalışan onaylayınca burada görünür.</p>
      )}

      {list.map((e) => {
        const h = e.entries.filter(isWork).reduce((a, x) => a + Number(x.hours), 0);
        const isOpen = open === e.id;
        const sorted = [...e.entries].sort((a, b) => a.work_date.localeCompare(b.work_date));
        return (
          <Card key={e.id}>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <p className="text-base font-semibold">{e.full_name}</p>
                <p className="text-base font-bold tabular-nums">{hrs(h)}</p>
              </div>
              <div className="flex flex-wrap gap-1.5 text-xs">
                {(["paid_leave", "unpaid_leave", "sick", "absent"] as const).map((t) => {
                  const n = new Set(e.entries.filter((x) => x.type === t).map((x) => x.work_date)).size;
                  return <span key={t} className={`rounded-full px-2.5 py-1 ${n ? "bg-primary/15 font-semibold" : "bg-muted text-muted-foreground"}`}>{TYPE_META[t].label}: {n}</span>;
                })}
              </div>
              <div className="flex items-center justify-between">
                <button type="button" className="flex items-center gap-1 font-medium text-primary" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : e.id)}>
                  <ChevronDown className={`size-4 transition ${isOpen ? "rotate-180" : ""}`} />{isOpen ? "Gizle" : `Kayıtları göster (${e.entries.length})`}
                </button>
                <button type="button" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive" onClick={() => setRemoving(e)}>
                  <UserMinus className="size-3.5" />Ekipten çıkar
                </button>
              </div>
              {isOpen && (sorted.length === 0
                ? <p className="text-muted-foreground">Bu ay kayıt yok.</p>
                : <ul className="divide-y divide-border/60">
                  {sorted.map((x) => (
                    <li key={x.id} className="flex items-center justify-between gap-3 py-1.5">
                      <span className="tabular-nums">{format(parseISO(x.work_date), "d MMM EEE", { locale: tr })}</span>
                      <span className="text-right">
                        {TYPE_META[x.type].label}
                        {x.start_time && <span className="text-muted-foreground tabular-nums"> · {hhmm(x.start_time)}–{hhmm(x.end_time)}</span>}
                        {Number(x.hours) > 0 && <b className="ml-1 tabular-nums">{hrs(Number(x.hours))}</b>}
                      </span>
                    </li>
                  ))}
                </ul>)}
            </CardContent>
          </Card>
        );
      })}
      {list.length > 0 && <Button variant="secondary" className="h-12 w-full" onClick={exportCSV}><Download className="size-4" />Ekibin bu ayını CSV indir</Button>}

      <Dialog open={!!removing} onOpenChange={(o) => { if (!o) setRemoving(null); }}>
        <DialogContent showCloseButton={false} className="gap-6 p-6 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ekipten çıkarılsın mı?</DialogTitle>
            <DialogDescription>{removing?.full_name} artık ekibinde görünmez ve kayıtlarını göremezsin. Tekrar eklemek için davet kodu ve çalışanın onayı gerekir.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <Button variant="secondary" className="h-12" autoFocus onClick={() => setRemoving(null)}>Vazgeç</Button>
            <Button className="h-12 bg-destructive text-white hover:bg-destructive/90" onClick={() => removing && removeLink(removing)}>Evet, çıkar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </Page>
  );
}
